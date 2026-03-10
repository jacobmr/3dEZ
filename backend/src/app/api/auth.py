"""Authentication API endpoints — register, login, refresh, me."""

from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_db
from app.services.auth import (
    authenticate_user,
    claim_session,
    create_access_token,
    create_refresh_token,
    decode_token,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthUserResponse(BaseModel):
    id: str
    email: str
    created_at: str


class AuthResponse(BaseModel):
    user: AuthUserResponse
    access_token: str


def _user_response(user) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 3600,
        path="/api/auth",
    )


@router.post("/register", response_model=AuthResponse)
async def register(
    body: RegisterRequest,
    response: Response,
    x_session_id: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    try:
        user = await register_user(db, body.email, body.password, x_session_id)
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(status_code=409, detail="Email already registered")
        raise

    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(user=_user_response(user), access_token=access_token)


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    response: Response,
    x_session_id: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Claim anonymous session if present
    if x_session_id:
        await claim_session(db, user.id, x_session_id)
        await db.commit()

    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(user=_user_response(user), access_token=access_token)


@router.post("/refresh")
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload["sub"]

    # Verify user still exists
    from sqlalchemy import select
    from app.db.models import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = create_access_token(user.id, user.email)
    new_refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)

    return {"access_token": new_access}


@router.get("/me", response_model=AuthUserResponse)
async def me(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization[7:]
    try:
        payload = decode_token(token, expected_type="access")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    from sqlalchemy import select
    from app.db.models import User
    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return _user_response(user)
