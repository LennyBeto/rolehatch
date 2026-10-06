# backend/app/core/limiter.py
from fastapi import Request
from slowapi import Limiter


def client_ip(request: Request) -> str:
    # Cloud Run appends the real client IP as the LAST X-Forwarded-For entry;
    # earlier entries are client-supplied and spoofable.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip)