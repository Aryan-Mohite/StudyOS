"""
rate_limit.py — Rate limiting for AgenticService.

In-memory limiter (slowapi/limits), keyed by client IP. That's sufficient
here because the *only* legitimate caller is the Next.js layer making
server-to-server requests from a small, fixed set of hosts — this isn't
trying to fairly rate-limit thousands of end users (Clerk + the Frontend's
own per-user limiter handle that, see Frontend/src/lib/rateLimit.ts). This
layer exists to cap total damage (LLM spend, OCR CPU) if the service auth
boundary is ever misconfigured or a caller misbehaves.

No Redis — a single-process in-memory store is consistent with the
project's "stay lean until a specific problem demands it" infra stance,
and this service is deployed as one process (see ARCHITECTURE.md / VPS plan).
If AgenticService is ever horizontally scaled, swap the storage_uri below
for a redis:// URL — everything else stays the same.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])

# Generation endpoints are the expensive ones (LLM calls, sometimes OCR) —
# capped tighter than a generic API. PDF parsing/ingestion is capped a bit
# looser since a single syllabus upload legitimately involves a few calls
# in quick succession (parse, then per-topic notes/MCQ generation).
GENERATION_LIMIT = "20/minute"
INGESTION_LIMIT = "10/minute"
