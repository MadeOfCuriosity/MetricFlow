"""Guided Zoho Books setup: one Zoho sign-in feeding several integrations.

Each synced source (a module such as invoices, or one GL account) stays its
own Integration row with its own field mappings, so sync and scheduling are
unchanged. Sources added after the first reuse the OAuth tokens of an
already-connected Zoho Books integration in the same org.
"""
import logging
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.encryption import decrypt_value
from app.models.data_field import DataField
from app.models.integration import Integration
from app.models.integration_field_mapping import IntegrationFieldMapping
from app.schemas.integrations import CreateZohoBooksSourcesRequest
from app.services.data_field_service import DataFieldService

logger = logging.getLogger(__name__)

PROVIDER = "zoho_books"
GL_MODULES = {"gl_revenue", "gl_expense"}


def is_setup_incomplete(integration: Integration) -> bool:
    """A Zoho Books row that only holds a sign-in and has no module chosen yet."""
    return integration.provider == PROVIDER and not (integration.config or {}).get("module")


def _source_key(config: dict) -> tuple:
    return (
        str(config.get("zoho_org_id") or ""),
        str(config.get("branch_id") or ""),
        config.get("module") or "",
        str(config.get("gl_account_id") or ""),
    )


class ZohoBooksSetupService:

    @staticmethod
    def get_auth_integration(db: Session, integration_id: UUID, org_id: UUID) -> Integration:
        """The integration whose Zoho sign-in is being used for setup."""
        integration = db.query(Integration).filter(
            Integration.id == integration_id,
            Integration.org_id == org_id,
        ).first()
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        if integration.provider != PROVIDER:
            raise HTTPException(status_code=400, detail="Not a Zoho Books integration")
        if not integration.refresh_token_encrypted:
            raise HTTPException(status_code=400, detail="Sign in to Zoho before setting up sources.")
        return integration

    @staticmethod
    def create_sources(
        db: Session,
        org_id: UUID,
        user_id: UUID,
        auth: Integration,
        data: CreateZohoBooksSourcesRequest,
    ) -> list[Integration]:
        """Create one integration per requested source, atomically."""
        branch_id = (data.branch_id or "").strip() or None
        consume_auth = is_setup_incomplete(auth)

        # --- Validate everything before writing anything ---
        existing = db.query(Integration).filter(
            Integration.org_id == org_id,
            Integration.provider == PROVIDER,
        ).all()
        existing_keys = {
            _source_key(i.config or {}): i
            for i in existing
            if not is_setup_incomplete(i)
        }

        configs: list[dict] = []
        seen_keys: set[tuple] = set()
        for src in data.sources:
            gl_account_id = (src.gl_account_id or "").strip() or None
            if src.module in GL_MODULES and not gl_account_id:
                raise HTTPException(status_code=400, detail=f"Pick a GL account for {src.display_name}.")
            config = {"module": src.module, "zoho_org_id": data.org_id.strip(), "history_days": data.history_days}
            if branch_id:
                config["branch_id"] = branch_id
            if src.module in GL_MODULES:
                config["gl_account_id"] = gl_account_id
            key = _source_key(config)
            if key in seen_keys:
                raise HTTPException(status_code=400, detail=f"{src.display_name} was added twice.")
            if key in existing_keys:
                raise HTTPException(
                    status_code=409,
                    detail=f"{src.display_name} is already syncing as \"{existing_keys[key].display_name}\".",
                )
            seen_keys.add(key)
            configs.append(config)

        # Resolve mapping targets: existing field ids must belong to the org;
        # new field names reuse an existing field of the same name if there is one.
        org_fields = db.query(DataField).filter(DataField.org_id == org_id).all()
        fields_by_id = {f.id: f for f in org_fields}
        fields_by_name = {f.name.strip().lower(): f for f in org_fields}
        pending_new: dict[str, DataField] = {}

        def resolve(mapping) -> DataField:
            if mapping.data_field_id:
                field = fields_by_id.get(mapping.data_field_id)
                if not field:
                    raise HTTPException(status_code=400, detail="A selected data field no longer exists.")
                return field
            name = (mapping.new_field_name or "").strip()
            if not name:
                raise HTTPException(status_code=400, detail="Every value needs a field to save to.")
            key = name.lower()
            if key in fields_by_name:
                return fields_by_name[key]
            if key not in pending_new:
                field = DataField(
                    org_id=org_id,
                    name=name,
                    variable_name=DataFieldService.ensure_unique_variable_name(db, org_id, name),
                    entry_interval="daily",
                    created_by=user_id,
                )
                # Flush per field so the next unique-name check sees this one
                db.add(field)
                db.flush()
                pending_new[key] = field
            return pending_new[key]

        # Fields already fed by another integration would be overwritten on
        # every sync (entries are one value per field per day).
        fed_query = (
            db.query(IntegrationFieldMapping.data_field_id, Integration.display_name)
            .join(Integration, Integration.id == IntegrationFieldMapping.integration_id)
            .filter(Integration.org_id == org_id)
        )
        if consume_auth:
            # The bare sign-in row's mappings are replaced below
            fed_query = fed_query.filter(Integration.id != auth.id)
        fed = dict(fed_query.all())

        try:
            resolved: list[list[tuple]] = []
            targeted: dict[UUID, str] = {}
            for src in data.sources:
                rows = []
                for m in src.mappings:
                    field = resolve(m)
                    if field.id in fed:
                        raise HTTPException(
                            status_code=409,
                            detail=f"\"{field.name}\" is already filled by \"{fed[field.id]}\". Pick another field.",
                        )
                    if field.id in targeted:
                        raise HTTPException(
                            status_code=400,
                            detail=f"\"{field.name}\" is used by both {targeted[field.id]} and {src.display_name}. "
                                   "Each field can only take one value.",
                        )
                    targeted[field.id] = src.display_name
                    rows.append((m, field))
                resolved.append(rows)

            # --- Write ---
            created: list[Integration] = []
            for i, (src, config) in enumerate(zip(data.sources, configs)):
                if i == 0 and consume_auth:
                    integration = auth
                    integration.config = config
                    integration.display_name = src.display_name
                    integration.sync_schedule = data.sync_schedule
                    integration.updated_at = datetime.utcnow()
                else:
                    integration = Integration(
                        org_id=org_id,
                        created_by=user_id,
                        provider=PROVIDER,
                        display_name=src.display_name,
                        status="connected",
                        config=config,
                        sync_schedule=data.sync_schedule,
                        access_token_encrypted=auth.access_token_encrypted,
                        refresh_token_encrypted=auth.refresh_token_encrypted,
                        token_expires_at=auth.token_expires_at,
                    )
                    db.add(integration)
                db.flush()

                db.query(IntegrationFieldMapping).filter(
                    IntegrationFieldMapping.integration_id == integration.id,
                ).delete()
                for m, field in resolved[i]:
                    db.add(IntegrationFieldMapping(
                        integration_id=integration.id,
                        data_field_id=field.id,
                        external_field_name=m.external_field_name,
                        external_field_label=m.external_field_label,
                        aggregation=m.aggregation,
                    ))
                created.append(integration)

            db.commit()
        except Exception:
            db.rollback()
            raise

        for integration in created:
            db.refresh(integration)
        return created

    @staticmethod
    def share_new_tokens(db: Session, integration: Integration, old_refresh_token: str | None) -> int:
        """
        After a Zoho re-sign-in, give the new tokens to every other Zoho Books
        integration in the org that was using the same (old) sign-in.
        """
        if not old_refresh_token:
            return 0
        siblings = db.query(Integration).filter(
            Integration.org_id == integration.org_id,
            Integration.provider == PROVIDER,
            Integration.id != integration.id,
            Integration.refresh_token_encrypted.isnot(None),
        ).all()
        updated = 0
        for s in siblings:
            try:
                if decrypt_value(s.refresh_token_encrypted) != old_refresh_token:
                    continue
            except Exception:
                continue
            s.access_token_encrypted = integration.access_token_encrypted
            s.refresh_token_encrypted = integration.refresh_token_encrypted
            s.token_expires_at = integration.token_expires_at
            if s.status == "error":
                s.status = "connected"
                s.error_message = None
            updated += 1
        if updated:
            db.commit()
        return updated
