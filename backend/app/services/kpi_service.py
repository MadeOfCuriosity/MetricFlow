from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.formula_parser import extract_input_fields, validate_formula
from app.models import KPIDefinition, DataEntry, KPIDataField
from app.models.kpi_definition import TimePeriod
from app.schemas.kpi import KPICreateRequest, KPIUpdateRequest
from app.services.data_field_service import DataFieldService


# Default KPI presets. Variable names are shared on purpose (e.g. total_revenue,
# deals_closed) so presets that need the same input reuse one data field.
# Names must stay stable: an org's already-imported presets are matched by name.
def _preset(name, description, formula, category, time_period, unit, direction):
    return {
        "name": name,
        "description": description,
        "formula": formula,
        "category": category,
        "time_period": time_period,
        "unit": unit,
        "direction": direction,
    }


DEFAULT_PRESETS = [
    # Sales
    _preset("Conversion Rate", "Percentage of leads that convert to closed deals",
            "(deals_closed / leads_received) * 100", "Sales", "daily", "%", "up"),
    _preset("Average Deal Size", "Average revenue per closed deal",
            "total_revenue / deals_closed", "Sales", "weekly", "$", "up"),
    _preset("Lead Response Time", "Average time to respond to leads (in hours)",
            "total_response_time / leads_contacted", "Sales", "daily", "hrs", "down"),
    _preset("Win Rate", "Share of qualified opportunities that end as closed deals",
            "(deals_closed / opportunities) * 100", "Sales", "monthly", "%", "up"),
    _preset("Average Order Value", "Average revenue earned per order",
            "total_revenue / total_orders", "Sales", "daily", "$", "up"),
    _preset("Sales Target Achievement", "Revenue achieved as a percentage of the sales target",
            "(total_revenue / sales_target) * 100", "Sales", "monthly", "%", "up"),
    # Marketing
    _preset("Customer Acquisition Cost (CAC)", "Average cost to acquire a new customer",
            "marketing_spend / new_customers", "Marketing", "monthly", "$", "down"),
    _preset("Cost per Lead", "Average marketing spend needed to generate one lead",
            "marketing_spend / leads_received", "Marketing", "monthly", "$", "down"),
    _preset("Return on Ad Spend (ROAS)", "Revenue generated for every unit of ad spend",
            "ad_revenue / ad_spend", "Marketing", "monthly", "x", "up"),
    _preset("Click-Through Rate", "Percentage of ad or email impressions that were clicked",
            "(clicks / impressions) * 100", "Marketing", "weekly", "%", "up"),
    _preset("Website Conversion Rate", "Percentage of website visitors who become leads",
            "(leads_received / website_visitors) * 100", "Marketing", "weekly", "%", "up"),
    # Operations
    _preset("Revenue per Employee", "Total revenue divided by number of employees",
            "total_revenue / employee_count", "Operations", "monthly", "$", "up"),
    _preset("On-Time Delivery Rate", "Percentage of orders delivered on or before the promised date",
            "(on_time_deliveries / total_deliveries) * 100", "Operations", "weekly", "%", "up"),
    _preset("Order Fulfillment Time", "Average time from order to dispatch (in hours)",
            "total_fulfillment_hours / total_orders", "Operations", "weekly", "hrs", "down"),
    _preset("Customer Churn Rate", "Percentage of customers lost during the period",
            "(churned_customers / customers_at_start) * 100", "Operations", "monthly", "%", "down"),
    _preset("Ticket Resolution Rate", "Percentage of support tickets resolved in the period",
            "(tickets_resolved / tickets_received) * 100", "Operations", "weekly", "%", "up"),
    # Finance
    _preset("Gross Profit Margin", "Revenue left after cost of goods sold, as a percentage of revenue",
            "((total_revenue - cost_of_goods_sold) / total_revenue) * 100", "Finance", "monthly", "%", "up"),
    _preset("Net Profit Margin", "Profit left after all expenses, as a percentage of revenue",
            "((total_revenue - total_expenses) / total_revenue) * 100", "Finance", "monthly", "%", "up"),
    _preset("Operating Expense Ratio", "Operating expenses as a percentage of revenue",
            "(operating_expenses / total_revenue) * 100", "Finance", "monthly", "%", "down"),
    _preset("Burn Rate", "Net cash spent per month",
            "cash_outflow - cash_inflow", "Finance", "monthly", "$", "down"),
    _preset("Accounts Receivable Days", "Average number of days customers take to pay",
            "(accounts_receivable / total_revenue) * 30", "Finance", "monthly", "days", "down"),
]


class KPIService:
    """Service for handling KPI business logic."""

    @staticmethod
    def get_all_kpis(db: Session, org_id: UUID) -> list[KPIDefinition]:
        """Get all KPIs for an organization (both presets and custom)."""
        return db.query(KPIDefinition).filter(
            KPIDefinition.org_id == org_id
        ).order_by(KPIDefinition.category, KPIDefinition.name).all()

    @staticmethod
    def get_kpi_by_id(
        db: Session,
        kpi_id: UUID,
        org_id: UUID
    ) -> Optional[KPIDefinition]:
        """Get a single KPI by ID, ensuring it belongs to the org."""
        return db.query(KPIDefinition).filter(
            KPIDefinition.id == kpi_id,
            KPIDefinition.org_id == org_id
        ).first()

    @staticmethod
    def get_kpi_with_data(
        db: Session,
        kpi_id: UUID,
        org_id: UUID,
        limit: int = 30
    ) -> Optional[tuple[KPIDefinition, list[DataEntry]]]:
        """Get a KPI with its recent data entries."""
        kpi = KPIService.get_kpi_by_id(db, kpi_id, org_id)
        if not kpi:
            return None

        entries = db.query(DataEntry).filter(
            DataEntry.kpi_id == kpi_id,
            DataEntry.org_id == org_id
        ).order_by(DataEntry.date.desc()).limit(limit).all()

        return kpi, entries

    @staticmethod
    def create_kpi(
        db: Session,
        org_id: UUID,
        user_id: UUID,
        data: KPICreateRequest,
    ) -> KPIDefinition:
        """Create a new custom KPI with DataField integration."""
        # Extract input fields from formula
        input_fields = extract_input_fields(data.formula)

        # Convert time_period to model enum
        time_period_str = data.time_period.value if hasattr(data.time_period, 'value') else str(data.time_period)
        time_period_value = TimePeriod(time_period_str)

        kpi = KPIDefinition(
            org_id=org_id,
            name=data.name,
            description=data.description,
            formula=data.formula,
            input_fields=input_fields,
            category=data.category,
            time_period=time_period_value,
            unit=(data.unit or '').strip() or None,
            direction=data.direction,
            is_preset=False,
            is_shared=data.is_shared,
            created_by=user_id,
        )
        db.add(kpi)
        db.flush()  # Get the KPI ID without committing

        # Resolve formula variables to DataFields (auto-create if needed)
        variable_to_field = DataFieldService.auto_create_from_formula(
            db=db,
            org_id=org_id,
            user_id=user_id,
            formula=data.formula,
            room_ids=[data.room_id] if data.room_id else None,
            data_field_mappings=getattr(data, 'data_field_mappings', None),
        )

        # Create KPI -> DataField links
        DataFieldService.create_kpi_data_field_links(db, kpi.id, variable_to_field)

        db.commit()
        db.refresh(kpi)
        return kpi

    @staticmethod
    def update_kpi(
        db: Session,
        kpi: KPIDefinition,
        data: KPIUpdateRequest,
    ) -> KPIDefinition:
        """Update an existing KPI (custom only, not presets)."""
        if kpi.is_preset:
            raise ValueError("Cannot modify preset KPIs")

        formula_changed = False

        # Update fields if provided
        if data.name is not None:
            kpi.name = data.name
        if data.description is not None:
            kpi.description = data.description
        if data.formula is not None:
            kpi.formula = data.formula
            kpi.input_fields = extract_input_fields(data.formula)
            formula_changed = True
        if data.category is not None:
            kpi.category = data.category
        if data.unit is not None:
            kpi.unit = data.unit.strip() or None
        if data.direction is not None:
            kpi.direction = data.direction
        if data.time_period is not None:
            time_period_str = data.time_period.value if hasattr(data.time_period, 'value') else str(data.time_period)
            kpi.time_period = TimePeriod(time_period_str)
        if data.is_shared is not None:
            kpi.is_shared = data.is_shared

        # If formula changed, update DataField links
        if formula_changed:
            variable_to_field = DataFieldService.auto_create_from_formula(
                db=db,
                org_id=kpi.org_id,
                user_id=kpi.created_by,
                formula=kpi.formula,
            )
            DataFieldService.update_kpi_data_field_links(db, kpi.id, variable_to_field)

        db.commit()
        db.refresh(kpi)
        return kpi

    @staticmethod
    def delete_kpi(db: Session, kpi: KPIDefinition) -> bool:
        """
        Delete a KPI (soft delete by removing, but keeping data entries).
        Returns True if deleted, False if it's a preset.
        """
        if kpi.is_preset:
            raise ValueError("Cannot delete preset KPIs")

        # Note: DataEntry has ondelete='CASCADE', so entries will be removed
        # If you want to keep historical data, you could:
        # 1. Add an 'is_archived' field to KPIDefinition
        # 2. Set kpi.is_archived = True instead of deleting
        # For now, we'll do a hard delete as requested

        db.delete(kpi)
        db.commit()
        return True

    @staticmethod
    def _existing_kpi_names(db: Session, org_id: UUID) -> set[str]:
        """Lower-cased names of every KPI in the org (presets and custom)."""
        return {
            name.strip().lower()
            for (name,) in db.query(KPIDefinition.name).filter(KPIDefinition.org_id == org_id).all()
        }

    @staticmethod
    def get_available_presets(db: Session, org_id: UUID) -> list[dict]:
        """
        Get preset KPIs that can still be added: skips any preset whose name is
        already taken by a KPI in the org, so importing never creates a duplicate.
        """
        existing_names = KPIService._existing_kpi_names(db, org_id)
        return [
            {**preset, "input_fields": extract_input_fields(preset["formula"])}
            for preset in DEFAULT_PRESETS
            if preset["name"].lower() not in existing_names
        ]

    @staticmethod
    def seed_presets(
        db: Session,
        org_id: UUID,
        preset_names: Optional[list[str]] = None,
        room_id: Optional[UUID] = None,
    ) -> list[KPIDefinition]:
        """
        Seed KPI presets for an organization.
        If preset_names is provided, only those specific presets are added.
        Skips presets whose name is already used by a KPI in the org.
        Data fields auto-created for the presets are scoped to room_id when given.
        """
        created_presets = []
        existing_names = KPIService._existing_kpi_names(db, org_id)

        for preset_data in DEFAULT_PRESETS:
            if preset_data["name"].lower() in existing_names:
                continue

            # If specific presets requested, skip others
            if preset_names is not None and preset_data["name"] not in preset_names:
                continue

            # Validate formula and extract input fields
            is_valid, error, input_fields = validate_formula(preset_data["formula"])
            if not is_valid:
                # Skip invalid formulas (shouldn't happen with our defaults)
                continue

            preset = KPIDefinition(
                org_id=org_id,
                name=preset_data["name"],
                description=preset_data["description"],
                formula=preset_data["formula"],
                input_fields=input_fields,
                category=preset_data["category"],
                time_period=TimePeriod(preset_data.get("time_period", "daily")),
                unit=preset_data.get("unit"),
                direction=preset_data.get("direction"),
                is_preset=True,
                created_by=None,  # System preset
            )
            db.add(preset)
            db.flush()

            # Create DataField links for preset KPIs
            variable_to_field = DataFieldService.auto_create_from_formula(
                db=db,
                org_id=org_id,
                user_id=None,
                formula=preset_data["formula"],
                room_ids=[room_id] if room_id else None,
            )
            DataFieldService.create_kpi_data_field_links(db, preset.id, variable_to_field)

            created_presets.append(preset)

        if created_presets:
            db.commit()
            for preset in created_presets:
                db.refresh(preset)

        return created_presets

    @staticmethod
    def check_kpi_name_exists(
        db: Session,
        org_id: UUID,
        name: str,
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """Check if a KPI with the given name already exists in the org."""
        query = db.query(KPIDefinition).filter(
            KPIDefinition.org_id == org_id,
            func.lower(KPIDefinition.name) == name.strip().lower()
        )
        if exclude_id:
            query = query.filter(KPIDefinition.id != exclude_id)
        return query.first() is not None
