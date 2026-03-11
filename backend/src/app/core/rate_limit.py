"""Simple in-memory rate limiter for API endpoints.

Uses a sliding-window counter keyed by session ID.  Intended for V1
abuse prevention — not a substitute for a production rate limiter like
Redis-backed token buckets.

Usage
-----
In a FastAPI route::

    from app.core.rate_limit import check_rate_limit

    @router.post("/endpoint")
    async def endpoint(session_id: str = Depends(get_session_id)):
        check_rate_limit(session_id, "messages", limit=10, window_seconds=60)
        ...
"""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException

# {bucket_key: [(timestamp, ...), ...]}
_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def check_rate_limit(
    session_id: str,
    action: str,
    *,
    limit: int,
    window_seconds: int,
) -> None:
    """Raise 429 if *session_id* exceeds *limit* calls for *action* within the window.

    Parameters
    ----------
    session_id:
        Unique session identifier.
    action:
        Name of the rate-limited action (e.g. ``"messages"``, ``"generations"``).
    limit:
        Maximum allowed calls within the window.
    window_seconds:
        Sliding window duration in seconds.
    """
    key = f"{session_id}:{action}"
    now = time.monotonic()
    cutoff = now - window_seconds

    with _lock:
        # Prune expired entries
        timestamps = _buckets[key]
        _buckets[key] = [t for t in timestamps if t > cutoff]

        if len(_buckets[key]) >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {limit} {action} per {window_seconds}s.",
            )

        _buckets[key].append(now)
