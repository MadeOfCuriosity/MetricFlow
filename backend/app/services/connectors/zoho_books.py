import logging
import threading
import time
from collections import OrderedDict, defaultdict
from datetime import date, datetime, timedelta
from typing import Optional

import httpx

from app.core.config import settings
from app.core.encryption import encrypt_value, decrypt_value
from app.services.connectors.base import BaseConnector, ExternalField

logger = logging.getLogger(__name__)

ZOHO_AUTH_URI = f"https://accounts.zoho.{settings.ZOHO_DC}/oauth/v2/auth"
ZOHO_TOKEN_URI = f"https://accounts.zoho.{settings.ZOHO_DC}/oauth/v2/token"
ZOHO_BOOKS_API_BASE = f"https://www.zohoapis.{settings.ZOHO_DC}/books/v3"
ZOHO_BOOKS_SCOPES = "ZohoBooks.fullaccess.all"

ZOHO_DATE_FORMAT = "%Y-%m-%d"

# Zoho Books modules and their API endpoints + date fields
BOOKS_MODULES = {
    "invoices": {"endpoint": "invoices", "date_field": "date", "id_field": "invoice_id"},
    "bills": {"endpoint": "bills", "date_field": "date", "id_field": "bill_id"},
    "expenses": {"endpoint": "expenses", "date_field": "date", "id_field": "expense_id"},
    "payments_received": {"endpoint": "customerpayments", "date_field": "date", "id_field": "payment_id"},
    "payments_made": {"endpoint": "vendorpayments", "date_field": "date", "id_field": "payment_id"},
    "credit_notes": {"endpoint": "creditnotes", "date_field": "date", "id_field": "creditnote_id"},
    "sales_orders": {"endpoint": "salesorders", "date_field": "date", "id_field": "salesorder_id"},
    "purchase_orders": {"endpoint": "purchaseorders", "date_field": "date", "id_field": "purchaseorder_id"},
}

# "gl_revenue" is not a document module — it attributes invoice line items to a
# specific Chart of Accounts GL (e.g. "SMM Sales", "PM Sales"). Zoho's invoice
# LIST endpoint doesn't expose per-line-item account_id, so this mode fetches
# each invoice's full detail to read line_items and filters/sums by GL account.
# Safety cap on invoice detail calls per sync — orgs with heavy invoice volume
# would otherwise trigger hundreds of extra API calls in one run.
GL_REVENUE_MODULE = "gl_revenue"
MAX_GL_REVENUE_INVOICES_PER_SYNC = 1000

# "gl_expense" is the same idea as gl_revenue but for costs (e.g. per-department
# salary GLs) which post via Journal Entries, not invoices — Zoho payroll/manual
# journals debit a department's expense account and credit a payable/bank
# account, so this sums the debit side of line items matching gl_account_id.
GL_EXPENSE_MODULE = "gl_expense"
MAX_GL_EXPENSE_JOURNALS_PER_SYNC = 1000


# Per-period page cap for list endpoints (200 records per page)
MAX_LIST_PAGES = 50

# Not real transactions (yet, or any more): left out of every total
EXCLUDED_STATUSES = {"draft", "void", "pending_approval"}

# Amount fields converted to the org's base currency before summing. Zoho
# gives some records a bcy_<field>; the rest are document currency × exchange_rate.
MONEY_FIELDS = {
    "total", "sub_total", "tax_total", "balance", "balance_due", "amount", "total_without_tax",
    "unused_amount", "bank_charges", "shipping_charge", "adjustment", "write_off_amount",
    "discount_total", "tds_total", "unprocessed_payment_amount", "tax_amount_withheld",
    "refunded_amount", "payment_made",
}

# Invoice/journal details are shared by every GL source in the org, so one
# source's fetches serve the rest. Keyed by last_modified_time so edits refetch;
# records without one are re-read after the TTL.
_DETAIL_CACHE: "OrderedDict[tuple, tuple[Optional[str], float, dict]]" = OrderedDict()
_DETAIL_CACHE_LOCK = threading.Lock()
DETAIL_CACHE_MAX = 20000
DETAIL_CACHE_TTL_SECONDS = 6 * 3600


def _is_number(val) -> bool:
    return isinstance(val, (int, float)) and not isinstance(val, bool)


def _rate(record: dict) -> float:
    rate = record.get("exchange_rate")
    return float(rate) if _is_number(rate) and rate > 0 else 1.0


def is_counted(record: dict) -> bool:
    return str(record.get("status") or "").lower() not in EXCLUDED_STATUSES


def to_base_currency(record: dict) -> dict:
    """Copy of a record with its amount fields in the org's base currency."""
    out = dict(record)
    rate = _rate(record)
    for key in MONEY_FIELDS:
        val = record.get(key)
        if not _is_number(val):
            continue
        bcy = record.get(f"bcy_{key}")
        out[key] = bcy if _is_number(bcy) else val * rate
    return out


# Numeric settings on Zoho records that aren't business values
NON_METRIC_FIELDS = {"exchange_rate", "price_precision", "no_of_copies", "show_no_of_copies"}

# Chart of Accounts types that count as income / expense for the GL modules
INCOME_ACCOUNT_TYPES = {"income", "other_income"}
EXPENSE_ACCOUNT_TYPES = {"expense", "cost_of_goods_sold", "other_expense"}


class ZohoBooksConnector(BaseConnector):
    """Connector for Zoho Books API v3."""

    def __init__(self, integration, db=None, config_override: Optional[dict] = None):
        super().__init__(integration, db)
        # Lets setup screens read fields/previews for a module this integration
        # isn't configured for yet, reusing its OAuth tokens.
        self.config_override = config_override
        # Reasons the last fetch_data range may be incomplete (page/detail caps)
        self.warnings: list[str] = []

    # Every day in a fetched range is complete (a day with no records means
    # zero), so the sync may fill empty days and re-check a trailing window.
    reports_complete_days = True

    def _config(self) -> dict:
        if self.config_override is not None:
            return self.config_override
        return self.integration.config or {}

    @staticmethod
    def get_authorize_url(state: str) -> str:
        """Generate OAuth2 authorization URL for Zoho Books."""
        params = {
            "scope": ZOHO_BOOKS_SCOPES,
            "client_id": settings.ZOHO_OAUTH_CLIENT_ID,
            "response_type": "code",
            "access_type": "offline",
            "redirect_uri": settings.ZOHO_BOOKS_OAUTH_REDIRECT_URI,
            "state": state,
            "prompt": "consent",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{ZOHO_AUTH_URI}?{query}"

    @staticmethod
    def exchange_code(code: str) -> dict:
        """Exchange authorization code for access + refresh tokens."""
        with httpx.Client() as client:
            resp = client.post(
                ZOHO_TOKEN_URI,
                params={
                    "code": code,
                    "client_id": settings.ZOHO_OAUTH_CLIENT_ID,
                    "client_secret": settings.ZOHO_OAUTH_CLIENT_SECRET,
                    "redirect_uri": settings.ZOHO_BOOKS_OAUTH_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            return resp.json()

    def _get_org_id(self) -> str:
        """Get the Zoho Books organization ID from config."""
        return self._config().get("zoho_org_id", "")

    def _get_headers(self) -> dict:
        """Get authorization headers with the current access token."""
        access_token = decrypt_value(self.integration.access_token_encrypted) if self.integration.access_token_encrypted else ""
        return {
            "Authorization": f"Zoho-oauthtoken {access_token}",
            "Content-Type": "application/json",
        }

    def test_connection(self) -> bool:
        """Test connection by fetching organizations from Zoho Books."""
        try:
            with httpx.Client() as client:
                resp = client.get(
                    f"{ZOHO_BOOKS_API_BASE}/organizations",
                    headers=self._get_headers(),
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("code") == 0
                return False
        except Exception as e:
            logger.error(f"Zoho Books connection test failed: {e}")
            return False

    def refresh_auth(self) -> bool:
        """Refresh the OAuth access token."""
        refresh_token = decrypt_value(self.integration.refresh_token_encrypted) if self.integration.refresh_token_encrypted else None
        if not refresh_token:
            return False

        try:
            with httpx.Client() as client:
                resp = client.post(
                    ZOHO_TOKEN_URI,
                    params={
                        "refresh_token": refresh_token,
                        "client_id": settings.ZOHO_OAUTH_CLIENT_ID,
                        "client_secret": settings.ZOHO_OAUTH_CLIENT_SECRET,
                        "grant_type": "refresh_token",
                    },
                )
                resp.raise_for_status()
                tokens = resp.json()

            if "access_token" not in tokens:
                logger.error(f"Zoho Books refresh failed: {tokens}")
                return False

            if self.db and self.integration:
                self.integration.access_token_encrypted = encrypt_value(tokens["access_token"])
                expires_in = tokens.get("expires_in", 3600)
                self.integration.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                self.db.commit()

            return True
        except Exception as e:
            logger.error(f"Zoho Books token refresh failed: {e}")
            return False

    # --- Setup lookups (organisations, branches, chart of accounts) ---

    def ensure_fresh_token(self) -> bool:
        """Refresh the access token if it's missing or about to expire."""
        expires_at = self.integration.token_expires_at
        if expires_at and expires_at > datetime.utcnow() + timedelta(seconds=60):
            return True
        return self.refresh_auth()

    def _get(self, path: str, params: Optional[dict] = None) -> dict:
        """GET a Zoho Books endpoint; raises on HTTP or API-level errors."""
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                f"{ZOHO_BOOKS_API_BASE}/{path}",
                headers=self._get_headers(),
                params=params or {},
            )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"Zoho Books API error on {path}: {data.get('message')}")
        return data

    def list_organizations(self) -> list[dict]:
        data = self._get("organizations")
        return [
            {
                "id": str(o.get("organization_id", "")),
                "name": o.get("name", ""),
                "currency_code": o.get("currency_code"),
                "is_default": bool(o.get("is_default_org")),
            }
            for o in data.get("organizations", [])
        ]

    def list_branches(self, org_id: str) -> list[dict]:
        """Branches for an org. Orgs without branches enabled return []."""
        try:
            data = self._get("branches", {"organization_id": org_id})
        except (RuntimeError, httpx.HTTPStatusError) as e:
            logger.info(f"Zoho Books branches unavailable for org {org_id}: {e}")
            return []
        return [
            {
                "id": str(b.get("branch_id", "")),
                "name": b.get("branch_name", ""),
                "is_primary": bool(b.get("is_primary_branch")),
            }
            for b in data.get("branches", [])
        ]

    def list_accounts(self, org_id: str, kind: str) -> list[dict]:
        """Active Chart of Accounts entries of the given kind ("income" | "expense")."""
        wanted = INCOME_ACCOUNT_TYPES if kind == "income" else EXPENSE_ACCOUNT_TYPES
        accounts = []
        page = 1
        while page <= 10:
            data = self._get("chartofaccounts", {
                "organization_id": org_id,
                "filter_by": "AccountType.Active",
                "page": page,
                "per_page": 200,
            })
            for a in data.get("chartofaccounts", []):
                if a.get("account_type") in wanted:
                    accounts.append({
                        "id": str(a.get("account_id", "")),
                        "name": a.get("account_name", ""),
                        "code": a.get("account_code") or None,
                        "account_type": a.get("account_type"),
                    })
            if not data.get("page_context", {}).get("has_more_page"):
                break
            page += 1
        return sorted(accounts, key=lambda a: a["name"].lower())

    def get_available_fields(self) -> list[ExternalField]:
        """Return available fields for the configured Zoho Books module."""
        config = self._config()
        module = config.get("module", "invoices")

        if module == GL_REVENUE_MODULE:
            # Fields come from invoice line_items, not the invoice list — fixed
            # set, since discovering them would require a full detail fetch.
            return [
                ExternalField(name="item_total", label="Line Item Total", field_type="number"),
                ExternalField(name="quantity", label="Quantity", field_type="number"),
            ]

        if module == GL_EXPENSE_MODULE:
            return [
                ExternalField(name="amount", label="Debit Amount", field_type="number"),
            ]

        module_info = BOOKS_MODULES.get(module, BOOKS_MODULES["invoices"])
        org_id = self._get_org_id()

        try:
            with httpx.Client() as client:
                resp = client.get(
                    f"{ZOHO_BOOKS_API_BASE}/{module_info['endpoint']}",
                    headers=self._get_headers(),
                    params={"organization_id": org_id, "page": 1, "per_page": 1},
                    timeout=15,
                )
                resp.raise_for_status()
                data = resp.json()

            # Extract fields from the first record to discover available fields
            records = data.get(module_info["endpoint"], data.get("data", []))
            if not records:
                # Return common fields for the module
                return self._get_default_fields(module)

            sample = records[0]
            fields = []
            for key, val in sample.items():
                if key.startswith("_") or isinstance(val, (dict, list)) or key in NON_METRIC_FIELDS:
                    continue
                field_type = "string"
                # bool before number: True/False are ints in Python
                if isinstance(val, bool):
                    field_type = "boolean"
                elif isinstance(val, (int, float)):
                    field_type = "number"
                elif key in ("date", "due_date", "created_time", "last_modified_time"):
                    field_type = "date"

                fields.append(ExternalField(
                    name=key,
                    label=key.replace("_", " ").title(),
                    field_type=field_type,
                ))
            return fields

        except Exception as e:
            logger.error(f"Failed to fetch Zoho Books fields: {e}")
            return self._get_default_fields(module)

    # --- HTTP with rate-limit handling ---

    def _get_json(self, client: httpx.Client, path: str, params: dict, max_attempts: int = 4) -> Optional[dict]:
        """
        GET a Zoho Books endpoint, retrying rate limits (429) and server errors
        with backoff. Returns None for 204 (no content) and 404 (record gone).
        Raises on any other failure — a failed fetch must never look like
        "no data", or the sync would write zeros over real values.
        """
        last_error = ""
        for attempt in range(1, max_attempts + 1):
            try:
                resp = client.get(f"{ZOHO_BOOKS_API_BASE}/{path}", headers=self._get_headers(), params=params)
            except httpx.HTTPError as e:
                last_error = str(e)
            else:
                if resp.status_code in (204, 404):
                    return None
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") != 0:
                        raise RuntimeError(f"Zoho Books API error on {path}: {data.get('message')}")
                    return data
                last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
                if resp.status_code != 429 and resp.status_code < 500:
                    break  # 4xx other than rate limit won't fix itself
            if attempt < max_attempts:
                retry_after = 0
                try:
                    retry_after = int(resp.headers.get("Retry-After", 0))  # type: ignore[possibly-undefined]
                except Exception:
                    pass
                time.sleep(max(retry_after, 2 ** attempt))
        raise RuntimeError(f"Zoho Books request to {path} failed after retries: {last_error}")

    def _list_all(self, client: httpx.Client, endpoint: str, params: dict) -> list[dict]:
        """All pages of a list endpoint. Flags the sync as incomplete if it hits the page cap."""
        records: list[dict] = []
        page = 1
        while True:
            data = self._get_json(client, endpoint, {**params, "page": page, "per_page": 200})
            if data is None:
                break
            records.extend(data.get(endpoint, data.get("data", [])))
            if not data.get("page_context", {}).get("has_more_page", False):
                break
            if page >= MAX_LIST_PAGES:
                self.warnings.append(
                    f"Stopped after {MAX_LIST_PAGES * 200} {endpoint} in one period; later days may be missing."
                )
                break
            page += 1
        return records

    def _get_detail(
        self,
        client: httpx.Client,
        endpoint: str,
        record_id: str,
        org_id: str,
        response_key: str,
        modified: Optional[str],
    ) -> tuple[Optional[dict], bool]:
        """
        One invoice/journal's detail, from the shared cache when it hasn't
        changed. Returns (detail or None if deleted, fetched_from_zoho).
        """
        key = (endpoint, org_id, record_id)
        now = time.time()
        with _DETAIL_CACHE_LOCK:
            hit = _DETAIL_CACHE.get(key)
            if hit:
                cached_modified, cached_at, detail = hit
                fresh = cached_modified == modified if modified else now - cached_at < DETAIL_CACHE_TTL_SECONDS
                if fresh:
                    _DETAIL_CACHE.move_to_end(key)
                    return detail, False

        data = self._get_json(client, f"{endpoint}/{record_id}", {"organization_id": org_id})
        detail = data.get(response_key, {}) if data else None
        with _DETAIL_CACHE_LOCK:
            if detail is not None:
                _DETAIL_CACHE[key] = (modified, now, detail)
                _DETAIL_CACHE.move_to_end(key)
                while len(_DETAIL_CACHE) > DETAIL_CACHE_MAX:
                    _DETAIL_CACHE.popitem(last=False)
            else:
                _DETAIL_CACHE.pop(key, None)
        return detail, True

    def _list_stubs(
        self,
        client: httpx.Client,
        endpoint: str,
        id_key: str,
        date_key: str,
        org_id: str,
        start_date: date,
        end_date: date,
        cap: int,
    ) -> list[tuple[str, date, Optional[str]]]:
        """(id, date, last_modified_time) for counted records in range, capped."""
        records = self._list_all(client, endpoint, {
            "organization_id": org_id,
            "date_start": start_date.strftime(ZOHO_DATE_FORMAT),
            "date_end": end_date.strftime(ZOHO_DATE_FORMAT),
            "sort_column": date_key,
            "sort_order": "A",
        })
        stubs = []
        for rec in records:
            if not is_counted(rec):
                continue
            try:
                rec_date = datetime.strptime(str(rec.get(date_key, ""))[:10], ZOHO_DATE_FORMAT).date()
            except ValueError:
                continue
            stubs.append((rec[id_key], rec_date, rec.get("last_modified_time")))
        if len(stubs) > cap:
            self.warnings.append(
                f"{len(stubs)} {endpoint} in one period; only the first {cap} were read, so later days may be missing."
            )
            stubs = stubs[:cap]
        return stubs

    def _fetch_gl_revenue(self, start_date: date, end_date: date) -> list[dict]:
        """
        Invoice lines posted to the configured income account, per day, in
        the org's base currency. Zoho's invoice list has no per-line account,
        so each invoice's detail is read (shared across GL sources via cache).
        """
        config = self._config()
        org_id = self._get_org_id()
        gl_account_id = config.get("gl_account_id")
        if not gl_account_id:
            raise RuntimeError("This source has no GL account set. Edit it and pick an account.")

        totals: dict[date, dict[str, float]] = defaultdict(lambda: {"item_total": 0.0, "quantity": 0.0, "count": 0})
        with httpx.Client(timeout=30) as client:
            stubs = self._list_stubs(
                client, "invoices", "invoice_id", "date", org_id, start_date, end_date, MAX_GL_REVENUE_INVOICES_PER_SYNC,
            )
            for invoice_id, inv_date, modified in stubs:
                detail, fetched = self._get_detail(client, "invoices", invoice_id, org_id, "invoice", modified)
                if fetched:
                    time.sleep(0.3)  # spread calls out to stay under Zoho's rate limit
                if detail is None:
                    continue  # deleted since listing
                rate = _rate(detail)
                for line in detail.get("line_items", []):
                    if line.get("account_id") != gl_account_id:
                        continue
                    bucket = totals[inv_date]
                    bucket["item_total"] += float(line.get("item_total") or 0) * rate
                    bucket["quantity"] += float(line.get("quantity") or 0)
                    bucket["count"] += 1

        rows = []
        for record_date, t in sorted(totals.items()):
            rows.append({
                "date": record_date,
                "item_total__sum": t["item_total"],
                "item_total__count": t["count"],
                "item_total__avg": t["item_total"] / t["count"] if t["count"] else 0,
                "quantity__sum": t["quantity"],
                "__record_count": t["count"],
            })
        return rows

    def _fetch_gl_expense(self, start_date: date, end_date: date) -> list[dict]:
        """
        Journal debits to the configured expense account (e.g. a department's
        salary GL), per day, in base currency. Credits are the offsetting
        entry, not the cost, so only debits are summed.
        """
        config = self._config()
        org_id = self._get_org_id()
        gl_account_id = config.get("gl_account_id")
        if not gl_account_id:
            raise RuntimeError("This source has no GL account set. Edit it and pick an account.")

        totals: dict[date, dict[str, float]] = defaultdict(lambda: {"amount": 0.0, "count": 0})
        with httpx.Client(timeout=30) as client:
            stubs = self._list_stubs(
                client, "journals", "journal_id", "journal_date", org_id, start_date, end_date, MAX_GL_EXPENSE_JOURNALS_PER_SYNC,
            )
            for journal_id, j_date, modified in stubs:
                detail, fetched = self._get_detail(client, "journals", journal_id, org_id, "journal", modified)
                if fetched:
                    time.sleep(0.3)
                if detail is None:
                    continue
                rate = _rate(detail)
                for line in detail.get("line_items", []):
                    if line.get("account_id") != gl_account_id or line.get("debit_or_credit") != "debit":
                        continue
                    bcy = line.get("bcy_amount")
                    amount = float(bcy) if _is_number(bcy) else float(line.get("amount") or 0) * rate
                    totals[j_date]["amount"] += amount
                    totals[j_date]["count"] += 1

        rows = []
        for record_date, t in sorted(totals.items()):
            rows.append({
                "date": record_date,
                "amount__sum": t["amount"],
                "amount__count": t["count"],
                "amount__avg": t["amount"] / t["count"] if t["count"] else 0,
                "__record_count": t["count"],
            })
        return rows

    def _get_default_fields(self, module: str) -> list[ExternalField]:
        """Return common default fields for a module."""
        common = [
            ExternalField(name="total", label="Total", field_type="number"),
            ExternalField(name="balance", label="Balance", field_type="number"),
            ExternalField(name="status", label="Status", field_type="string"),
            ExternalField(name="date", label="Date", field_type="date"),
        ]
        if module in ("invoices", "credit_notes", "sales_orders"):
            common.extend([
                ExternalField(name="sub_total", label="Sub Total", field_type="number"),
                ExternalField(name="tax_total", label="Tax Total", field_type="number"),
            ])
        if module == "expenses":
            common.extend([
                ExternalField(name="amount", label="Amount", field_type="number"),
            ])
        return common

    def fetch_data(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[dict]:
        """
        Records from the configured module in [start_date, end_date], per day.

        Drafts, voids and records awaiting approval are left out, amounts are
        converted to the org's base currency, and any fetch failure raises.
        Days with no records are absent; `self.warnings` lists anything that
        means the range may be incomplete.
        """
        self.warnings = []
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        config = self._config()
        module = config.get("module", "invoices")
        if module == GL_REVENUE_MODULE:
            return self._fetch_gl_revenue(start_date, end_date)
        if module == GL_EXPENSE_MODULE:
            return self._fetch_gl_expense(start_date, end_date)

        module_info = BOOKS_MODULES.get(module, BOOKS_MODULES["invoices"])
        date_field = config.get("date_field", module_info["date_field"])
        params = {
            "organization_id": self._get_org_id(),
            "date_start": start_date.strftime(ZOHO_DATE_FORMAT),
            "date_end": end_date.strftime(ZOHO_DATE_FORMAT),
            "sort_column": date_field,
            "sort_order": "A",
        }
        if config.get("branch_id"):
            params["branch_id"] = config["branch_id"]

        with httpx.Client(timeout=30) as client:
            all_records = self._list_all(client, module_info["endpoint"], params)

        # Group counted records by date, in base currency
        date_groups: dict[date, list[dict]] = defaultdict(list)
        for record in all_records:
            if not is_counted(record):
                continue
            raw_date = record.get(date_field, "")
            if not isinstance(raw_date, str) or not raw_date:
                continue
            try:
                record_date = datetime.strptime(raw_date[:10], ZOHO_DATE_FORMAT).date()
            except ValueError:
                continue
            date_groups[record_date].append(to_base_currency(record))

        rows = []
        for record_date, records in sorted(date_groups.items()):
            entry = {"date": record_date, "_records": records, "_count": len(records)}

            numeric_sums: dict[str, float] = defaultdict(float)
            numeric_counts: dict[str, int] = defaultdict(int)
            numeric_mins: dict[str, float] = {}
            numeric_maxs: dict[str, float] = {}

            for rec in records:
                for key, val in rec.items():
                    if key.startswith("_") or isinstance(val, (dict, list)):
                        continue
                    if isinstance(val, (int, float)):
                        numeric_sums[key] += val
                        numeric_counts[key] += 1
                        numeric_mins[key] = min(numeric_mins.get(key, val), val)
                        numeric_maxs[key] = max(numeric_maxs.get(key, val), val)

            for field_name in numeric_sums:
                entry[f"{field_name}__sum"] = numeric_sums[field_name]
                entry[f"{field_name}__count"] = numeric_counts[field_name]
                entry[f"{field_name}__avg"] = numeric_sums[field_name] / numeric_counts[field_name]
                entry[f"{field_name}__min"] = numeric_mins[field_name]
                entry[f"{field_name}__max"] = numeric_maxs[field_name]

            entry["__record_count"] = len(records)
            rows.append(entry)

        return rows
