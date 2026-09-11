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
        layout, date_col, room_col, metric_cols, val_col = UniversalCSVImporter.detect_layout_and_columns(
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
        layout, date_col, room_col, metric_cols, val_col = UniversalCSVImporter.detect_layout_and_columns(
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
        layout, date_col, room_col, metric_cols, val_col = UniversalCSVImporter.detect_layout_and_columns(
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
        layout, date_col, room_col, metric_cols, val_col = UniversalCSVImporter.detect_layout_and_columns(
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

