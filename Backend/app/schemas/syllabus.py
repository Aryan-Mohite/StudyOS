from pydantic import BaseModel
from typing import Literal


class SubtopicOut(BaseModel):
    name: str
    difficulty: Literal["easy", "medium", "hard"]


class UnitOut(BaseModel):
    unit_number: int
    title: str
    subtopics: list[SubtopicOut]


class SyllabusUploadResponse(BaseModel):
    syllabus_id: int
    subject: str
    units: list[UnitOut]
    task_id: str | None = None   # Celery task for async processing


class TopicOut(BaseModel):
    id: int
    unit_number: int | None
    topic: str
    subtopic: str | None
    difficulty: str

    model_config = {"from_attributes": True}
