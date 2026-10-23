# backend/app/core/limiter.py
import ipaddress

from fastapi import Request
from slowapi import Limiter

# Cloudflare edge ranges (https://www.cloudflare.com/ips/). These change rarely;
# re-check that page a few times a year and update if needed.
_CLOUDFLARE_NETWORKS = [
    ipaddress.ip_network(cidr)
    for cidr in (
        "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
        "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
        "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
        "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
        "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
        "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
    )
]


def _parse_ip(value: str):
    try:
        return ipaddress.ip_address(value.strip())
    except ValueError:
        return None


def _is_cloudflare(ip) -> bool:
    return ip is not None and any(ip in net for net in _CLOUDFLARE_NETWORKS)


def client_ip(request: Request) -> str:
    # Cloud Run appends the address that connected to Google's front end as the
    # LAST X-Forwarded-For entry; earlier entries are client-supplied and spoofable.
    xff = request.headers.get("x-forwarded-for")
    peer = _parse_ip(xff.split(",")[-1]) if xff else None

    # Behind Cloudflare the peer is a Cloudflare edge IP, so the real visitor IP
    # comes from CF-Connecting-IP. Only trust it when the peer really is Cloudflare.
    if _is_cloudflare(peer):
        visitor = _parse_ip(request.headers.get("cf-connecting-ip", ""))
        if visitor is not None:
            return str(visitor)

    if peer is not None:
        return str(peer)
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip)