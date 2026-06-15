"""Celery app — uses Redis as broker and result backend."""
from celery import Celery
from app.config import get_settings

cfg = get_settings()

celery_app = Celery(
    "studyos",
    broker=cfg.redis_url,
    backend=cfg.redis_url,
    include=["app.tasks.pdf_tasks", "app.tasks.embedding_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_routes={
        "app.tasks.pdf_tasks.*":       {"queue": "pdf"},
        "app.tasks.embedding_tasks.*": {"queue": "embeddings"},
    },
)
