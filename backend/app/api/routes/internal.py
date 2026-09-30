"""Endpoints for infrastructure, not users. Hidden unless CRON_SECRET is set."""
import hmac

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.core.scheduler import run_jobs_once

router = APIRouter(prefix="/internal", tags=["Internal"], include_in_schema=False)


@router.post("/tick")
def tick(x_cron_secret: str = Header(default="")):
    """Run due integration syncs and WhatsApp reminders. Called every few minutes by AWS."""
    if not settings.CRON_SECRET:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if not hmac.compare_digest(x_cron_secret, settings.CRON_SECRET):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return run_jobs_once()
