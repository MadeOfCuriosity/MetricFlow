"""
Universal CSV & Excel Importer Service for Visualize.

Supports multiple data layouts:
1. Columnar / Time-Series:
   Date, [Room], Revenue, Signups, Churn, ...
   2026-01-01, School A, 1000, 15, 2
2. Financial Statements / Key-Value Reports (P&L, Balance Sheet, Zoho, QuickBooks):
   Header metadata: Company, P&L, Period 01-June-2026 to 30-June-2026
   Sales, 26996
   Cost of Service, 7804
   Gross Profit, 19192
   Operating Expenses, 4654
   Net Earnings, 14538
3. Matrix / Transposed:
   field, [room], 2026-01-01, 2026-01-02, ...
   revenue, School A, 1000, 1200
4. Long / Normalized (EAV):
   date, [room], field_name, value
5. Transactional Logs:
   timestamp, [room], amount, ... (aggregated daily via sum/avg/count/latest)
"""

import calendar
import csv
import io
import re
from collections import Counter
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Set, Tuple
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.data_field import DataField
from app.models.room import Room
from app.models.user import User
from app.models.organization import Organization
from app.schemas.data_fields import (
    CSVAnalysisResponse,
    CSVColumnMappingConfig,
    CSVFieldMapping,
    CSVImportResponse,
    CSVLayoutType,
    FieldEntryInput,
)
from app.services.entry_service import EntryService


DATE_FORMATS = [
    ("%Y-%m-%d", r"^\d{4}-\d{1,2}-\d{1,2}$"),
    ("%Y/%m/%d", r"^\d{4}/\d{1,2}/\d{1,2}$"),
    ("%d/%m/%Y", r"^\d{1,2}/\d{1,2}/\d{4}$"),
    ("%d-%m-%Y", r"^\d{1,2}-\d{1,2}-\d{4}$"),
    ("%m/%d/%Y", r"^\d{1,2}/\d{1,2}/\d{4}$"),
    ("%m-%d-%Y", r"^\d{1,2}-\d{1,2}-\d{4}$"),
    ("%Y-%m-%d %H:%M:%S", r"^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$"),
    ("%Y-%m-%dT%H:%M:%S", r"^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{2}(:\d{2})?"),
]

DATE_HEADER_KEYWORDS = {
    "date", "day", "timestamp", "time", "created_at", "entry_date", "period", "month_day"
}
ROOM_HEADER_KEYWORDS = {
    "room", "room_name", "branch", "location", "department", "school", "center", "campus"
}
FIELD_HEADER_KEYWORDS = {
    "field", "field_name", "name", "data_field", "metric", "metric_name", "kpi", "variable", "account", "particulars", "description"
}
VALUE_HEADER_KEYWORDS = {
    "value", "amount", "total", "metric_value", "count", "score", "measure", "balance", "debit", "credit", "net"
}

STATEMENT_KEYWORDS = {
    "profit", "loss", "income", "expense", "revenue", "sales", "earnings", "gross profit", "net profit", "cogs", "statement", "balance sheet"
}

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
    "aug": 8, "august": 8, "sep": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12
}


class UniversalCSVImporter:

    @staticmethod
    def decode_csv_bytes(contents: bytes) -> str:
        """Decode raw CSV bytes handling UTF-8 with BOM, UTF-8, Latin-1, and normalize all line breaks."""
        text = ""
        for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
            try:
                text = contents.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        if not text:
            text = contents.decode("utf-8", errors="replace")

        # Normalize linebreaks: convert \r\n and standalone \r (classic Mac/Excel) to standard \n
        return text.replace("\r\n", "\n").replace("\r", "\n")

    @staticmethod
    def is_excel_file(filename: Optional[str], contents: bytes) -> bool:
        """Checks whether the file is an Excel spreadsheet."""
        if filename and any(filename.lower().endswith(ext) for ext in (".xlsx", ".xlsm", ".xltx", ".xltm")):
            return True
        return contents[:4] == b"PK\x03\x04"

    @staticmethod
    def get_excel_sheets(contents: bytes) -> List[str]:
        """Extracts sheet names from an Excel file."""
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
            return wb.sheetnames
        except Exception:
            return []

    @staticmethod
    def _typical_row_width(rows: List[List[str]], sample_size: int = 15) -> int:
        """Most common cell-count among the first `sample_size` rows. Used to spot banner/title rows."""
        lengths = [len(r) for r in rows[:sample_size] if r]
        if not lengths:
            return 0
        return Counter(lengths).most_common(1)[0][0]

    @classmethod
    def find_header_row_index(cls, rows: List[List[str]], scan_limit: int = 10) -> int:
        """
        Structurally locates the header row: the first row (within scan_limit) whose
        width is close to the table's typical column width. Narrower rows above it
        (report titles, banner text, section labels) are treated as skippable and
        never chosen as the header.

        Deliberately does NOT treat "looks like a date" as evidence for header-ness \u2014
        a header cell containing a literal date is evidence AGAINST it being the
        header, not for it (that was the source of the original bug: a data row like
        "2026-01-01,100,5" would outscore the real "Date,Revenue,Signups" header
        because it had a parseable date in it).
        """
        if not rows:
            return 0
        typical_width = cls._typical_row_width(rows)
        if typical_width <= 1:
            return 0
        threshold = max(2, round(typical_width * 0.6))
        for idx, row in enumerate(rows[:scan_limit]):
            if len(row) >= threshold:
                return idx
        return 0

    @classmethod
    def excel_sheet_to_rows_detailed(
        cls, contents: bytes, sheet_name: Optional[str] = None, header_row_index: Optional[int] = None
    ) -> Tuple[List[str], List[List[str]], int, List[List[str]]]:
        """
        Converts an Excel sheet into structured header/data rows.
        Returns (header, data_rows, header_row_index, skipped_rows_before_header).
        Pass `header_row_index` to force a specific row instead of auto-detecting.
        """
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            if sheet_name and sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
            else:
                ws = wb.active

            raw_rows: List[List[str]] = []
            for row in ws.iter_rows(values_only=True):
                if any(cell is not None and str(cell).strip() != "" for cell in row):
                    str_row = [str(cell).strip() if cell is not None else "" for cell in row]
                    while str_row and str_row[-1] == "":
                        str_row.pop()
                    if str_row:
                        raw_rows.append(str_row)

            if not raw_rows:
                return [], [], 0, []

            header_idx = (
                header_row_index
                if header_row_index is not None and 0 <= header_row_index < len(raw_rows)
                else cls.find_header_row_index(raw_rows)
            )

            return raw_rows[header_idx], raw_rows[header_idx + 1:], header_idx, raw_rows[:header_idx]
        except Exception:
            return [], [], 0, []

    @classmethod
    def excel_sheet_to_rows(cls, contents: bytes, sheet_name: Optional[str] = None) -> Tuple[List[str], List[List[str]]]:
        """Backwards-compatible wrapper: converts an Excel sheet into header + data rows."""
        header, data_rows, _, _ = cls.excel_sheet_to_rows_detailed(contents, sheet_name)
        return header, data_rows

    @classmethod
    def parse_csv_rows_detailed(
        cls, text: str, header_row_index: Optional[int] = None
    ) -> Tuple[List[str], List[List[str]], str, int, List[List[str]]]:
        """
        Detects delimiter and extracts header and clean data rows.
        Normalizes line endings and filters out empty lines.
        Returns (header, data_rows, delimiter, header_row_index, skipped_rows_before_header).
        Pass `header_row_index` to force a specific row instead of auto-detecting.
        """
        # Ensure newlines are normalized
        normalized_text = text.replace("\r\n", "\n").replace("\r", "\n")
        sample = normalized_text[:4096]
        delimiter = ","
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
            delimiter = dialect.delimiter
        except Exception:
            first_line = normalized_text.split("\n", 1)[0]
            counts = {sep: first_line.count(sep) for sep in [",", ";", "\t", "|"]}
            best_sep = max(counts, key=counts.get)
            if counts[best_sep] > 0:
                delimiter = best_sep

        try:
            reader = csv.reader(io.StringIO(normalized_text), delimiter=delimiter)
            raw_rows = [row for row in reader if any(cell.strip() for cell in row)]
        except Exception:
            lines = [l.strip() for l in normalized_text.split("\n") if l.strip()]
            raw_rows = [[c.strip() for c in l.split(delimiter)] for l in lines]

        if not raw_rows:
            return [], [], delimiter, 0, []

        # Filter out trailing empty cells in each row
        cleaned_rows = []
        for r in raw_rows:
            str_row = [cell.strip().replace("\ufeff", "") for cell in r]
            while str_row and str_row[-1] == "":
                str_row.pop()
            if str_row:
                cleaned_rows.append(str_row)

        if not cleaned_rows:
            return [], [], delimiter, 0, []

        header_idx = (
            header_row_index
            if header_row_index is not None and 0 <= header_row_index < len(cleaned_rows)
            else cls.find_header_row_index(cleaned_rows)
        )

        header = cleaned_rows[header_idx]
        data_rows = cleaned_rows[header_idx + 1:]
        skipped_rows = cleaned_rows[:header_idx]

        return header, data_rows, delimiter, header_idx, skipped_rows

    @classmethod
    def parse_csv_rows(cls, text: str) -> Tuple[List[str], List[List[str]], str]:
        """Backwards-compatible wrapper: returns (header, data_rows, delimiter)."""
        header, data_rows, delimiter, _, _ = cls.parse_csv_rows_detailed(text)
        return header, data_rows, delimiter

    @staticmethod
    def parse_number(val: Any) -> Optional[float]:
        """Cleans and converts raw string to float (handles currencies, percent, commas, parentheses)."""
        if val is None:
            return None
        s = str(val).strip()
        if not s or s.lower() in ("null", "none", "nan", "n/a", "-", "—", ""):
            return None

        is_negative = False
        if s.startswith("(") and s.endswith(")"):
            is_negative = True
            s = s[1:-1].strip()

        # Remove currency symbols ($ € £ ₹ ¥ AED etc), %, and thousand separators
        cleaned = re.sub(r"[^\d.\-+eE]", "", s)
        if not cleaned or cleaned in ("-", "+", "."):
            return None

        try:
            num = float(cleaned)
            return -num if is_negative and num > 0 else num
        except ValueError:
            return None

    @classmethod
    def parse_date_value(cls, val: str, preferred_format: Optional[str] = None) -> Optional[date]:
        """Attempts to parse a string into a datetime.date object."""
        if not val or not val.strip():
            return None
        s = val.strip()

        # 1. Try ISO direct fromisoformat
        try:
            s_date_part = s.split("T")[0].split(" ")[0]
            return date.fromisoformat(s_date_part)
        except (ValueError, TypeError):
            pass

        # 2. Try preferred format if specified
        if preferred_format:
            try:
                return datetime.strptime(s, preferred_format).date()
            except ValueError:
                pass

        # 3. Try standard candidate formats
        for fmt, pattern in DATE_FORMATS:
            try:
                if re.search(pattern, s):
                    return datetime.strptime(s[:19], fmt).date()
            except (ValueError, TypeError):
                continue

        # 4. Try DD-MONTH-YYYY or MONTH-DD-YYYY (e.g., 30-JUNE-2026 or 30-Jun-2026)
        match_named_mon = re.search(r"^(\d{1,2})[-/\s]([A-Za-z]+)[-/\s](\d{4})$", s)
        if match_named_mon:
            d_val, m_str, y_val = int(match_named_mon.group(1)), match_named_mon.group(2).lower(), int(match_named_mon.group(3))
            m_num = MONTH_MAP.get(m_str, MONTH_MAP.get(m_str[:3]))
            if m_num:
                try:
                    return date(y_val, m_num, d_val)
                except Exception:
                    pass

        # 5. Try basic slash/dash variations: DD/MM/YYYY vs MM/DD/YYYY
        parts = re.split(r"[/.\-]", s)
        if len(parts) == 3:
            try:
                p0, p1, p2 = int(parts[0]), int(parts[1]), int(parts[2])
                if p0 > 1000:  # YYYY/MM/DD
                    return date(p0, p1, p2)
                elif p2 > 1000:  # DD/MM/YYYY or MM/DD/YYYY
                    if p0 > 12:
                        return date(p2, p1, p0)
                    elif p1 > 12:
                        return date(p2, p0, p1)
                    else:
                        return date(p2, p1, p0)
            except Exception:
                pass

        # 6. Try MONTH-YYYY or YYYY-MONTH (e.g., 'Sep-2025', 'Jun-2026', '2026-06')
        match_my1 = re.search(r"^([A-Za-z]{3,9})[-/\s](\d{4})$", s)
        if match_my1:
            m_str, y_val = match_my1.group(1).lower(), int(match_my1.group(2))
            m_num = MONTH_MAP.get(m_str, MONTH_MAP.get(m_str[:3]))
            if m_num:
                last_day = calendar.monthrange(y_val, m_num)[1]
                return date(y_val, m_num, last_day)

        match_my2 = re.search(r"^(\d{4})[-/\s]([A-Za-z]{3,9})$", s)
        if match_my2:
            y_val, m_str = int(match_my2.group(1)), match_my2.group(2).lower()
            m_num = MONTH_MAP.get(m_str, MONTH_MAP.get(m_str[:3]))
            if m_num:
                last_day = calendar.monthrange(y_val, m_num)[1]
                return date(y_val, m_num, last_day)

        # Try YYYY-MM
        match_ym = re.search(r"^(\d{4})[-/](\d{1,2})$", s)
        if match_ym:
            y_val, m_num = int(match_ym.group(1)), int(match_ym.group(2))
            if 1 <= m_num <= 12:
                last_day = calendar.monthrange(y_val, m_num)[1]
                return date(y_val, m_num, last_day)

        return None

    @classmethod
    def resolve_column_date_format(cls, values: List[str]) -> Optional[str]:
        """
        Scans a whole date column once to lock a single DD/MM vs MM/DD interpretation
        for every row in it, instead of guessing per-cell (which can silently parse
        '03/04/2026' as one thing on row 5 and the opposite thing on row 40).

        If any value has a first-component > 12, the column must be DD/MM/YYYY.
        If any value has a second-component > 12, the column must be MM/DD/YYYY.
        Otherwise the format is genuinely ambiguous from the data alone and we
        leave it to the existing per-cell fallback (which defaults to DD/MM).
        """
        saw_first_over_12 = False
        saw_second_over_12 = False
        separator = "/"
        for v in values:
            if not v or not v.strip():
                continue
            s = v.strip()
            if re.match(r"^\d{4}", s):
                continue  # already unambiguous (ISO-style / year-first)
            sep_match = re.search(r"[/.\-]", s)
            if sep_match:
                separator = sep_match.group(0)
            parts = re.split(r"[/.\-]", s)
            if len(parts) != 3:
                continue
            try:
                p0, p1 = int(parts[0]), int(parts[1])
            except ValueError:
                continue
            if p0 > 12:
                saw_first_over_12 = True
            if p1 > 12:
                saw_second_over_12 = True

        if saw_first_over_12 and not saw_second_over_12:
            return f"%d{separator}%m{separator}%Y"
        if saw_second_over_12 and not saw_first_over_12:
            return f"%m{separator}%d{separator}%Y"
        return None

    @classmethod
    def extract_statement_period_date(cls, text_or_rows: Any) -> Optional[date]:
        """
        Extracts reporting period date from title headers like:
        'FOR THE PERIOD OF 01-JUNE-2026 TO 30-JUNE-2026' -> date(2026, 6, 30)
        'Period Ended 31-Dec-2025' -> date(2025, 12, 31)
        """
        text = ""
        if isinstance(text_or_rows, str):
            text = text_or_rows[:2048]
        elif isinstance(text_or_rows, list):
            text = " ".join(" ".join(r) for r in text_or_rows[:6])

        # Match 'TO DD-MONTH-YYYY'
        match = re.search(
            r"(?:to|ended|through|until|as of)\s*(?:of)?\s*(\d{1,2})[-/\s]([A-Za-z]+)[-/\s](\d{4})",
            text,
            re.IGNORECASE,
        )
        if match:
            day, mon_str, year = int(match.group(1)), match.group(2).lower(), int(match.group(3))
            mon = MONTH_MAP.get(mon_str, MONTH_MAP.get(mon_str[:3], 1))
            try:
                return date(year, mon, day)
            except Exception:
                pass

        # Match 'DD-MONTH-YYYY'
        match_dmy = re.search(r"\b(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{4})\b", text)
        if match_dmy:
            day, mon_str, year = int(match_dmy.group(1)), match_dmy.group(2).lower(), int(match_dmy.group(3))
            mon = MONTH_MAP.get(mon_str, MONTH_MAP.get(mon_str[:3]))
            if mon:
                try:
                    return date(year, mon, day)
                except Exception:
                    pass

        # Match 'MONTH YYYY'
        match_my = re.search(r"\b([A-Za-z]{3,9})[-/\s](\d{4})\b", text)
        if match_my:
            mon_str, year = match_my.group(1).lower(), int(match_my.group(2))
            mon = MONTH_MAP.get(mon_str, MONTH_MAP.get(mon_str[:3]))
            if mon:
                last_day = calendar.monthrange(year, mon)[1]
                return date(year, mon, last_day)

        return None

    @classmethod
    def detect_layout_and_columns(
        cls, header: List[str], sample_rows: List[List[str]], full_text: str = ""
    ) -> Tuple[CSVLayoutType, Optional[str], Optional[str], List[str], Optional[str], Optional[date]]:
        """
        Auto-detects CSV layout type, date column, room column, metric columns, value column, and statement date.
        Returns: (layout_type, date_col, room_col, metric_cols, value_col, statement_date)
        """
        if not header:
            return CSVLayoutType.COLUMNAR, None, None, [], None, None

        header_lower = [h.lower() for h in header]
        extracted_stmt_date = cls.extract_statement_period_date(full_text or header)

        # 1. Check for Matrix layout (rows are fields, columns are dates)
        date_candidates = []
        for idx, h in enumerate(header):
            if h and cls.parse_date_value(h):
                date_candidates.append((idx, h))

        if len(date_candidates) >= 2 or (header_lower and header_lower[0] in FIELD_HEADER_KEYWORDS and len(date_candidates) >= 1):
            room_col = None
            first_date_idx = date_candidates[0][0] if date_candidates else 1
            for idx in range(first_date_idx):
                if header_lower[idx] in ROOM_HEADER_KEYWORDS or "room" in header_lower[idx]:
                    room_col = header[idx]
                    break
            return CSVLayoutType.MATRIX, None, room_col, [], None, None

        # 2. Check for Date Column
        date_col_idx: Optional[int] = None
        for idx, h in enumerate(header_lower):
            if h in DATE_HEADER_KEYWORDS or any(k in h for k in ("date", "timestamp", "time", "day", "created_at")):
                date_col_idx = idx
                break

        if date_col_idx is None and sample_rows:
            col_date_counts = [0] * len(header)
            for row in sample_rows[:10]:
                for col_idx, cell in enumerate(row):
                    if col_idx < len(col_date_counts) and cls.parse_date_value(cell):
                        col_date_counts[col_idx] += 1
            max_dates = max(col_date_counts) if col_date_counts else 0
            if max_dates >= max(1, len(sample_rows[:10]) // 2):
                date_col_idx = col_date_counts.index(max_dates)

        date_col = header[date_col_idx] if date_col_idx is not None else None

        # 3. Check for Room Column
        room_col: Optional[str] = None
        for idx, h in enumerate(header_lower):
            if idx != date_col_idx and (h in ROOM_HEADER_KEYWORDS or "room" in h):
                room_col = header[idx]
                break

        # 4. If Date column exists: Long, Columnar, or Transactional
        if date_col_idx is not None:
            # Check for Long / Normalized (EAV) layout
            field_col_idx: Optional[int] = None
            value_col_idx: Optional[int] = None
            for idx, h in enumerate(header_lower):
                if idx in (date_col_idx,):
                    continue
                if h in FIELD_HEADER_KEYWORDS or "field" in h or "metric" in h:
                    field_col_idx = idx
                elif h in VALUE_HEADER_KEYWORDS or "value" in h or "amount" in h:
                    value_col_idx = idx

            if field_col_idx is not None and value_col_idx is not None:
                return (
                    CSVLayoutType.LONG,
                    date_col,
                    room_col,
                    [header[field_col_idx]],
                    header[value_col_idx],
                    None,
                )

            # Columnar vs Transactional
            metric_cols: List[str] = []
            for idx, h in enumerate(header):
                if (date_col and h == date_col) or (room_col and h == room_col):
                    continue
                numeric_count = 0
                total_checked = 0
                for row in sample_rows[:15]:
                    if idx < len(row) and row[idx].strip():
                        total_checked += 1
                        if cls.parse_number(row[idx]) is not None:
                            numeric_count += 1
                if total_checked == 0 or (numeric_count / total_checked >= 0.4):
                    metric_cols.append(h)

            sample_dates = [
                cls.parse_date_value(row[date_col_idx])
                for row in sample_rows[:20]
                if date_col_idx < len(row) and row[date_col_idx].strip()
            ]
            valid_sample_dates = [d for d in sample_dates if d is not None]
            if len(valid_sample_dates) > len(set(valid_sample_dates)):
                return CSVLayoutType.TRANSACTIONAL, date_col, room_col, metric_cols, None, None

            return CSVLayoutType.COLUMNAR, date_col, room_col, metric_cols, None, None

        # 5. If NO Date column exists -> Financial Statement / Key-Value Report layout
        return (
            CSVLayoutType.STATEMENT,
            None,
            None,
            [header[0]],
            header[-1] if len(header) > 1 else None,
            extracted_stmt_date or date.today(),
        )


    @classmethod
    def analyze_file(
        cls,
        contents: bytes,
        filename: Optional[str],
        org: Organization,
        db: Session,
        sheet_name: Optional[str] = None,
        header_row_index: Optional[int] = None,
    ) -> CSVAnalysisResponse:
        """
        Analyzes uploaded CSV or Excel file, auto-detecting sheets and layout structure.
        Pass `header_row_index` to override auto-detection with a user-picked row
        (0-indexed among the non-blank rows of the file/sheet).
        """
        sheets: List[str] = []
        selected_sheet: Optional[str] = sheet_name

        if cls.is_excel_file(filename, contents):
            sheets = cls.get_excel_sheets(contents)
            if sheets:
                selected_sheet = sheet_name if sheet_name in sheets else sheets[0]
                header, data_rows, detected_header_idx, skipped_rows = cls.excel_sheet_to_rows_detailed(
                    contents, selected_sheet, header_row_index
                )
                delimiter = ","
                full_text = " ".join(" ".join(r) for r in ([header] + data_rows[:10]))
            else:
                text = cls.decode_csv_bytes(contents)
                header, data_rows, delimiter, detected_header_idx, skipped_rows = cls.parse_csv_rows_detailed(
                    text, header_row_index
                )
                full_text = text[:4096]
        else:
            text = cls.decode_csv_bytes(contents)
            header, data_rows, delimiter, detected_header_idx, skipped_rows = cls.parse_csv_rows_detailed(
                text, header_row_index
            )
            full_text = text[:4096]

        if not header:
            return CSVAnalysisResponse(
                detected_layout=CSVLayoutType.COLUMNAR,
                delimiter=delimiter,
                total_rows=0,
                headers=[],
                preview_rows=[],
                suggested_date_column=None,
                suggested_room_column=None,
                suggested_statement_date=None,
                suggested_field_mappings=[],
                unmatched_columns=[],
                sheets=sheets,
                selected_sheet=selected_sheet,
                header_row_index=0,
                rows_before_header=[],
            )

        layout, date_col, room_col, metric_cols, value_col, stmt_date = cls.detect_layout_and_columns(
            header, data_rows[:25], full_text
        )

        org_fields = db.query(DataField).filter(DataField.org_id == org.id).all()
        field_by_var = {f.variable_name.lower(): f for f in org_fields}
        field_by_name = {f.name.lower(): f for f in org_fields}

        suggested_mappings: List[CSVFieldMapping] = []

        if layout == CSVLayoutType.STATEMENT:
            # Each row with a valid metric name is mapped
            seen_items = set()
            for r in data_rows:
                if not r or not r[0].strip():
                    continue
                item_name = r[0].strip()
                # Check if row has a number
                has_val = any(cls.parse_number(c) is not None for c in r[1:])
                if has_val and item_name not in seen_items:
                    seen_items.add(item_name)
                    item_var = item_name.lower().replace(" ", "_").replace("-", "_")
                    matched = field_by_var.get(item_var) or field_by_name.get(item_name.lower())
                    suggested_mappings.append(
                        CSVFieldMapping(
                            source_column=item_name,
                            target_field_id=str(matched.id) if matched else None,
                            target_field_name=matched.name if matched else item_name,
                            action="map" if matched else "create",
                        )
                    )

        elif layout == CSVLayoutType.MATRIX:
            seen_row_fields = set()
            skip_row_names = {"account", "account code", "total", "sub total", "subtotal", "grand total", "net total", "particulars", "description", "line item"}
            date_cols = [idx for idx, h in enumerate(header) if cls.parse_date_value(h)]

            for r in data_rows[:100]:
                if not r or not r[0].strip():
                    continue
                fname = r[0].strip()
                if fname.lower() in skip_row_names:
                    continue
                # Ensure row has at least one numeric cell
                has_num = any(col < len(r) and cls.parse_number(r[col]) is not None for col in date_cols) if date_cols else any(cls.parse_number(c) is not None for c in r[1:])
                if not has_num:
                    continue
                if fname not in seen_row_fields:
                    seen_row_fields.add(fname)
                    matched = field_by_var.get(fname.lower()) or field_by_name.get(fname.lower())
                    suggested_mappings.append(
                        CSVFieldMapping(
                            source_column=fname,
                            target_field_id=str(matched.id) if matched else None,
                            target_field_name=matched.name if matched else fname.replace("_", " ").title(),
                            action="map" if matched else "create",
                        )
                    )
        elif layout == CSVLayoutType.LONG:
            suggested_mappings.append(
                CSVFieldMapping(
                    source_column=metric_cols[0] if metric_cols else "field",
                    target_field_id=None,
                    target_field_name=value_col or "Value",
                    action="map",
                )
            )
        else:
            for col in metric_cols:
                col_clean = col.strip()
                col_var = col_clean.lower().replace(" ", "_").replace("-", "_")
                matched = field_by_var.get(col_var) or field_by_name.get(col_clean.lower())
                suggested_mappings.append(
                    CSVFieldMapping(
                        source_column=col_clean,
                        target_field_id=str(matched.id) if matched else None,
                        target_field_name=matched.name if matched else col_clean.replace("_", " ").title(),
                        action="map" if matched else "create",
                    )
                )

        preview_rows = data_rows[:6]

        return CSVAnalysisResponse(
            detected_layout=layout,
            delimiter=delimiter,
            total_rows=len(data_rows),
            headers=header,
            preview_rows=preview_rows,
            suggested_date_column=date_col,
            suggested_room_column=room_col,
            suggested_statement_date=stmt_date.isoformat() if stmt_date else None,
            suggested_field_mappings=suggested_mappings,
            unmatched_columns=[],
            sheets=sheets,
            selected_sheet=selected_sheet,
            header_row_index=detected_header_idx,
            rows_before_header=skipped_rows[-3:],
        )

    @classmethod
    def import_file(
        cls,
        contents: bytes,
        filename: Optional[str],
        user: User,
        org: Organization,
        db: Session,
        config: Optional[CSVColumnMappingConfig] = None,
    ) -> CSVImportResponse:
        """
        Universally transforms and imports CSV or Excel files across all layouts.
        """
        sheet_name = config.sheet_name if config else None
        header_row_index = config.header_row_index if config else None

        if cls.is_excel_file(filename, contents):
            header, data_rows, _, _ = cls.excel_sheet_to_rows_detailed(contents, sheet_name, header_row_index)
            full_text = " ".join(" ".join(r) for r in ([header] + data_rows[:10]))
        else:
            text = cls.decode_csv_bytes(contents)
            header, data_rows, _, _, _ = cls.parse_csv_rows_detailed(text, header_row_index)
            full_text = text[:4096]

        if not header or not data_rows:
            return CSVImportResponse(
                rows_processed=0,
                entries_created=0,
                fields_created=[],
                kpis_recalculated=0,
                errors=[{"row": 0, "error": "Document must have at least one header row and data rows"}],
                unmatched_columns=[],
            )

        # 1. Layout determination
        if config is None:
            layout, date_col, room_col, metric_cols, value_col, stmt_date = cls.detect_layout_and_columns(
                header, data_rows[:25], full_text
            )
            config = CSVColumnMappingConfig(
                layout=layout,
                date_column=date_col,
                room_column=room_col,
                field_column=metric_cols[0] if layout == CSVLayoutType.LONG and metric_cols else None,
                value_column=value_col,
                statement_date=stmt_date.isoformat() if stmt_date else date.today().isoformat(),
                field_mappings=[
                    CSVFieldMapping(source_column=c, target_field_name=c.replace("_", " ").title(), action="auto")
                    for c in metric_cols
                ],
                aggregation="sum",
            )
        else:
            layout = config.layout

        # 2. Lookup caches
        org_fields = db.query(DataField).filter(DataField.org_id == org.id).all()
        var_map: Dict[str, DataField] = {f.variable_name.lower(): f for f in org_fields}
        name_map: Dict[str, DataField] = {f.name.lower(): f for f in org_fields}
        id_map: Dict[str, DataField] = {str(f.id): f for f in org_fields}

        org_rooms = db.query(Room).filter(Room.org_id == org.id).all()
        room_name_map: Dict[str, Room] = {r.name.lower(): r for r in org_rooms}

        fields_created_names: List[str] = []
        errors: List[dict] = []
        unmatched_columns: List[str] = []

        def get_or_create_field(field_identifier: str, target_id: Optional[str] = None) -> Optional[DataField]:
            if target_id and target_id in id_map:
                return id_map[target_id]

            raw_name = field_identifier.strip()
            if not raw_name:
                return None

            clean_var = re.sub(r"[^\w]+", "_", raw_name.lower()).strip("_")
            if not clean_var:
                clean_var = "field_" + str(uuid4())[:8]

            if clean_var in var_map:
                return var_map[clean_var]
            if raw_name.lower() in name_map:
                return name_map[raw_name.lower()]

            display_name = raw_name.replace("_", " ").title()
            new_field = DataField(
                id=uuid4(),
                org_id=org.id,
                name=display_name,
                variable_name=clean_var,
                entry_interval="daily",
                created_by=user.id,
            )
            db.add(new_field)
            db.flush()

            var_map[clean_var] = new_field
            name_map[display_name.lower()] = new_field
            id_map[str(new_field.id)] = new_field
            fields_created_names.append(display_name)
            return new_field

        aggregated_values: Dict[Tuple[date, UUID, Optional[UUID]], List[float]] = {}
        rows_processed = 0
        header_indices = {h.lower(): idx for idx, h in enumerate(header)}

        # ==========================================
        # CASE 1: FINANCIAL STATEMENT / KEY-VALUE REPORT
        # ==========================================
        if layout == CSVLayoutType.STATEMENT:
            target_date = (
                cls.parse_date_value(config.statement_date)
                if config.statement_date
                else (cls.extract_statement_period_date(full_text) or date.today())
            )

            # Target Room
            target_room: Optional[Room] = None
            if config.room_column:
                target_room = room_name_map.get(config.room_column.lower())

            mapping_lookup = {
                m.source_column.lower(): m for m in (config.field_mappings or [])
            }

            for row_num, row in enumerate(data_rows, start=2):
                if not row or not row[0].strip():
                    continue

                item_name = row[0].strip()

                # Find the value in the row (take last non-empty numeric cell)
                val_num: Optional[float] = None
                for cell in reversed(row[1:]):
                    if cell.strip():
                        val_num = cls.parse_number(cell)
                        if val_num is not None:
                            break

                if val_num is None:
                    continue

                m = mapping_lookup.get(item_name.lower())
                if m and m.action == "ignore":
                    continue

                target_id = m.target_field_id if m else None
                target_name = (m.target_field_name if m and m.target_field_name else item_name).strip()

                field_obj = get_or_create_field(target_name, target_id)
                if not field_obj:
                    continue

                rows_processed += 1
                key = (target_date, field_obj.id, target_room.id if target_room else None)
                aggregated_values.setdefault(key, []).append(val_num)

        # ==========================================
        # CASE 2: MATRIX / TRANSPOSED LAYOUT
        # ==========================================
        elif layout == CSVLayoutType.MATRIX:
            has_room_column = (
                len(header) > 1 and header[1].lower() in ("room", "room_name")
            ) or bool(config.room_column and config.room_column.lower() in header_indices)

            date_columns: List[Tuple[int, date]] = []
            for col_idx in range(len(header)):
                h_val = header[col_idx].strip()
                if not h_val:
                    continue
                parsed_d = cls.parse_date_value(h_val, config.date_format)
                if parsed_d:
                    date_columns.append((col_idx, parsed_d))
                elif col_idx >= (2 if has_room_column else 1):
                    unmatched_columns.append(h_val)

            if not date_columns:
                return CSVImportResponse(
                    rows_processed=0,
                    entries_created=0,
                    fields_created=[],
                    kpis_recalculated=0,
                    errors=[{"row": 1, "error": f"No valid date columns found in matrix header: {header}"}],
                    unmatched_columns=unmatched_columns,
                )

            skip_row_names = {"account", "account code", "total", "sub total", "subtotal", "grand total", "net total", "particulars", "description", "line item"}
            mapping_lookup = {
                m.source_column.lower(): m for m in (config.field_mappings or [])
            }

            for row_num, row in enumerate(data_rows, start=2):
                if not row or not row[0].strip():
                    continue

                field_name = row[0].strip()
                if field_name.lower() in skip_row_names:
                    continue

                # Ensure row has at least one valid numeric cell among the date columns
                if not any(col_idx < len(row) and cls.parse_number(row[col_idx]) is not None for col_idx, _ in date_columns):
                    continue

                m = mapping_lookup.get(field_name.lower())
                if m and m.action == "ignore":
                    continue

                target_id = m.target_field_id if m else None
                target_name = (m.target_field_name if m and m.target_field_name else field_name).strip()

                target_room = None
                if has_room_column and len(row) > 1 and row[1].strip():
                    room_cell = row[1].strip()
                    target_room = room_name_map.get(room_cell.lower())
                    if not target_room:
                        errors.append({"row": row_num, "error": f"Room not found: '{room_cell}'"})
                        continue

                field_obj = get_or_create_field(target_name, target_id)
                if not field_obj:
                    continue

                rows_processed += 1

                for col_idx, entry_date in date_columns:
                    if col_idx >= len(row):
                        continue
                    val_num = cls.parse_number(row[col_idx])
                    if val_num is None:
                        continue

                    key = (entry_date, field_obj.id, target_room.id if target_room else None)
                    aggregated_values.setdefault(key, []).append(val_num)

        # ==========================================
        # CASE 3: COLUMNAR / TIME-SERIES / TRANSACTIONAL
        # ==========================================
        elif layout in (CSVLayoutType.COLUMNAR, CSVLayoutType.TRANSACTIONAL):
            date_col_name = config.date_column or "date"
            date_col_idx = header_indices.get(date_col_name.lower())

            if date_col_idx is None:
                for idx, h in enumerate(header):
                    if h.lower() in DATE_HEADER_KEYWORDS or "date" in h.lower():
                        date_col_idx = idx
                        break

            if date_col_idx is None:
                return CSVImportResponse(
                    rows_processed=0,
                    entries_created=0,
                    fields_created=[],
                    kpis_recalculated=0,
                    errors=[{"row": 1, "error": "Could not identify Date column in header"}],
                    unmatched_columns=[],
                )

            room_col_idx: Optional[int] = None
            if config.room_column:
                room_col_idx = header_indices.get(config.room_column.lower())
            if room_col_idx is None:
                for idx, h in enumerate(header):
                    if idx != date_col_idx and h.lower() in ROOM_HEADER_KEYWORDS:
                        room_col_idx = idx
                        break

            field_col_map: Dict[int, DataField] = {}
            mapping_lookup = {
                m.source_column.lower(): m for m in (config.field_mappings or [])
            }

            for idx, h in enumerate(header):
                if idx in (date_col_idx, room_col_idx):
                    continue

                m = mapping_lookup.get(h.lower())
                if m and m.action == "ignore":
                    continue

                target_id = m.target_field_id if m else None
                target_name = (m.target_field_name if m and m.target_field_name else h).strip()
                field_obj = get_or_create_field(target_name, target_id)
                if field_obj:
                    field_col_map[idx] = field_obj

            # Lock a single DD/MM vs MM/DD interpretation for the whole date column
            # up front, rather than letting parse_date_value guess row-by-row.
            resolved_date_format = config.date_format or cls.resolve_column_date_format(
                [row[date_col_idx] for row in data_rows if date_col_idx < len(row)]
            )

            for row_num, row in enumerate(data_rows, start=2):
                if not row or date_col_idx >= len(row) or not row[date_col_idx].strip():
                    continue

                raw_date_str = row[date_col_idx].strip()
                entry_date = cls.parse_date_value(raw_date_str, resolved_date_format)
                if not entry_date:
                    errors.append({"row": row_num, "error": f"Invalid date format '{raw_date_str}'"})
                    continue

                rows_processed += 1

                target_room = None
                if room_col_idx is not None and room_col_idx < len(row) and row[room_col_idx].strip():
                    room_cell = row[room_col_idx].strip()
                    target_room = room_name_map.get(room_cell.lower())
                    if not target_room:
                        errors.append({"row": row_num, "error": f"Room not found: '{room_cell}'"})
                        continue

                for col_idx, field_obj in field_col_map.items():
                    if col_idx >= len(row):
                        continue
                    val_num = cls.parse_number(row[col_idx])
                    if val_num is None:
                        continue

                    key = (entry_date, field_obj.id, target_room.id if target_room else None)
                    aggregated_values.setdefault(key, []).append(val_num)

        # ==========================================
        # CASE 4: LONG / NORMALIZED (EAV)
        # ==========================================
        elif layout == CSVLayoutType.LONG:
            date_col_name = config.date_column or "date"
            date_col_idx = header_indices.get(date_col_name.lower(), 0)

            field_col_name = config.field_column or "field"
            field_col_idx = header_indices.get(field_col_name.lower(), 1)

            value_col_name = config.value_column or "value"
            value_col_idx = header_indices.get(value_col_name.lower(), 2)

            room_col_idx = None
            if config.room_column:
                room_col_idx = header_indices.get(config.room_column.lower())

            resolved_date_format = config.date_format or cls.resolve_column_date_format(
                [row[date_col_idx] for row in data_rows if date_col_idx < len(row)]
            )

            for row_num, row in enumerate(data_rows, start=2):
                if not row or date_col_idx >= len(row) or not row[date_col_idx].strip():
                    continue

                raw_date_str = row[date_col_idx].strip()
                entry_date = cls.parse_date_value(raw_date_str, resolved_date_format)
                if not entry_date:
                    errors.append({"row": row_num, "error": f"Invalid date format '{raw_date_str}'"})
                    continue

                if field_col_idx >= len(row) or not row[field_col_idx].strip():
                    continue
                field_name = row[field_col_idx].strip()

                if value_col_idx >= len(row) or not row[value_col_idx].strip():
                    continue
                val_num = cls.parse_number(row[value_col_idx])
                if val_num is None:
                    continue

                rows_processed += 1

                target_room = None
                if room_col_idx is not None and room_col_idx < len(row) and row[room_col_idx].strip():
                    room_cell = row[room_col_idx].strip()
                    target_room = room_name_map.get(room_cell.lower())
                    if not target_room:
                        errors.append({"row": row_num, "error": f"Room not found: '{room_cell}'"})
                        continue

                field_obj = get_or_create_field(field_name)
                if not field_obj:
                    continue

                key = (entry_date, field_obj.id, target_room.id if target_room else None)
                aggregated_values.setdefault(key, []).append(val_num)

        # 3. Apply Aggregations
        agg_method = (config.aggregation or "sum").lower()
        date_entries: Dict[date, List[FieldEntryInput]] = {}

        for (entry_date, field_id, _room_id), vals in aggregated_values.items():
            if not vals:
                continue

            if agg_method == "avg":
                final_val = sum(vals) / len(vals)
            elif agg_method == "min":
                final_val = min(vals)
            elif agg_method == "max":
                final_val = max(vals)
            elif agg_method == "count":
                final_val = float(len(vals))
            elif agg_method == "latest":
                final_val = vals[-1]
            else:  # sum
                final_val = sum(vals)

            date_entries.setdefault(entry_date, []).append(
                FieldEntryInput(data_field_id=field_id, value=round(final_val, 4))
            )

        # 4. Batch Persist via EntryService and recalculate dependent KPIs
        total_entries_created = 0
        total_kpis_recalculated = 0

        for entry_date in sorted(date_entries.keys()):
            field_inputs = date_entries[entry_date]
            created, kpis_recalc, batch_errors = EntryService.create_field_entries(
                db=db,
                org_id=org.id,
                user_id=user.id,
                entry_date=entry_date,
                field_entries=field_inputs,
            )
            total_entries_created += len(created)
            total_kpis_recalculated += kpis_recalc
            for err in batch_errors:
                errors.append({"row": 0, "error": f"{entry_date.isoformat()}: {err.get('error', 'Unknown error')}"})

        return CSVImportResponse(
            rows_processed=rows_processed,
            entries_created=total_entries_created,
            fields_created=list(dict.fromkeys(fields_created_names)),
            kpis_recalculated=total_kpis_recalculated,
            errors=errors,
            unmatched_columns=unmatched_columns,
        )

    @classmethod
    def analyze_csv(
        cls,
        text: str,
        org: Organization,
        db: Session,
    ) -> CSVAnalysisResponse:
        """Compatibility wrapper for analyzing text directly."""
        return cls.analyze_file(
            contents=text.encode("utf-8"),
            filename="data.csv",
            org=org,
            db=db,
        )

    @classmethod
    def import_csv(
        cls,
        text: str,
        user: User,
        org: Organization,
        db: Session,
        config: Optional[CSVColumnMappingConfig] = None,
    ) -> CSVImportResponse:
        """Compatibility wrapper for importing text directly."""
        return cls.import_file(
            contents=text.encode("utf-8"),
            filename="data.csv",
            user=user,
            org=org,
            db=db,
            config=config,
        )

