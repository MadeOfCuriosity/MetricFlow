# Visualize — Project Audit

> Living document. Update the relevant section whenever a module changes (new
> route, new model, new frontend page/service, schema change, etc). Keep entries
> factual and pointer-based (file:line) rather than duplicating code.

Last updated: 2026-09-23

---

## 1. Stack Overview

**Backend**: Python / FastAPI, SQLAlchemy ORM, Alembic migrations, PostgreSQL.
Entry point: [backend/main.py](backend/main.py). Routers are mounted per-domain
under `app/api/routes/`.

**Frontend**: React 18.2 + TypeScript + Vite 5, Tailwind CSS, React Router 6,
Headless UI, Heroicons, Recharts. Context API for cross-cutting state (Auth,
Room, Dashboard, Toast, Theme). Entry: [frontend/src/App.tsx](frontend/src/App.tsx).

**Auth**: JWT access + refresh tokens, blacklist table for revocation
(`token_blacklist.py`), org-scoped multi-tenancy (`org_id` on nearly every
table), separate `SuperAdmin` auth path for platform-level admin.

**Background jobs**: APScheduler (`backend/app/core/scheduler.py`) — currently
drives scheduled integration syncs.

---

## 2. Data Model (backend/app/models)

Org-scoped multi-tenant schema. Core tables:

| Model | Purpose |
|---|---|
| `Organization` | Tenant root |
| `User` | Org member; roles determine data-field/room access |
| `Room` | Sub-unit of an org (branch/department/school/etc) |
| `RoomKPIAssignment` / `UserRoomAssignment` | Junction tables: which KPIs apply to which rooms, which users can access which rooms |
| `DataField` | Reusable named metric input (e.g. "Revenue") — org-unique `variable_name` used in formulas |
| `DataFieldRoom` | Junction: which rooms a data field is collected for |
| `DataFieldEntry` | **Raw input**: one value per data field per date (the atomic unit of manual/CSV/integration input) |
| `KPIDefinition` | A named KPI with a `formula` (string expression) and `input_fields` |
| `KPIDataField` | Junction: which data fields feed a KPI's formula, with `variable_name` binding |
| `DataEntry` | **Derived**: one row per KPI per date (+ optional room), stores the raw `values` used and the `calculated_value` |
| `Threshold` | Alerting bounds on KPIs |
| `Insight` | AI-generated commentary on KPI trends |
| `AIUsage` | Token/cost tracking for AI features |
| `Integration` / `IntegrationFieldMapping` / `SyncLog` | Third-party connector config, column mapping, sync history |
| `Subscription` / `WebhookEvent` | Billing (Razorpay) |
| `Notification*` | In-app announcement campaigns |
| `SalesLead` | Contact-sales / demo request capture |
| `SuperAdmin` / `SuperAdminAuditLog` | Platform-admin identity + audit trail |

**Key relationship to understand data flow**: `DataFieldEntry` (raw, per
field/date) is the single source of truth. `DataEntry` (per KPI/date) is a
derived cache — it's recomputed via `CalculationService.calculate(formula,
values)` any time a contributing `DataFieldEntry` changes. There are two
generations of "data entry" API (`kpi_id`-centric `DataEntry` direct-entry vs.
the newer per-field `DataFieldEntry` model) — both are live; the field-based
one is what the current UI (Data.tsx, CSV import, integrations) uses.

---

## 3. Data Input — How It Actually Works

Three distinct input paths all converge on `DataFieldEntry` rows, which then
trigger KPI recalculation into `DataEntry`.

### 3.1 Manual entry (daily/weekly/monthly form)

- Frontend: [Data.tsx](frontend/src/pages/Data.tsx),
  [DataEntryForm.tsx](frontend/src/components/DataEntryForm.tsx),
  [SpreadsheetView.tsx](frontend/src/components/SpreadsheetView.tsx) (month-grid editing).
- API: `GET /entries/fields/today` — returns fields grouped by room, each with
  `has_entry_today` / `today_value` for the target date, filterable by
  `entry_interval` (daily/weekly/monthly/custom). Dates are snapped via
  `normalize_date_for_interval()` in
  [entry_service.py:20](backend/app/services/entry_service.py#L20) (weekly →
  Monday, monthly → 1st).
- Submit: `POST /entries/fields` → `EntryService.create_field_entries()`
  ([entry_service.py:300](backend/app/services/entry_service.py#L300)) —
  upserts one `DataFieldEntry` per `(org, field, date)`, then calls
  `_recalculate_kpis()` for every KPI that references a changed field, writing
  updated `DataEntry` rows (one per room the KPI is assigned to, or one
  org-level row if unassigned).
- Access control: `DataFieldService.get_accessible_data_fields()` filters
  fields by the user's role/room assignments before they're ever shown in the
  form.
- Spreadsheet/monthly view: `GET /entries/fields/sheet?month=YYYY-MM` batch-loads
  a full month of entries per field per room for grid editing.

### 3.2 CSV / Excel import

- Frontend: [CSVImportModal.tsx](frontend/src/components/CSVImportModal.tsx)
  (upload, preview, header-row picker, mapping UI) +
  [FieldMappingStep.tsx](frontend/src/components/FieldMappingStep.tsx). The
  modal now has a **single source of truth**: it always calls the backend
  `analyze-csv`/`import-csv` endpoints. It previously had a second, divergent
  client-side parser (`analyzeClientSide`, using `papaparse`) as a fallback
  when the backend call failed — that was removed (2026-09-23) since it had
  its own, different bugs and could silently produce a different result than
  the backend for the same file.
- Backend: [universal_csv_importer.py](backend/app/services/universal_csv_importer.py)
  — the most complex single service in the backend. Two-phase flow:
  1. **`POST /entries/fields/analyze-csv`** → `UniversalCSVImporter.analyze_file()`:
     decodes bytes (tries utf-8-sig/utf-8/latin-1/cp1252), detects delimiter via
     `csv.Sniffer`, locates the header row structurally via
     `find_header_row_index()` (see below), then **auto-detects one of 5 layouts**:
     - `COLUMNAR` — `date, [room], metric1, metric2, ...`
     - `STATEMENT` — key/value financial reports (P&L, balance sheet; no date
       column, date extracted from banner text like "FOR THE PERIOD ... TO
       30-JUNE-2026")
     - `MATRIX` — transposed, `field, [room], 2026-01-01, 2026-01-02, ...`
     - `LONG` — EAV style, `date, [room], field_name, value`
     - `TRANSACTIONAL` — repeated dates per row, aggregated (sum/avg/min/max/count/latest)
     Returns suggested column→DataField mappings (auto-matches existing fields
     by `variable_name`/`name`, else proposes creating a new field), plus
     `header_row_index` and `rows_before_header` so the UI can show what was
     detected/skipped.
  2. **`POST /entries/fields/import-csv`** (file + optional
     `mapping_config` JSON) → `UniversalCSVImporter.import_file()`: re-detects
     or applies the user-edited mapping config, parses every row per the
     detected layout, resolves/creates `DataField`s and `Room`s, aggregates
     values per `(date, field, room)` key, then batch-persists through
     `EntryService.create_field_entries()` — so CSV import reuses the exact
     same upsert + KPI-recalculation path as manual entry.
  - Supports `.csv/.xlsx/.xls/.xlsm/.txt/.tsv/.dat`, multi-sheet Excel
    (`openpyxl`), currency/percent/comma/parenthesized-negative number parsing,
    and ~10 date formats plus named-month formats.
- `GET /entries/fields/csv-template` — downloads a pre-filled CSV template
  (existing field names × days-in-month, room column if any field has room
  assignments) to guide correctly-shaped re-uploads.

**Header-row detection (rebuilt 2026-09-23)** — `find_header_row_index()`
([universal_csv_importer.py](backend/app/services/universal_csv_importer.py))
picks the header structurally: the first row (within a 10-row scan window)
whose cell-count is close to the file's typical/modal column width; narrower
rows above it (report titles, banner text) are skipped. The previous
implementation scored rows by `(parseable-date-cells × 10) + (keyword
matches × 2) + row length`, which meant a plain data row like
`2026-01-01,100,5` (one date cell) reliably outscored and replaced the real
header `Date,Revenue,Signups` (no date cell, just the keyword "Date") — the
most common CSV shape in the product was silently mis-parsed. Fixed in commit
history; regression tests in
`backend/tests/test_universal_csv_importer.py` (`test_header_row_is_never_a_data_row_with_a_date_in_it`,
`test_find_header_row_index_skips_narrow_banner_rows`, etc). The user can
also override the detected header row from the import preview UI (a
"that's not right — pick the header row" control), which re-analyzes via
`header_row_index` on both `analyze-csv` and `import-csv`
(`CSVColumnMappingConfig.header_row_index` /
`CSVAnalysisResponse.header_row_index` + `rows_before_header`).

**Date-column ambiguity**: `resolve_column_date_format()` scans an entire
date column once (for COLUMNAR/TRANSACTIONAL/LONG layouts) to lock a single
DD/MM-vs-MM/DD interpretation for the whole column, instead of letting
`parse_date_value()` guess independently per row (which could parse
`03/04/2026` as one thing on row 5 and the opposite on row 40 within the same
file).

Known remaining gaps (deliberately out of scope for the 2026-09-23 rebuild):
merged/multi-row headers, multiple tables in one sheet, pivot/subtotal-heavy
exports, format-specific presets (Zoho/Tally/QuickBooks), non-UTF encodings
beyond utf-8-sig/utf-8/latin-1/cp1252.

### 3.3 Third-party integrations (scheduled sync)

- Frontend: [Integrations.tsx](frontend/src/pages/Integrations.tsx),
  [IntegrationSetupModal.tsx](frontend/src/components/IntegrationSetupModal.tsx),
  [ConnectorCard.tsx](frontend/src/components/ConnectorCard.tsx),
  [SyncHistoryModal.tsx](frontend/src/components/SyncHistoryModal.tsx).
- Connectors: [backend/app/services/connectors/](backend/app/services/connectors)
  — `base.py` defines `BaseConnector` (abstract: `test_connection`,
  `get_available_fields`, `fetch_data(start_date, end_date)`, `refresh_auth`).
  Implementations: `ga4.py`, `google_ads.py`, `google_sheets.py`,
  `leadsquared.py`, `meta_ads.py`, `zoho_books.py`, `zoho_crm.py`, `zoho_sheet.py`.
- Field mapping: `IntegrationFieldMapping` binds an external field name to a
  `DataField` (set via `IntegrationService.set_mappings()`).
- Sync orchestration: [sync_service.py](backend/app/services/sync_service.py)
  `SyncService.execute_sync()`:
  1. Cleans up sync logs stuck in `running` > 30 min (crash recovery).
  2. Creates a `SyncLog(status="running")`.
  3. Instantiates the connector via `get_connector()`, calls `refresh_auth()`.
  4. Computes date range (`last_synced_at - 1 day` → today, else last 30 days).
  5. Fetches external rows, maps them through `IntegrationFieldMapping` into
     `DataFieldEntry` upserts, recalculates dependent KPIs — same underlying
     write path as manual/CSV.
  6. Updates `Integration.status`/`last_synced_at` and `SyncLog` summary.
- Scheduling: `backend/app/core/scheduler.py` (APScheduler) triggers syncs
  per-integration on its configured interval (`1h/6h/12h/24h`,
  `SCHEDULE_INTERVALS` in sync_service.py); manual "Sync now" also calls
  `execute_sync()` with `trigger_type="manual"`.

### 3.4 Formula evaluation

- [calculation_service.py](backend/app/services/calculation_service.py) +
  [formula_parser.py](backend/app/core/formula_parser.py) evaluate a KPI's
  `formula` string against the collected `{variable_name: value}` map from its
  linked `DataField`s (via `KPIDataField.variable_name`). This is what turns
  raw field entries into a `DataEntry.calculated_value`, regardless of which of
  the three input paths produced the underlying field values.

---

## 4. Backend Modules (by API route file)

| Route file | Domain |
|---|---|
| `auth.py` | Login/register/refresh/logout, token blacklist |
| `kpis.py` | KPI CRUD, formula validation, KPI↔DataField linking |
| `entries.py` | §3 above — manual entry, CSV import, sheet view |
| `data_fields.py` | DataField CRUD, room assignment |
| `rooms.py` | Room CRUD, user-room assignment |
| `insights.py` | AI-generated KPI insights (read/generate) |
| `ai.py` | AI Builder — natural-language KPI/dashboard creation (`AIBuilder.tsx`) |
| `integrations.py` | §3.3 — connector setup, OAuth callback, mappings, manual sync trigger |
| `users.py` | Org user management, roles |
| `admin.py` | Org-admin settings (org profile, plan, activity log) |
| `subscriptions.py` | Razorpay billing, plan/usage |
| `superadmin.py` | Platform-level admin (cross-org: orgs, users, subscriptions, industries, campaigns, audit log, health, leads) |
| `notifications.py` | In-app notification campaigns + per-user dismissal |
| `sales.py` | Contact-sales / demo lead capture |

Core services beyond entry/import/sync (already covered): `kpi_service.py`,
`room_service.py`, `user_service.py`, `data_field_service.py`,
`auth_service.py`, `ai_service.py` / `admin_ai_service.py`,
`insight_generator.py`, `aggregation_service.py`, `statistics_service.py`,
`admin_stats_service.py`, `audit_service.py`, `razorpay_service.py`,
`superadmin_service.py` / `superadmin_phase2_service.py`.

Core infra (`app/core/`): `config.py` (env/settings), `database.py` (session
mgmt), `security.py` (JWT/hashing), `encryption.py` (integration credential
encryption at rest), `middleware.py` (security headers, request validation,
SQL-injection prevention), `rate_limit.py` (slowapi), `sanitization.py`,
`exceptions.py`, `scheduler.py`.

---

## 5. Frontend Modules

**Pages** ([frontend/src/pages](frontend/src/pages)): `Dashboard`, `KPIs`,
`KPIDataView`, `Data` (manual/CSV entry hub), `Entries` (legacy KPI-direct
entry list), `Insights`, `Rooms`, `RoomDashboard`, `AIBuilder`,
`Integrations`, `UserManagement`, `Subscription`, `Landing`, `Login`,
`Register`, `GoogleOrgSetup`, `Privacy`, `Terms`.

**admin/** ([frontend/src/pages/admin](frontend/src/pages/admin)): settings
surface — `AdminDashboard`, `AdminUsers`, `AdminRooms`, `AdminOrganization`,
`AdminIntegrations`, `AdminActivity`, plus the `Settings*` pages
(Account/General/Appearance/Security/Privacy/Notifications/Plan/Usage/Upgrade/Terms/MyActivity/Activity).
Note: `App.tsx` routing shows most of these old paths now `<Navigate>` to a
consolidated `/settings` (with hash sections) — settings UI was recently
flattened into fewer pages.

**superadmin/** ([frontend/src/pages/superadmin](frontend/src/pages/superadmin)):
separate auth (`SuperAdminLogin`) and layout, cross-org views —
`SuperAdminOrgs`/`OrgDetail`, `Users`, `Subscriptions`, `Industries`,
`Campaigns`, `AuditLog`, `Health`, `Leads`, `Admins`, `Insights`.

**Key components**: `CSVImportModal`, `FieldMappingStep`, `DataEntryForm`,
`SpreadsheetView` (data input, §3); `KPICreationStudio`, `KPIList`, `KPICard`,
`KPIDetailModal`, `KPISuggestionCard`, `AggregatedKPICard` (KPI authoring/display);
`ChatInterface`, `AdminAIAgent` (AI Builder chat); `IntegrationSetupModal`,
`ConnectorCard`, `SyncHistoryModal` (§3.3); `CreateRoomModal`, `EditRoomModal`
(rooms); `InsightCard`, `TrendChart`, `ActivityHeatmap` (analytics display);
`InAppNotifications`, `ImpersonationBanner`; `ThemeToggle` (see theming memory);
shared primitives in `components/ui/`, dashboard widgets in `components/widgets/`.

**Context** ([frontend/src/context](frontend/src/context)): `AuthContext`
(JWT session), `RoomContext` (active room selection), `DashboardContext`,
`ToastContext`, `ThemeContext` (see MEMORY.md theme system notes).

**Services** ([frontend/src/services](frontend/src/services)): thin
API-client wrappers per domain — `api.ts` (base axios/fetch client + auth
header injection), `auth.ts`, `dataFields.ts` (entries/CSV endpoints),
`rooms.ts`, `integrations.ts`, `sales.ts`, `subscriptions.ts`, `users.ts`,
`notifications.ts`, `admin.ts`/`adminAI.ts`, `superadmin.ts`/`superadminApi.ts`,
`impersonation.ts` (superadmin "login as org" support).

---

## 6. Cross-Cutting Concerns

- **Multi-tenancy**: every query is scoped by `org_id`, enforced per-service
  rather than via RLS — audit any new query for a missing `org_id` filter.
- **Access control within an org**: room-based; `DataFieldService.get_accessible_data_fields`
  and equivalent room-scoping logic gate what a non-admin user can see/enter.
- **Recalculation is synchronous**: KPI recalculation happens inline inside
  the same request/transaction as the triggering write (manual entry, CSV
  import, or sync) — there's no async job queue for this.
- **Upsert semantics**: all three input paths converge on the same
  `(org_id, data_field_id, date)` unique constraint
  (`uq_field_entry_org_field_date` on `DataFieldEntry`) — re-submitting for an
  existing date always overwrites rather than duplicates.

---

## 7. Open Questions / Things to Verify Next

- Confirm whether the legacy KPI-direct `DataEntry`-only endpoints
  (`POST /entries`, `Entries.tsx` page) are still reachable from the UI or are
  fully superseded by the field-based flow — worth deprecating one path if not.
- CSV/Excel import now has solid coverage for the "one clean table per
  sheet/file" case (see §3.2), but multi-table sheets, merged headers, and
  pivot-style exports are still unhandled — worth a format-specific-preset or
  LLM-assisted-fallback follow-up if real users hit those shapes.
- `abcd_mobile/` appeared as an untracked directory in git status — not yet
  covered by this audit; investigate before it's assumed to be dead/experimental.
- Project directory/repo was renamed `MetricFlow` → `Visualize` (2026-09-23);
  a broad rebrand string-replace touched ~18 files (README, docker-compose,
  exceptions, etc.) — purely cosmetic, no logic changes observed.

---

## 8. Changelog of This Audit

- **2026-09-23**: Initial audit — full module map + detailed data-input flow
  (manual entry, CSV/Excel universal importer, integration sync).
- **2026-09-23**: CSV/Excel importer rebuild — fixed the header-row-detection
  bug that mis-parsed the most common CSV shape (see §3.2), added a
  user-facing header-row override, added per-column date-format-ambiguity
  resolution, and removed the duplicate/divergent client-side fallback parser
  in `CSVImportModal.tsx`. Backend test suite: 58/58 passing (was 53/58
  before the fix). Frontend typecheck + production build both clean.
