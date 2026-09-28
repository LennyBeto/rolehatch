# backend/app/core/security.py — verify Supabase JWTs on protected routes
import logging
import re
import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.core.config import settings

logger = logging.getLogger("perchrole.security")
bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


def _supabase_base_url() -> str:
    """Project root URL, tolerating a SUPABASE_URL that includes /rest/v1 or a trailing slash."""
    url = settings.supabase_url.strip().rstrip("/")
    url = re.sub(r"/(rest|auth|storage)/v1$", "", url)
    return url


_JWKS_URL = f"{_supabase_base_url()}/auth/v1/.well-known/jwks.json"
_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}


def _get_jwks(force: bool = False) -> list[dict]:
    now = time.time()
    stale = now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS
    if force or stale or not _jwks_cache["keys"]:
        try:
            resp = httpx.get(_JWKS_URL, timeout=5)
            resp.raise_for_status()
            _jwks_cache["keys"] = resp.json().get("keys", [])
            _jwks_cache["fetched_at"] = now
        except httpx.HTTPError as exc:
            logger.warning("JWKS fetch failed (%s): %s", _JWKS_URL, exc)
    return _jwks_cache["keys"]


def _decode_token(token: str) -> dict:
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")

    if alg == "HS256":
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

    kid = header.get("kid")
    for force_refresh in (False, True):  # retry once in case keys were rotated
        key = next((k for k in _get_jwks(force=force_refresh) if k.get("kid") == kid), None)
        if key:
            return jwt.decode(token, key, algorithms=[alg], audience="authenticated")
    raise JWTError("No matching signing key for token")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        return _decode_token(creds.credentials)  # contains sub (user id), email, etc.
    except JWTError as exc:
        logger.warning("JWT rejected: %s", exc)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


def get_current_user_optional(
    creds: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
):
    """Return the JWT payload if a valid token is sent, otherwise None (never raises)."""
    if creds is None:
        return None
    try:
        return _decode_token(creds.credentials)
    except JWTError as exc:
        logger.info("Optional auth: ignoring invalid token (%s)", exc)
        return None