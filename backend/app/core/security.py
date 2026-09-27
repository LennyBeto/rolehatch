# backend/app/core/security.py — verify Supabase JWTs on protected routes
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer_scheme = HTTPBearer()


def _decode_locally(token: str) -> dict | None:
    """Standard path: verify the shared-secret HS256 signature Supabase
    uses by default. Fast, no network call, and correct for the vast
    majority of projects — this should succeed for any normally-configured
    project and any token that hasn't actually expired."""
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        return None


async def _verify_via_supabase(token: str) -> dict | None:
    """Fallback path for projects using asymmetric (per-project key) token
    signing, where a local HS256 decode can never succeed regardless of
    whether the token is actually valid. Must use the anon/public API key
    here — NOT the JWT secret, which Supabase's Auth API will reject as an
    invalid apikey and return 401/403 for, unrelated to the token itself."""
    apikey = settings.supabase_anon_key or settings.supabase_service_role_key
    if not apikey:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": apikey},
            )
        if resp.status_code == 200:
            data = resp.json()
            return {"sub": data["id"], "email": data.get("email", "")}
    except httpx.HTTPError:
        pass
    return None


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = creds.credentials

    payload = _decode_locally(token)
    if payload is not None:
        return payload

    payload = await _verify_via_supabase(token)
    if payload is not None:
        return payload

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")