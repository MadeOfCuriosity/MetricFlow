"""Tests for per-field entry periods (weekly/monthly anchored on the field's start date)."""
from datetime import date

from app.services.entry_service import period_bounds


def test_daily_and_custom_use_the_exact_day():
    d = date(2026, 9, 24)
    assert period_bounds("daily", None, d) == (d, d)
    assert period_bounds("custom", date(2026, 1, 1), d) == (d, d)


def test_weekly_periods_count_from_start_date():
    start = date(2026, 9, 24)  # a Thursday
    assert period_bounds("weekly", start, date(2026, 9, 24)) == (date(2026, 9, 24), date(2026, 9, 30))
    assert period_bounds("weekly", start, date(2026, 9, 30)) == (date(2026, 9, 24), date(2026, 9, 30))
    assert period_bounds("weekly", start, date(2026, 10, 1)) == (date(2026, 10, 1), date(2026, 10, 7))


def test_monthly_periods_count_from_start_date():
    start = date(2026, 9, 15)
    assert period_bounds("monthly", start, date(2026, 9, 15)) == (date(2026, 9, 15), date(2026, 10, 14))
    assert period_bounds("monthly", start, date(2026, 10, 14)) == (date(2026, 9, 15), date(2026, 10, 14))
    assert period_bounds("monthly", start, date(2026, 10, 15)) == (date(2026, 10, 15), date(2026, 11, 14))
    assert period_bounds("monthly", start, date(2027, 1, 20)) == (date(2027, 1, 15), date(2027, 2, 14))


def test_monthly_start_on_31st_clamps_short_months():
    start = date(2026, 1, 31)
    assert period_bounds("monthly", start, date(2026, 2, 28)) == (date(2026, 2, 28), date(2026, 3, 30))
    assert period_bounds("monthly", start, date(2026, 3, 31)) == (date(2026, 3, 31), date(2026, 4, 29))
    assert period_bounds("monthly", start, date(2026, 2, 27)) == (date(2026, 1, 31), date(2026, 2, 27))


def test_before_start_date_is_not_started():
    assert period_bounds("weekly", date(2026, 9, 26), date(2026, 9, 25)) is None
    assert period_bounds("monthly", date(2026, 9, 26), date(2026, 9, 25)) is None


def test_legacy_fields_without_start_keep_monday_and_first_of_month():
    assert period_bounds("weekly", None, date(2026, 9, 24)) == (date(2026, 9, 21), date(2026, 9, 27))
    assert period_bounds("monthly", None, date(2026, 9, 24)) == (date(2026, 9, 1), date(2026, 9, 30))


# --- API flow: weekly / monthly / custom fields end-to-end (in-memory test DB) ---

from datetime import timedelta  # noqa: E402

from fastapi import status  # noqa: E402


def _auth(client, test_org_data):
    resp = client.post("/api/auth/register-org", json=test_org_data)
    assert resp.status_code == status.HTTP_201_CREATED
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _form_item(client, headers, interval, day):
    resp = client.get(f"/api/entries/fields/today?interval={interval}&date={day.isoformat()}", headers=headers)
    assert resp.status_code == 200
    return [f for room in resp.json()["rooms"] for f in room["fields"]]


def test_weekly_field_snaps_entries_to_its_period(client, test_org_data):
    headers = _auth(client, test_org_data)
    start = date.today() - timedelta(days=10)
    field = client.post(
        "/api/data-fields",
        json={"name": "Weekly Calls", "entry_interval": "weekly", "period_start_date": start.isoformat()},
        headers=headers,
    ).json()
    assert field["period_start_date"] == start.isoformat()

    # Entering on a mid-period day stores the value on the period start
    mid = start + timedelta(days=9)  # second week, 3rd day
    resp = client.post(
        "/api/entries/fields",
        json={"date": mid.isoformat(), "entries": [{"data_field_id": field["id"], "value": 42}]},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["entries"][0]["date"] == (start + timedelta(days=7)).isoformat()

    # Any day in that week shows it as done, with the period bounds
    [item] = _form_item(client, headers, "weekly", start + timedelta(days=13))
    assert item["has_entry_today"] is True and item["today_value"] == 42
    assert item["period_start"] == (start + timedelta(days=7)).isoformat()
    assert item["period_end"] == (start + timedelta(days=13)).isoformat()

    # The next week is pending again
    [item] = _form_item(client, headers, "weekly", start + timedelta(days=14))
    assert item["has_entry_today"] is False


def test_field_starting_tomorrow_is_not_due_yet(client, test_org_data):
    headers = _auth(client, test_org_data)
    tomorrow = date.today() + timedelta(days=1)
    field = client.post(
        "/api/data-fields",
        json={"name": "Monthly Revenue", "entry_interval": "monthly", "period_start_date": tomorrow.isoformat()},
        headers=headers,
    ).json()

    assert _form_item(client, headers, "monthly", date.today()) == []
    assert len(_form_item(client, headers, "monthly", tomorrow)) == 1

    resp = client.post(
        "/api/entries/fields",
        json={"date": date.today().isoformat(), "entries": [{"data_field_id": field["id"], "value": 1}]},
        headers=headers,
    )
    assert resp.json()["entries_created"] == 0
    assert "starts on" in resp.json()["errors"][0]["error"]


def test_periodic_field_defaults_start_to_today_and_custom_has_none(client, test_org_data):
    headers = _auth(client, test_org_data)
    weekly = client.post("/api/data-fields", json={"name": "W", "entry_interval": "weekly"}, headers=headers).json()
    custom = client.post("/api/data-fields", json={"name": "Big Sale", "entry_interval": "custom"}, headers=headers).json()
    assert weekly["period_start_date"] == date.today().isoformat()
    assert custom["period_start_date"] is None

    # Custom values land on the exact date picked
    day = date.today() - timedelta(days=3)
    resp = client.post(
        "/api/entries/fields",
        json={"date": day.isoformat(), "entries": [{"data_field_id": custom["id"], "value": 250000}]},
        headers=headers,
    )
    assert resp.json()["entries"][0]["date"] == day.isoformat()

    # Switching weekly -> daily clears the anchor
    updated = client.put(f"/api/data-fields/{weekly['id']}", json={"entry_interval": "daily"}, headers=headers).json()
    assert updated["period_start_date"] is None


def test_entry_form_includes_room_assignees_color_and_enterer(client, test_org_data):
    headers = _auth(client, test_org_data)
    room = client.post("/api/rooms", json={"name": "Sales", "color": "blue"}, headers=headers).json()
    invite = client.post(
        "/api/auth/invite-user",
        json={"email": "chloe@example.com", "name": "Chloe", "role": "room_admin", "role_label": "Rep", "room_ids": [room["id"]]},
        headers=headers,
    )
    assert invite.status_code == 201, invite.text
    field = client.post(
        "/api/data-fields", json={"name": "Deals", "room_ids": [room["id"]]}, headers=headers
    ).json()
    client.post(
        "/api/entries/fields",
        json={"date": date.today().isoformat(), "entries": [{"data_field_id": field["id"], "value": 3}]},
        headers=headers,
    )

    resp = client.get(f"/api/entries/fields/today?interval=daily&date={date.today().isoformat()}", headers=headers)
    [group] = [g for g in resp.json()["rooms"] if g["room_id"] == room["id"]]
    assert group["room_color"] == "blue"
    assert [a["name"] for a in group["assignees"]] == ["Chloe"]
    assert group["fields"][0]["entered_by_name"] == test_org_data["admin_name"]


def _pending(client, headers, days=30):
    resp = client.get(f"/api/entries/fields/pending?days={days}", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["items"]


def _backdate_field(db_session, field_id, days):
    from uuid import UUID
    from datetime import datetime, time
    from app.models import DataField
    f = db_session.get(DataField, UUID(field_id))
    f.created_at = datetime.combine(date.today() - timedelta(days=days), time(12))
    db_session.commit()


def test_pending_lists_missed_daily_days_newest_first(client, db_session, test_org_data):
    headers = _auth(client, test_org_data)
    field = client.post("/api/data-fields", json={"name": "Calls"}, headers=headers).json()
    _backdate_field(db_session, field["id"], 5)

    # Fill 2 days ago; the other past days stay pending, today is never pending
    two_ago = date.today() - timedelta(days=2)
    client.post("/api/entries/fields", json={"date": two_ago.isoformat(), "entries": [{"data_field_id": field["id"], "value": 1}]}, headers=headers)

    dates = [i["period_start"] for i in _pending(client, headers)]
    expected = [(date.today() - timedelta(days=n)).isoformat() for n in (1, 3, 4, 5)]
    assert dates == expected


def test_pending_weekly_only_after_period_ends_and_skips_no_schedule(client, db_session, test_org_data):
    headers = _auth(client, test_org_data)
    start = date.today() - timedelta(days=10)
    weekly = client.post("/api/data-fields", json={"name": "Weekly", "entry_interval": "weekly", "period_start_date": start.isoformat()}, headers=headers).json()
    custom = client.post("/api/data-fields", json={"name": "Big sale", "entry_interval": "custom"}, headers=headers).json()
    _backdate_field(db_session, weekly["id"], 20)
    _backdate_field(db_session, custom["id"], 20)

    items = _pending(client, headers)
    # First week (start..start+6) has ended; the current week (start+7..) hasn't
    assert [(i["data_field_name"], i["period_start"], i["period_end"]) for i in items] == [
        ("Weekly", start.isoformat(), (start + timedelta(days=6)).isoformat())
    ]
    # Saving with the period start clears it
    client.post("/api/entries/fields", json={"date": start.isoformat(), "entries": [{"data_field_id": weekly["id"], "value": 9}]}, headers=headers)
    assert _pending(client, headers) == []


def test_sheet_includes_all_fields_with_weekly_periods(client, test_org_data):
    headers = _auth(client, test_org_data)
    month_start = date.today().replace(day=1)
    client.post("/api/data-fields", json={"name": "Daily"}, headers=headers)
    client.post("/api/data-fields", json={"name": "Weekly", "entry_interval": "weekly", "period_start_date": month_start.isoformat()}, headers=headers)
    client.post("/api/data-fields", json={"name": "Sale", "entry_interval": "custom"}, headers=headers)

    sheet = client.get(f"/api/entries/fields/sheet?month={month_start.strftime('%Y-%m')}", headers=headers).json()
    rows = {f["name"]: f for g in sheet["room_groups"] for f in g["fields"]}
    assert list(rows) == ["Daily", "Weekly", "Sale"]
    assert rows["Daily"]["periods"] is None and rows["Sale"]["periods"] is None
    starts = sorted(rows["Weekly"]["periods"])
    assert starts[0] == month_start.isoformat()
    assert all((date.fromisoformat(b) - date.fromisoformat(a)).days == 7 for a, b in zip(starts, starts[1:]))
    assert rows["Weekly"]["periods"][starts[0]] == (month_start + timedelta(days=6)).isoformat()


def test_fields_inherit_rooms_from_kpis(client, test_org_data):
    headers = _auth(client, test_org_data)
    room = client.post("/api/rooms", json={"name": "Sales"}, headers=headers).json()
    client.post("/api/data-fields", json={"name": "Deals Closed"}, headers=headers)
    client.post("/api/data-fields", json={"name": "Leads Received"}, headers=headers)
    kpi = client.post(
        "/api/kpis",
        json={"name": "Conversion", "formula": "deals_closed / leads_received", "category": "Sales", "time_period": "daily"},
        headers=headers,
    )
    assert kpi.status_code == 201, kpi.text
    client.post(f"/api/rooms/{room['id']}/kpis", json={"kpi_ids": [kpi.json()["id"]]}, headers=headers)

    form = client.get(f"/api/entries/fields/today?date={date.today().isoformat()}", headers=headers).json()
    groups = {g["room_name"]: sorted(f["data_field_name"] for f in g["fields"]) for g in form["rooms"]}
    assert groups["Sales"] == ["Deals Closed", "Leads Received"]
    assert "Unassigned" not in groups

    fields = {f["name"]: f for f in client.get("/api/data-fields", headers=headers).json()["data_fields"]}
    assert fields["Deals Closed"]["room_ids"] == []
    assert fields["Deals Closed"]["kpi_room_paths"] == ["Sales"]

    sheet = client.get(f"/api/entries/fields/sheet?month={date.today().strftime('%Y-%m')}&room_id={room['id']}", headers=headers).json()
    assert sorted(f["name"] for g in sheet["room_groups"] for f in g["fields"]) == ["Deals Closed", "Leads Received"]
