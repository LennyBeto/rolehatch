# backend/app/core/security.py — verify Supabase JWTs on protected routes
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer_scheme = HTTPBearer()


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = creds.credentials

    # Primary path: ask Supabase's own Auth server to validate the token.
    # This works regardless of whether the project signs tokens with the
    # legacy shared HS256 secret or the newer per-project asymmetric keys —
    # so it can't fail just because of a local secret/algorithm mismatch,
    # which is what was causing every request to be rejected as "invalid"
    # immediately, not just after real expiry.
    apikey = settings.supabase_service_role_key or settings.supabase_jwt_secret
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": apikey},
            )
        if resp.status_code == 200:
            data = resp.json()
            return {"sub": data["id"], "email": data.get("email", "")}
        if resp.status_code in (401, 403):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    except httpx.HTTPError:
        pass  # Supabase unreachable — fall through to local verification below

    # Fallback: local HS256 decode, kept for environments still using the
    # legacy shared JWT secret, or if the Auth server call above can't be
    # reached (e.g. offline dev).
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")