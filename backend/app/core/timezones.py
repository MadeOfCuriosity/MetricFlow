"""Organization time zones: what "today" means for an org."""
from datetime import date, datetime
from functools import lru_cache
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError, available_timezones


@lru_cache(maxsize=1)
def _zones() -> frozenset[str]:
    return frozenset(available_timezones())


def is_valid_timezone(name: str) -> bool:
    return name in _zones()


def org_now(tz_name: Optional[str]) -> datetime:
    """Current wall-clock time in the org's zone (naive), or server local time if unset/invalid."""
    if tz_name:
        try:
            return datetime.now(ZoneInfo(tz_name)).replace(tzinfo=None)
        except ZoneInfoNotFoundError:
            pass
    return datetime.now()


def org_today(tz_name: Optional[str]) -> date:
    return org_now(tz_name).date()
