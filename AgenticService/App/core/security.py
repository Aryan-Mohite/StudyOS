"""
security.py — Service-to-service authentication for AgenticService.

AgenticService is meant to be an *internal* service, only reachable from the
Next.js layer (see main.py's module docstring). Historically that boundary
was enforced by nothing but CORS, which does nothing for server-to-server
calls — any process that can reach this host on its port could call
/agent/* endpoints for free and burn LLM/OCR budget.

This closes that gap with a short-lived HS256 JWT that Next.js mints on
every outbound call (see Frontend/src/lib/serviceAuth.ts) and this module
verifies. It is NOT a user-auth system — Clerk remains the user-facing
auth layer in the Frontend. This only proves "the caller is our Next.js
backend," nothing about which student is asking.
"""

from __future__ import annotations

import jwt
from fastapi import Header, HTTPException

from config import settings

ISSUER = "studyos-frontend"
AUDIENCE = "studyos-agentic"


def verify_service_token(authorization: str | None = Header(default=None)) -> dict:
    """
    FastAPI dependency — add to any route that should only be reachable by
    the Next.js layer: `Depends(verify_service_token)`.

    Expects `Authorization: Bearer <jwt>`, HS256-signed with
    INTERNAL_SERVICE_JWT_SECRET, issuer "studyos-frontend", audience
    "studyos-agentic", short expiry (Next.js mints ~60s tokens per call).
    """
    if not settings.internal_service_jwt_secret:
        # Fail closed, not open: if the secret isn't configured, refuse
        # every request rather than silently accepting all of them. This
        # only trips at startup validation in normal operation (see
        # config.py), but stays defensive here too.
        raise HTTPException(status_code=503, detail="Service auth is not configured.")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(
            token,
            settings.internal_service_jwt_secret,
            algorithms=["HS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Service token expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid service token.")

    return payload
