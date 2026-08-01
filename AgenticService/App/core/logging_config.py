"""
logging_config.py — Structured logging for AgenticService.

Every request gets a request_id (generated here, or forwarded from
Next.js if it sends one) and a single JSON log line on completion with
route, status, duration, and client IP. Deliberately excludes request/
response bodies — syllabus text, generated notes, and API keys should
never land in logs.
"""

from __future__ import annotations

import logging
import sys
import time
import uuid
from contextvars import ContextVar

from fastapi import Request
from pythonjsonlogger import jsonlogger

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

logger = logging.getLogger("studyos.agentic")


def configure_logging() -> None:
    logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    token = request_id_ctx.set(request_id)
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.monotonic() - start) * 1000, 1)
        logger.exception(
            "request_failed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else None,
            },
        )
        raise
    finally:
        request_id_ctx.reset(token)

    duration_ms = round((time.monotonic() - start) * 1000, 1)
    response.headers["x-request-id"] = request_id
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": request.client.host if request.client else None,
        },
    )
    return response


def log_generation_event(*, endpoint: str, topic_id: str | None, duration_ms: float, ok: bool) -> None:
    """
    Fire-and-forget usage/latency logging, called via FastAPI BackgroundTasks
    from generation endpoints so it never adds to the response latency the
    student waits on. Deliberately excludes prompt/response content.
    """
    logger.info(
        "generation_event",
        extra={
            "request_id": request_id_ctx.get(),
            "endpoint": endpoint,
            "topic_id": topic_id,
            "duration_ms": round(duration_ms, 1),
            "ok": ok,
        },
    )
