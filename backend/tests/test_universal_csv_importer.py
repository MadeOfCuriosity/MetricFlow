import unittest
from datetime import date
from unittest.mock import MagicMock
from uuid import uuid4

from app.schemas.data_fields import (
    CSVColumnMappingConfig,
    CSVFieldMapping,
    CSVLayoutType,
)
from app.services.universal_csv_importer import UniversalCSVImporter


class TestUniversalCSVParserUnits(unittest.TestCase):
    """Test unit helpers of UniversalCSVImporter."""


    def test_parse_number(self):
        assert UniversalCSVImporter.parse_number("123") == 123.0
        assert UniversalCSVImporter.parse_number("1,234.56") == 1234.56
        assert UniversalCSVImporter.parse_number("$5,000.00") == 5000.0
        assert UniversalCSVImporter.parse_number("€ 250.50") == 250.50
        assert UniversalCSVImporter.parse_number("₹ 99,999") == 99999.0
        assert UniversalCSVImporter.parse_number("45.5%") == 45.5
        assert UniversalCSVImporter.parse_number("(150.00)") == -150.0
        assert UniversalCSVImporter.parse_number("-200") == -200.0
        assert UniversalCSVImporter.parse_number("N/A") is None
        assert UniversalCSVImporter.parse_number("") is None
        assert UniversalCSVImporter.parse_number(None) is None

    def test_parse_date_value(self):
        assert UniversalCSVImporter.parse_date_value("2026-01-15") == date(2026, 1, 15)
        assert UniversalCSVImporter.parse_date_value("2026/01/15") == date(2026, 1, 15)
        assert UniversalCSVImporter.parse_date_value("15/01/2026") == date(2026, 1, 15)
        assert UniversalCSVImporter.parse_date_value("01/15/2026") == date(2026, 1, 15)
        assert UniversalCSVImporter.parse_date_value("2026-01-15 14:30:00") == date(2026, 1, 15)
        assert UniversalCSVImporter.parse_date_value("2026-01-15T18:45:00Z") == date(2026, 1, 15)
        assert UniversalCSVImporter.parse_date_value("not-a-date") is None

    def test_parse_csv_rows_with_different_delimiters(self):
        # Comma
        csv_comma = "Date,Revenue,Signups\n2026-01-01,100,5\n2026-01-02,150,8"
        header, rows, delim = UniversalCSVImporter.parse_csv_rows(csv_comma)
        assert header == ["Date", "Revenue", "Signups"]
        assert len(rows) == 2
        assert delim == ","

        # Semicolon
        csv_semi = "Date;Revenue;Signups\n2026-01-01;100;5\n2026-01-02;150;8"
        header, rows, delim = UniversalCSVImporter.parse_csv_rows(csv_semi)
        assert header == ["Date", "Revenue", "Signups"]
        assert len(rows) == 2
        assert delim == ";"

        # Tab
        csv_tab = "Date\tRevenue\tSignups\n2026-01-01\t100\t5\n2026-01-02\t150\t8"
        header, rows, delim = UniversalCSVImporter.parse_csv_rows(csv_tab)
        assert header == ["Date", "Revenue", "Signups"]
        assert len(rows) == 2
        assert delim == "\t"

    def test_detect_columnar_layout(self):
        header = ["Date", "Revenue", "New Signups", "CAC"]
        sample_rows = [
            ["2026-01-01", "5000", "25", "$120"],
            ["2026-01-02", "6000", "30", "$115"],
        ]
        layout, date_col, room_col, metric_cols, val_col, stmt_date = UniversalCSVImporter.detect_layout_and_columns(
            header, sample_rows
        )
        assert layout == CSVLayoutType.COLUMNAR
        assert date_col == "Date"
        assert room_col is None
        assert metric_cols == ["Revenue", "New Signups", "CAC"]

    def test_detect_matrix_layout(self):
        header = ["field", "room", "2026-01-01", "2026-01-02", "2026-01-03"]
        sample_rows = [
            ["revenue", "School A", "1000", "1200", "1500"],
            ["signups", "School A", "10", "15", "12"],
        ]
        layout, date_col, room_col, metric_cols, val_col, stmt_date = UniversalCSVImporter.detect_layout_and_columns(
            header, sample_rows
        )
        assert layout == CSVLayoutType.MATRIX
        assert room_col == "room"

    def test_detect_long_eav_layout(self):
        header = ["Date", "Field Name", "Value"]
        sample_rows = [
            ["2026-01-01", "revenue", "5000"],
            ["2026-01-01", "deals", "12"],
            ["2026-01-02", "revenue", "6000"],
        ]
        layout, date_col, room_col, metric_cols, val_col, stmt_date = UniversalCSVImporter.detect_layout_and_columns(
            header, sample_rows
        )
        assert layout == CSVLayoutType.LONG
        assert date_col == "Date"
        assert val_col == "Value"

    def test_detect_transactional_layout(self):
        header = ["Timestamp", "Order Amount", "Fee"]
        sample_rows = [
            ["2026-01-01 10:00:00", "100", "2.5"],
            ["2026-01-01 11:30:00", "200", "5.0"],
            ["2026-01-02 09:15:00", "150", "3.0"],
        ]
        layout, date_col, room_col, metric_cols, val_col, stmt_date = UniversalCSVImporter.detect_layout_and_columns(
            header, sample_rows
        )
        assert layout == CSVLayoutType.TRANSACTIONAL
        assert date_col == "Timestamp"
        assert "Order Amount" in metric_cols



class TestUniversalCSVImporterIntegration(unittest.TestCase):
    """Test import_csv and analyze_csv with mock session."""

    def setUp(self):
        self.user = MagicMock()
        self.user.id = uuid4()

        self.org = MagicMock()
        self.org.id = uuid4()

        self.db = MagicMock()
        self.db.query.return_value.filter.return_value.all.return_value = []

    def test_import_columnar_csv_auto_creates_fields_and_entries(self):
        csv_text = """Date,Gross Sales,New Leads
2026-01-01,$5,000,20
2026-01-02,$6,200,25
"""
        with unittest.mock.patch("app.services.entry_service.EntryService.create_field_entries") as mock_create:
            mock_create.return_value = (["entry1", "entry2"], 1, [])
            resp = UniversalCSVImporter.import_csv(
                text=csv_text,
                user=self.user,
                org=self.org,
                db=self.db,
            )

            assert resp.rows_processed == 2
            assert resp.entries_created == 4
            assert "Gross Sales" in resp.fields_created
            assert "New Leads" in resp.fields_created
            assert mock_create.call_count == 2

    def test_import_matrix_csv(self):
        csv_text = """field,2026-01-01,2026-01-02
Monthly Revenue,10000,12000
Deals Closed,5,7
"""
        with unittest.mock.patch("app.services.entry_service.EntryService.create_field_entries") as mock_create:
            mock_create.return_value = (["entry1", "entry2"], 2, [])
            resp = UniversalCSVImporter.import_csv(
                text=csv_text,
                user=self.user,
                org=self.org,
                db=self.db,
            )

            assert resp.rows_processed == 2
            assert resp.entries_created == 4
            assert "Monthly Revenue" in resp.fields_created
            assert mock_create.call_count == 2

    def test_import_long_eav_csv(self):
        csv_text = """Date,Metric Name,Value
2026-01-01,Revenue,5000
2026-01-01,Signups,10
2026-01-02,Revenue,6000
"""
        with unittest.mock.patch("app.services.entry_service.EntryService.create_field_entries") as mock_create:
            mock_create.return_value = (["entry1"], 1, [])
            config = CSVColumnMappingConfig(
                layout=CSVLayoutType.LONG,
                date_column="Date",
                field_column="Metric Name",
                value_column="Value",
            )
            resp = UniversalCSVImporter.import_csv(
                text=csv_text,
                user=self.user,
                org=self.org,
                db=self.db,
                config=config,
            )

            assert resp.rows_processed == 3
            assert resp.entries_created == 2  # 2 dates

    def test_import_transactional_aggregation_sum(self):
        csv_text = """Date,Amount
2026-01-01,100
2026-01-01,150
2026-01-02,300
"""
        with unittest.mock.patch("app.services.entry_service.EntryService.create_field_entries") as mock_create:
            mock_create.return_value = (["entry1"], 1, [])
            config = CSVColumnMappingConfig(
                layout=CSVLayoutType.TRANSACTIONAL,
                date_column="Date",
                aggregation="sum",
            )
            resp = UniversalCSVImporter.import_csv(
                text=csv_text,
                user=self.user,
                org=self.org,
                db=self.db,
                config=config,
            )

            assert resp.rows_processed == 3
            # Check arguments passed to create_field_entries
            calls = mock_create.call_args_list
            # Date 2026-01-01 should have sum value 250.0
            date_1_inputs = calls[0].kwargs["field_entries"]
            assert date_1_inputs[0].value == 250.0
            # Date 2026-01-02 should have value 300.0
            date_2_inputs = calls[1].kwargs["field_entries"]
            assert date_2_inputs[0].value == 300.0

    def test_extract_statement_period_date(self):
        text1 = "FOR THE PERIOD OF 01-JUNE-2026 TO 30-JUNE-2026"
        assert UniversalCSVImporter.extract_statement_period_date(text1) == date(2026, 6, 30)

        text2 = "Statement of Profit & Loss for period ended 31-Dec-2025"
        assert UniversalCSVImporter.extract_statement_period_date(text2) == date(2025, 12, 31)

        text3 = "P&L Report July 2026"
        assert UniversalCSVImporter.extract_statement_period_date(text3) == date(2026, 7, 31)

    def test_import_financial_statement_p_and_l(self):
        # Sample matching the user's Zoho P&L export with carriage returns and title banner
        raw_text = (
            "CREDO INTERNATIONAL DIGITAL DESIGNS - L.L.C - S.P.C,,,\r"
            "STATEMENT OF PROFIT OR LOSS AND OTHER COMPREHENSIVE INCOME,,,\r"
            "FOR THE PERIOD OF 01-JUNE-2026 TO 30-JUNE-2026,,,,,,,,,\r"
            "AED Operating Income,,,\r"
            "      Discount,,, (0)\r"
            "      Sales,,,\" 26,996 \"\r"
            "Total Operating Income,,,\" 26,996 \"\r"
            "Cost of Sales,,,\r"
            "      Cost of Service,,,\" 7,804 \"\r"
            "Total Cost of Goods Sold,,,\" 7,804 \"\r"
            "Gross Profit,,,\" 19,192 \"\r"
            "Operating Expense,,,\r"
            "      Accounting Fee,,, 600\r"
            "      Advertising And Marketing,,, 80\r"
            "Net Earnings,,,\" 14,538 \"\r"
        )
        with unittest.mock.patch("app.services.entry_service.EntryService.create_field_entries") as mock_create:
            mock_create.return_value = (["entry1"], 1, [])
            resp = UniversalCSVImporter.import_file(
                contents=raw_text.encode("utf-8"),
                filename="pnl.csv",
                user=self.user,
                org=self.org,
                db=self.db,
            )

            assert resp.rows_processed >= 6
            assert "Sales" in resp.fields_created
            assert "Gross Profit" in resp.fields_created
            assert "Net Earnings" in resp.fields_created

            # Verify that entry was created for statement date 2026-06-30
            calls = mock_create.call_args_list
            assert len(calls) == 1
            assert calls[0].kwargs["entry_date"] == date(2026, 6, 30)

    def test_import_multi_sheet_excel_xlsx(self):
        import openpyxl
        import io
        wb = openpyxl.Workbook()
        ws1 = wb.active
        ws1.title = "Revenue_Sheet"
        ws1.append(["Date", "Revenue", "Signups"])
        ws1.append(["2026-01-01", 5000, 20])
        ws1.append(["2026-01-02", 6000, 25])

        ws2 = wb.create_sheet(title="Expenses_Sheet")
        ws2.append(["Date", "Rent", "Salaries"])
        ws2.append(["2026-01-01", 1000, 3000])

        xlsx_io = io.BytesIO()
        wb.save(xlsx_io)
        xlsx_bytes = xlsx_io.getvalue()

        # 1. Test sheet discovery
        assert UniversalCSVImporter.is_excel_file("metrics.xlsx", xlsx_bytes) is True
        sheets = UniversalCSVImporter.get_excel_sheets(xlsx_bytes)
        assert sheets == ["Revenue_Sheet", "Expenses_Sheet"]

        # 2. Test analysis on specific sheet
        analysis = UniversalCSVImporter.analyze_file(
            contents=xlsx_bytes,
            filename="metrics.xlsx",
            sheet_name="Expenses_Sheet",
            org=self.org,
            db=self.db,
        )
        assert analysis.sheets == ["Revenue_Sheet", "Expenses_Sheet"]
        assert analysis.selected_sheet == "Expenses_Sheet"
        mapped_sources = [m.source_column for m in analysis.suggested_field_mappings]
        assert "Rent" in mapped_sources
        assert "Salaries" in mapped_sources

        # 3. Test import on specific sheet
        with unittest.mock.patch("app.services.entry_service.EntryService.create_field_entries") as mock_create:
            mock_create.return_value = (["entry1"], 1, [])
            config = CSVColumnMappingConfig(
                layout=CSVLayoutType.COLUMNAR,
                date_column="Date",
                sheet_name="Revenue_Sheet",
            )
            resp = UniversalCSVImporter.import_file(
                contents=xlsx_bytes,
                filename="metrics.xlsx",
                user=self.user,
                org=self.org,
                db=self.db,
                config=config,
            )
            assert resp.rows_processed == 2
            assert "Revenue" in resp.fields_created
            assert "Signups" in resp.fields_created
