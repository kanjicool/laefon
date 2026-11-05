from datetime import UTC, datetime, timedelta


def floor_to_step(now: datetime, step_minutes: int) -> datetime:
    minutes = (now.minute // step_minutes) * step_minutes
    return now.replace(minute=minutes, second=0, microsecond=0)


def live_shift(issued_at: datetime, step_minutes: int, now: datetime | None = None) -> timedelta:
    """Offset that moves mock data so its latest run matches the current radar step."""
    now = now or datetime.now(UTC)
    return floor_to_step(now.astimezone(issued_at.tzinfo), step_minutes) - issued_at
