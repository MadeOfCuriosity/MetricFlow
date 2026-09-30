"""
Data entry over WhatsApp.

Commands (case-insensitive): start · pending · log · status · help · cancel
While answering: a number (saved immediately) · skip · back (re-answer the previous one) · stop.
Quick format in one message: "deals 12, leads 40" (shows a review first, since names are matched loosely).

Who is asked about what ("scope"):
- Room admins: rooms where their "WhatsApp data entry" switch is on, plus those rooms' sub-rooms.
- Admins: the rooms / organization-wide fields they chose; if they chose nothing, `start` covers
  everything on demand (and they're never reminded).
"No schedule" fields are never asked in `start`/`pending`; they're recorded with `log` or the quick format.
"""
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.timezones import org_today
from app.models import User
from app.models.organization import Organization
from app.models.user_room_assignment import UserRoomAssignment
from app.models.whatsapp import WhatsAppSession
from app.schemas.data_fields import FieldEntryInput

SESSION_TTL = timedelta(hours=2)
PENDING_LIMIT = 15
LIST_LIMIT = 10  # WhatsApp list messages hold at most 10 rows
ORG_WIDE = "Organization-wide"

HELP_WORDS = {"help", "menu", "hi", "hello", "hey", "?"}
START_WORDS = {"start", "enter", "entry", "today", "fill"}
PENDING_WORDS = {"pending", "missed"}
LOG_WORDS = {"log", "record", "add"}
STATUS_WORDS = {"status"}
INSIGHTS_WORDS = {"insights", "insight"}
REPORT_WORDS = {"report", "generate report", "reports"}
CANCEL_WORDS = {"cancel", "quit", "exit", "stop entry", "end", "finish"}
SKIP_WORDS = {"skip", "next", "-"}
BACK_WORDS = {"back", "undo", "previous"}
SAVE_WORDS = {"save", "yes", "confirm", "ok", "done"}
COMMAND_WORDS = HELP_WORDS | START_WORDS | PENDING_WORDS | LOG_WORDS | STATUS_WORDS | INSIGHTS_WORDS | REPORT_WORDS

_MULTIPLIERS = {
    "k": 1e3, "thousand": 1e3,
    "l": 1e5, "lac": 1e5, "lakh": 1e5, "lakhs": 1e5,
    "cr": 1e7, "crore": 1e7, "crores": 1e7,
    "m": 1e6, "mn": 1e6, "million": 1e6,
}
_NUMBER_RE = re.compile(r"^(-?\d+(?:\.\d+)?)\s*([a-z]+)?$")
_QUICK_PART_RE = re.compile(r"^(.+?)[\s:=]+(-?[\d.,₹$]+\s*[a-zA-Z]*)$")
_PICK_RE = re.compile(r"^(?:pick\s+)?(\d{1,2})$")


@dataclass
class BotReply:
    text: str
    buttons: list[tuple[str, str]] = field(default_factory=list)  # (id, title)
    list_rows: list[tuple[str, str, str]] = field(default_factory=list)  # (id, title, description)
    list_button: str = "Choose"


@dataclass
class Scope:
    rooms: Optional[set[UUID]]  # None = every room
    org_wide: bool  # includes fields with no room
    explicit: bool  # chosen/assigned (drives reminders) vs. admin's on-demand "everything"

    def has_room(self, room_id: Optional[UUID]) -> bool:
        if room_id is None:
            return self.org_wide
        return self.rooms is None or room_id in self.rooms

    def has_any(self, room_ids: list[UUID]) -> bool:
        return self.has_room(None) if not room_ids else any(self.has_room(r) for r in room_ids)


EVERYTHING = Scope(rooms=None, org_wide=True, explicit=False)


# ---------- formatting ----------

def parse_number(raw: str) -> Optional[float]:
    """'1,200' '12.5' '₹2,40,000' '10k' '5L' '2.4 cr' -> float; None if not a number."""
    s = (raw or "").strip().lower().replace(",", "").replace("₹", "").replace("$", "").replace(" ", "")
    m = _NUMBER_RE.match(s)
    if not m:
        return None
    value, suffix = float(m.group(1)), m.group(2)
    if suffix:
        if suffix not in _MULTIPLIERS:
            return None
        value *= _MULTIPLIERS[suffix]
    return value


def fmt_num(v: float) -> str:
    return f"{int(v):,}" if float(v).is_integer() else f"{v:,.2f}".rstrip("0").rstrip(".")


def bar(done: int, total: int, width: int = 10) -> str:
    filled = round(width * done / total) if total else 0
    return "▰" * filled + "▱" * (width - filled)


def _day(d: date) -> str:
    return d.strftime("%a, %-d %b")


def _when(item: dict, today: date) -> str:
    start = date.fromisoformat(item["date"])
    if item["interval"] == "weekly":
        return f"week of {start.strftime('%-d %b')}"
    if item["interval"] == "monthly":
        return f"month from {start.strftime('%-d %b')}"
    if start == today:
        return "today"
    if start == today - timedelta(days=1):
        return "yesterday"
    return _day(start)


def _first(user: User) -> str:
    return user.name.split(" ")[0]


# ---------- scope & data ----------

def _with_subrooms(db: Session, room_ids: set[UUID]) -> set[UUID]:
    from app.services.room_service import RoomService

    out = set(room_ids)
    for rid in room_ids:
        out.update(RoomService.get_all_descendant_ids(db, rid))
    return out


def entry_scope(db: Session, user: User) -> Scope:
    """Which fields this user is asked about on WhatsApp (see module docstring)."""
    if user.role == "admin":
        chosen = user.whatsapp_scope or {}
        room_ids = {UUID(r) for r in chosen.get("room_ids", [])}
        org_wide = bool(chosen.get("org_wide"))
        if not room_ids and not org_wide:
            return EVERYTHING
        return Scope(rooms=_with_subrooms(db, room_ids), org_wide=org_wide, explicit=True)
    room_ids = {
        rid for (rid,) in db.query(UserRoomAssignment.room_id).filter(
            UserRoomAssignment.user_id == user.id, UserRoomAssignment.whatsapp_entry.is_(True)
        )
    }
    return Scope(rooms=_with_subrooms(db, room_ids), org_wide=False, explicit=True)


def _free_scope(db: Session, user: User) -> Scope:
    """For log/quick entry: admins may record any field; room admins stay within their scope."""
    return EVERYTHING if user.role == "admin" else entry_scope(db, user)


def _today_items(db: Session, user: User, org: Organization, scope: Scope,
                 include_done: bool = False, schedule: str = "scheduled") -> list[dict]:
    """Fields for today (each in its current period). schedule: 'scheduled' | 'unscheduled' | 'all'."""
    from app.services.entry_service import EntryService

    today = org_today(org.timezone)
    groups, _, _ = EntryService.get_today_field_form(
        db=db, org_id=org.id, user_role=user.role, user_id=user.id, today=today
    )
    seen: set[str] = set()
    items: list[dict] = []
    for g in groups:
        if not scope.has_room(g["room_id"]):
            continue
        for f in g["fields"]:
            fid = str(f["data_field_id"])
            unscheduled = f["entry_interval"] == "custom"
            if fid in seen or (schedule == "scheduled" and unscheduled) or (schedule == "unscheduled" and not unscheduled):
                continue
            if not include_done and f["has_entry_today"]:
                continue
            seen.add(fid)
            items.append({
                "field_id": fid,
                "name": f["data_field_name"],
                "variable": f["variable_name"],
                "unit": f.get("unit"),
                "interval": f["entry_interval"],
                "date": (f.get("period_start") or today).isoformat(),
                "room": g["room_name"] if g["room_id"] else ORG_WIDE,
                "done": bool(f["has_entry_today"]),
            })
    return items


def _pending(db: Session, user: User, org: Organization, scope: Scope) -> tuple[list[dict], int]:
    """Missed periods (newest first); returns (first PENDING_LIMIT, total)."""
    from app.services.data_field_service import DataFieldService
    from app.services.entry_service import EntryService

    _, items = EntryService.get_pending_entries(
        db=db, org_id=org.id, user_role=user.role, user_id=user.id, today=org_today(org.timezone)
    )
    if scope is not EVERYTHING:
        rooms = DataFieldService.get_field_rooms(db, list({i["data_field_id"] for i in items}))
        items = [i for i in items if scope.has_any([r for r, _ in rooms.get(i["data_field_id"], [])])]
    out = [{
        "field_id": str(i["data_field_id"]),
        "name": i["data_field_name"],
        "unit": i.get("unit"),
        "interval": i["entry_interval"],
        "date": i["period_start"].isoformat(),
        "room": ", ".join(i.get("room_names") or []) or ORG_WIDE,
    } for i in items]
    return out[:PENDING_LIMIT], len(out)


# ---------- session ----------

def _get_session(db: Session, user: User) -> Optional[WhatsAppSession]:
    s = db.query(WhatsAppSession).filter(WhatsAppSession.user_id == user.id).first()
    if s and s.expires_at < datetime.utcnow():
        db.delete(s)
        db.commit()
        return None
    return s


def _save_session(db: Session, user: User, state: dict) -> None:
    s = db.query(WhatsAppSession).filter(WhatsAppSession.user_id == user.id).first()
    if not s:
        db.add(WhatsAppSession(user_id=user.id, org_id=user.org_id, mode="entry", state=state,
                               expires_at=datetime.utcnow() + SESSION_TTL))
    else:
        s.state = dict(state)  # new object so the JSON change is persisted
        s.expires_at = datetime.utcnow() + SESSION_TTL
    db.commit()


def _clear_session(db: Session, user: User) -> None:
    db.query(WhatsAppSession).filter(WhatsAppSession.user_id == user.id).delete()
    db.commit()


# ---------- messages ----------

MENU = [
    ("start", "📝 Start", "Fill in today's entries"),
    ("pending", "⏳ Pending", "Catch up on missed days"),
    ("log", "⚡ Log", "Record something with no schedule"),
    ("status", "📊 Status", "See what's left today"),
    ("insights", "💡 Insights", "Highlights from your numbers"),
    ("report", "📄 Generate report", "Get a summary report"),
]


def _help(user: User) -> BotReply:
    return BotReply(
        f"👋 *Hi {_first(user)}!*\n\n"
        "Tap *Menu* to choose, or type a command:\n"
        "start · pending · log · status · insights · report\n\n"
        "_Or type it in one go:_ deals 12, leads 40",
        list_button="Menu",
        list_rows=MENU,
    )


def normalize_command(text: str) -> str:
    """'*Log*', ' _start_ ', 'Status.' -> 'log', 'start', 'status' (WhatsApp formatting marks are kept as text)."""
    return re.sub(r"\s+", " ", re.sub(r"[*_~`.!,]", "", text or "")).strip().lower()


def _question(state: dict, today: date, note: str = "") -> BotReply:
    queue, i = state["queue"], state["i"]
    item = queue[i]
    unit = f"  ({item['unit']})" if item.get("unit") else ""
    count = f"  ·  {i + 1}/{len(queue)}" if len(queue) > 1 else ""
    text = f"{note}*{item['name']}*{unit}\n_{item['room']} · {_when(item, today)}{count}_"
    buttons = [("skip", "Skip"), ("back", "Back"), ("cancel", "Stop")] if i > 0 else [("skip", "Skip"), ("cancel", "Stop")]
    return BotReply(text, buttons)


def _summary(state: dict, today: date) -> BotReply:
    by_room: dict[str, list[str]] = {}
    count = 0
    for idx, item in enumerate(state["queue"]):
        v = state["values"].get(str(idx))
        if v is None:
            continue
        count += 1
        unit = f" {item['unit']}" if item.get("unit") else ""
        when = _when(item, today)
        suffix = "" if when == "today" else f"  _· {when}_"
        by_room.setdefault(item["room"], []).append(f"• {item['name']} — *{fmt_num(v)}*{unit}{suffix}")
    if not count:
        return BotReply("Nothing to save.\nReply *start* whenever you're ready.")
    blocks = [f"*{room}*\n" + "\n".join(lines) for room, lines in by_room.items()]
    skipped = len(state["queue"]) - count
    tail = f"\n\n_{skipped} skipped_" if skipped else ""
    return BotReply("📋 *Review before saving*\n\n" + "\n\n".join(blocks) + tail,
                    buttons=[("save", "Save"), ("back", "Back"), ("cancel", "Cancel")])


def _begin(db: Session, user: User, org: Organization, items: list[dict], kind: str, intro: str) -> BotReply:
    today = org_today(org.timezone)
    state = {"kind": kind, "queue": items, "i": 0, "values": {}, "stage": "asking"}
    _save_session(db, user, state)
    q = _question(state, today)
    return BotReply(f"{intro}\n\n{q.text}", q.buttons)



def _save_one(db: Session, user: User, org: Organization, item: dict, value: float) -> Optional[str]:
    """Save a single answer right away (upsert). Returns an error message, or None."""
    from app.services.entry_service import EntryService

    created, _, errors = EntryService.create_field_entries(
        db, org.id, user.id, date.fromisoformat(item["date"]),
        [FieldEntryInput(data_field_id=UUID(item["field_id"]), value=float(value))], source="whatsapp",
    )
    if errors or not created:
        return (errors[0].get("error") if errors else None) or "couldn't be saved"
    return None


def _finish(db: Session, user: User, org: Organization, state: dict, stopped: bool = False) -> BotReply:
    """End of an ask-as-you-go flow: everything is already saved, just summarise."""
    _clear_session(db, user)
    saved = len(state["values"])
    asked = state["i"] if stopped else len(state["queue"])
    skipped = max(asked - saved, 0)
    if not saved:
        return BotReply("Stopped. Nothing entered." if stopped else "Done — nothing entered.\nReply *start* whenever you're ready.")
    lines = [f"✅ *{'Stopped' if stopped else 'Done'}* · {saved} saved"
             + (f" · {skipped} skipped" if skipped else "")
             + (f" · {len(state['queue']) - state['i']} left" if stopped and state["i"] < len(state["queue"]) else "")]
    lines.append("_Everything you entered is saved and visible in Visualize._")
    if state["kind"] == "today" and not _today_items(db, user, org, entry_scope(db, user)):
        lines.append("\n🎉 That's everything for today.")
    return BotReply("\n".join(lines), [("start", "Continue")] if stopped and state["kind"] == "today" else [])


def _save(db: Session, user: User, org: Organization, state: dict) -> BotReply:
    from app.services.entry_service import EntryService

    by_date: dict[str, list[FieldEntryInput]] = {}
    for idx, item in enumerate(state["queue"]):
        v = state["values"].get(str(idx))
        if v is not None:
            by_date.setdefault(item["date"], []).append(
                FieldEntryInput(data_field_id=UUID(item["field_id"]), value=float(v))
            )
    saved, kpis, errors = 0, 0, []
    for d, entries in by_date.items():
        created, recalculated, errs = EntryService.create_field_entries(
            db, org.id, user.id, date.fromisoformat(d), entries, source="whatsapp"
        )
        saved += len(created)
        kpis += recalculated
        errors += errs
    _clear_session(db, user)

    msg = f"✅ *Saved {saved} entr{'y' if saved == 1 else 'ies'}*"
    if kpis:
        msg += f"\n📈 {kpis} KPI{'s' if kpis != 1 else ''} updated"
    if errors:
        msg += f"\n⚠️ {len(errors)} couldn't be saved: " + "; ".join(e.get("error", "error") for e in errors[:3])
    if state["kind"] == "today" and not _today_items(db, user, org, entry_scope(db, user)):
        msg += "\n\n🎉 That's everything for today."
    return BotReply(msg)


def _status(db: Session, user: User, org: Organization) -> BotReply:
    today = org_today(org.timezone)
    scope = entry_scope(db, user)
    items = _today_items(db, user, org, scope, include_done=True)
    missing = [i for i in items if not i["done"]]
    _, pending_total = _pending(db, user, org, scope)

    text = f"📊 *Today · {_day(today)}*\n"
    if not items:
        text += "Nothing's scheduled for you today."
    else:
        done = len(items) - len(missing)
        text += f"{bar(done, len(items))}  *{done} of {len(items)}* done"
        if missing:
            text += "\n\n*Still to fill*\n" + "\n".join(f"• {i['name']} — _{i['room']}_" for i in missing[:6])
            if len(missing) > 6:
                text += f"\n_+{len(missing) - 6} more_"
    if pending_total:
        text += f"\n\n⏳ *{pending_total}* missed earlier"
    buttons = ([("start", "Start")] if missing else []) + ([("pending", "Pending")] if pending_total else [])
    return BotReply(text, buttons)


def _log_menu(db: Session, user: User, org: Organization) -> BotReply:
    """Pick a no-schedule field to record a value for today."""
    items = _today_items(db, user, org, _free_scope(db, user), include_done=True, schedule="unscheduled")
    if not items:
        return BotReply("⚡ *Log a value*\n\nThere are no no-schedule fields yet.\n"
                        "_Set a field's frequency to No schedule in Visualize → Data Table._")
    state = {"kind": "log", "options": items, "stage": "pick", "queue": [], "i": 0, "values": {}}
    _save_session(db, user, state)
    intro = "⚡ *Log a value*\nPick what happened today."
    if len(items) <= LIST_LIMIT:
        return BotReply(intro, list_button="Choose field", list_rows=[
            (f"pick {n}", it["name"], f"{it['room']}{' · ' + it['unit'] if it.get('unit') else ''}")
            for n, it in enumerate(items, start=1)
        ])
    lines = "\n".join(f"*{n}.* {it['name']} — _{it['room']}_" for n, it in enumerate(items, start=1))
    return BotReply(f"{intro}\n\n{lines}\n\n_Reply with its number or name._")


def _quick(db: Session, user: User, org: Organization, text: str) -> Optional[BotReply]:
    """'deals 12, leads 40' -> review screen. None if the message isn't in that format."""
    text = re.sub(r"^\s*log\s+", "", text, flags=re.IGNORECASE)
    parts = [p.strip() for p in re.split(r"[,\n;]+(?=\s*[^\d\s])", text) if p.strip()]
    pairs = []
    for p in parts:
        m = _QUICK_PART_RE.match(p)
        if not m:
            return None
        value = parse_number(m.group(2))
        if value is None:
            return None
        pairs.append((m.group(1).strip().lower(), value))
    if not pairs:
        return None

    today = org_today(org.timezone)
    fields = _today_items(db, user, org, _free_scope(db, user), include_done=True, schedule="all")
    items, unknown = [], []
    for name, value in pairs:
        exact = [f for f in fields if name in (f["name"].lower(), (f.get("variable") or "").lower())]
        matches = exact or [f for f in fields if f["name"].lower().startswith(name) or name in f["name"].lower()]
        if len(matches) != 1:
            unknown.append(name)
            continue
        items.append({**matches[0], "value": value})
    if unknown:
        return BotReply(f"🤔 I couldn't match *{', '.join(unknown)}*.\n\n"
                        "_Use the field's name, e.g._ deals 12, leads 40\n_Reply *status* to see your fields._")

    state = {
        "kind": "quick",
        "queue": [{k: v for k, v in it.items() if k != "value"} for it in items],
        "i": len(items),
        "values": {str(idx): it["value"] for idx, it in enumerate(items)},
        "stage": "confirm",
    }
    _save_session(db, user, state)
    return _summary(state, today)


# ---------- entry point ----------

def handle(db: Session, user: User, text: str) -> BotReply:
    org = db.get(Organization, user.org_id)
    if not org or not org.whatsapp_enabled:
        return BotReply("WhatsApp is turned off for your organization in Visualize.")
    scope = entry_scope(db, user)
    if user.role != "admin" and not scope.rooms:
        return BotReply(
            f"👋 Hi {_first(user)}!\n\nWhatsApp data entry isn't on for you yet.\n"
            "_Ask your admin to turn it on for your room in Visualize._"
        )

    today = org_today(org.timezone)
    word = normalize_command(text)
    session = _get_session(db, user)

    # --- inside a flow ---
    if session:
        state = dict(session.state)
        if word in CANCEL_WORDS:
            if state["stage"] == "asking":
                return _finish(db, user, org, state, stopped=True)
            _clear_session(db, user)
            return BotReply("Cancelled. Nothing was saved.")

        if state["stage"] == "pick":
            options = state["options"]
            m = _PICK_RE.match(word)
            chosen = None
            if m and 1 <= int(m.group(1)) <= len(options):
                chosen = options[int(m.group(1)) - 1]
            elif word not in COMMAND_WORDS:
                named = [o for o in options if word and (o["name"].lower().startswith(word) or word in o["name"].lower())]
                chosen = named[0] if len(named) == 1 else None
                if not chosen:
                    quick = _quick(db, user, org, text)
                    if quick:
                        return quick
            if chosen:
                state.update(stage="asking", queue=[chosen], i=0, values={})
                _save_session(db, user, state)
                return _question(state, today)
            if word not in COMMAND_WORDS:
                return BotReply("Pick a field from the list, or reply *cancel*.")

        elif state["stage"] == "confirm":
            if word in SAVE_WORDS:
                return _save(db, user, org, state)
            if word in BACK_WORDS and state["kind"] != "quick":
                state.update(stage="asking", i=len(state["queue"]) - 1)
                _save_session(db, user, state)
                return _question(state, today)
            if word not in COMMAND_WORDS:
                quick = _quick(db, user, org, text)
                return quick or BotReply("Tap *Save* to keep these values, or *Cancel*.", _summary(state, today).buttons)

        elif state["stage"] == "asking":
            value = parse_number(text)
            note = ""
            if value is not None or word in SKIP_WORDS:
                item = state["queue"][state["i"]]
                if value is not None:
                    error = _save_one(db, user, org, item, value)
                    if error:
                        q = _question(state, today)
                        return BotReply(f"⚠️ {item['name']}: {error}\n\n{q.text}", q.buttons)
                    state["values"][str(state["i"])] = value
                    unit = f" {item['unit']}" if item.get("unit") else ""
                    note = f"✓ Saved {item['name']} → *{fmt_num(value)}*{unit}\n\n"
                else:
                    note = f"↷ Skipped {item['name']}\n\n"
                state["i"] += 1
            elif word in BACK_WORDS:
                # Re-ask the previous one; a new answer overwrites what was saved
                state["i"] = max(0, state["i"] - 1)
                prev = state["values"].get(str(state["i"]))
                if prev is not None:
                    note = f"↩ Currently *{fmt_num(prev)}* — send a new value to change it, or Skip to keep it.\n\n"
            elif word not in COMMAND_WORDS:
                quick = _quick(db, user, org, text)
                if quick:
                    return quick
                q = _question(state, today)
                return BotReply("⚠️ That doesn't look like a number.\nTry *12*, *1,200*, *10k* or *2.4cr* — or tap Skip.\n\n"
                                + q.text, q.buttons)
            else:
                state = None  # a new command starts over below
            if state is not None:
                if state["i"] >= len(state["queue"]):
                    done = _finish(db, user, org, state)
                    done.text = note + done.text
                    return done
                _save_session(db, user, state)
                return _question(state, today, note)

    # --- commands ---
    if word in START_WORDS:
        items = _today_items(db, user, org, scope)
        if not items:
            _clear_session(db, user)
            _, pending_total = _pending(db, user, org, scope)
            extra = f"\n⏳ *{pending_total}* missed earlier — tap Pending." if pending_total else ""
            return BotReply(f"✅ *All caught up for today!*{extra}",
                            [("pending", "Pending")] if pending_total else [])
        rooms = ", ".join(sorted({i["room"] for i in items}))
        return _begin(db, user, org, items, "today",
                      f"📝 *Today's entries* · {_day(today)}\n{len(items)} to fill · {rooms}\n\n"
                      "_Each answer is saved as soon as you send it._")
    if word in PENDING_WORDS:
        items, total = _pending(db, user, org, scope)
        if not items:
            _clear_session(db, user)
            return BotReply("🎉 *No missed entries.*")
        more = f"\n_Showing the latest {len(items)}._" if total > len(items) else ""
        return _begin(db, user, org, items, "pending", f"⏳ *Missed entries* · {total}{more}")
    if word in LOG_WORDS:
        return _log_menu(db, user, org)
    if word in STATUS_WORDS:
        return _status(db, user, org)
    if word in INSIGHTS_WORDS:
        return BotReply("💡 *Insights* are coming soon.\n_You'll get highlights from your numbers right here._")
    if word in REPORT_WORDS:
        return BotReply("📄 *Reports* are coming soon.\n_You'll be able to generate a summary report right here._")
    if word in HELP_WORDS or not word:
        return _help(user)

    quick = _quick(db, user, org, text)
    if quick:
        return quick
    return _help(user)
