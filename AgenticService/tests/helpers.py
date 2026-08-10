"""helpers.py — shared JWT helpers for tests, mirroring App/core/security.py's expectations."""

import time

import jwt

ISSUER = "studyos-frontend"
AUDIENCE = "studyos-agentic"


def make_service_token(secret: str, *, expired: bool = False, wrong_issuer: bool = False, wrong_audience: bool = False) -> str:
    now = int(time.time())
    payload = {
        "iss": "wrong-issuer" if wrong_issuer else ISSUER,
        "aud": "wrong-audience" if wrong_audience else AUDIENCE,
        "iat": now - 120 if expired else now,
        "exp": now - 60 if expired else now + 60,
    }
    return jwt.encode(payload, secret, algorithm="HS256")
