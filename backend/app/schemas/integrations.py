from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --- Request schemas ---

class CreateIntegrationRequest(BaseModel):
    provider: str = Field(
        ...,
        pattern="^(google_sheets|google_ads|ga4|meta_ads|zoho_crm|zoho_books|zoho_sheet|leadsquared)$",
    )
    display_name: str = Field(..., min_length=1, max_length=255)
    sync_schedule: str = Field("manual", pattern="^(manual|1h|6h|12h|24h)$")
    config: dict = Field(default_factory=dict)
    # LeadSquared only
    api_key: Optional[str] = None
    api_secret: Optional[str] = None


class UpdateIntegrationRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    sync_schedule: Optional[str] = Field(None, pattern="^(manual|1h|6h|12h|24h)$")
    config: Optional[dict] = None


class FieldMappingInput(BaseModel):
    external_field_name: str = Field(..., min_length=1)
    external_field_label: Optional[str] = None
    data_field_id: UUID
    aggregation: str = Field("direct", pattern="^(direct|count|sum|avg|min|max)$")
    filter_criteria: Optional[dict] = None


class SetFieldMappingsRequest(BaseModel):
    mappings: list[FieldMappingInput] = Field(..., min_length=1)


# --- Response schemas ---

class IntegrationResponse(BaseModel):
    id: UUID
    org_id: UUID
    provider: str
    display_name: str
    status: str
    error_message: Optional[str] = None
    config: dict = Field(default_factory=dict)
    sync_schedule: str
    last_synced_at: Optional[datetime] = None
    next_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    mapping_count: int = 0

    model_config = {"from_attributes": True}


class IntegrationListResponse(BaseModel):
    integrations: list[IntegrationResponse]
    total: int


class FieldMappingResponse(BaseModel):
    id: UUID
    integration_id: UUID
    data_field_id: UUID
    data_field_name: str = ""
    external_field_name: str
    external_field_label: Optional[str] = None
    aggregation: str
    is_active: bool

    model_config = {"from_attributes": True}


class FieldMappingListResponse(BaseModel):
    mappings: list[FieldMappingResponse]
    total: int


class ExternalFieldResponse(BaseModel):
    name: str
    label: str
    field_type: str


class ExternalFieldListResponse(BaseModel):
    fields: list[ExternalFieldResponse]
    total: int


class SyncLogResponse(BaseModel):
    id: UUID
    integration_id: UUID
    status: str
    trigger_type: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    rows_fetched: int
    rows_written: int
    rows_skipped: int
    errors_count: int
    error_details: Optional[list] = None
    summary: Optional[str] = None

    model_config = {"from_attributes": True}


class SyncLogListResponse(BaseModel):
    logs: list[SyncLogResponse]
    total: int


class IntegrationDetailResponse(IntegrationResponse):
    field_mappings: list[FieldMappingResponse] = []
    recent_logs: list[SyncLogResponse] = []


class OAuthAuthorizeResponse(BaseModel):
    authorize_url: str
    state: str


# --- Zoho Books guided setup ---

ZOHO_BOOKS_MODULE_PATTERN = (
    "^(invoices|bills|expenses|payments_received|payments_made|credit_notes|"
    "sales_orders|purchase_orders|gl_revenue|gl_expense)$"
)


class ZohoBooksOrganization(BaseModel):
    id: str
    name: str
    currency_code: Optional[str] = None
    is_default: bool = False


class ZohoBooksBranch(BaseModel):
    id: str
    name: str
    is_primary: bool = False


class ZohoBooksAccount(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    account_type: Optional[str] = None


class ZohoBooksOrganizationListResponse(BaseModel):
    organizations: list[ZohoBooksOrganization]


class ZohoBooksBranchListResponse(BaseModel):
    branches: list[ZohoBooksBranch]


class ZohoBooksAccountListResponse(BaseModel):
    accounts: list[ZohoBooksAccount]


class ZohoBooksPreviewResponse(BaseModel):
    # Each row: {"date": "YYYY-MM-DD", "<field>__sum": 1.0, "__record_count": 3, ...}
    rows: list[dict]


class ZohoBooksSourceMapping(BaseModel):
    external_field_name: str = Field(..., min_length=1)
    external_field_label: Optional[str] = None
    aggregation: str = Field("sum", pattern="^(count|sum|avg|min|max)$")
    # Exactly one of these: an existing field, or the name of a field to create
    data_field_id: Optional[UUID] = None
    new_field_name: Optional[str] = Field(None, min_length=1, max_length=255)


class ZohoBooksSourceInput(BaseModel):
    module: str = Field(..., pattern=ZOHO_BOOKS_MODULE_PATTERN)
    gl_account_id: Optional[str] = None
    display_name: str = Field(..., min_length=1, max_length=255)
    mappings: list[ZohoBooksSourceMapping] = Field(..., min_length=1)


class CreateZohoBooksSourcesRequest(BaseModel):
    org_id: str = Field(..., min_length=1)
    branch_id: Optional[str] = None
    sync_schedule: str = Field("24h", pattern="^(manual|1h|6h|12h|24h)$")
    # How far back to bring in data (the first 30 days sync right away, the rest in the background)
    history_days: int = Field(30, ge=1, le=1095)
    sources: list[ZohoBooksSourceInput] = Field(..., min_length=1, max_length=20)


class ResyncHistoryRequest(BaseModel):
    days: int = Field(..., ge=1, le=1095)
