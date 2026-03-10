"""Authentication service — password hashing, JWT tokens, user management."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import Session, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, email: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> dict:
    """Decode and validate JWT token. Raises jwt.PyJWTError on failure."""
    settings = get_settings()
    payload = jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Expected token type '{expected_type}', got '{payload.get('type')}'")
    return payload


async def register_user(
    db: AsyncSession, email: str, password: str, session_id: str | None = None
) -> User:
    """Create a new user. Optionally claim an anonymous session."""
    email = email.strip().lower()

    user = User(
        email=email,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()

    if session_id:
        await claim_session(db, user.id, session_id)

    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User | None:
    """Verify credentials, return User or None."""
    email = email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


async def claim_session(db: AsyncSession, user_id: str, session_id: str) -> None:
    """Link an anonymous session to a user. Skip if already owned by another user."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        return
    if session.user_id is not None and session.user_id != user_id:
        return  # already claimed by different user
    session.user_id = user_id
