from pydantic import BaseModel
from typing import Literal
from datetime import datetime


class NotesRequest(BaseModel):
    topic_id: int
    note_type: Literal["long", "short", "revision"] = "long"


class NotesResponse(BaseModel):
    topic_id: int
    note_type: str
    content: str
    generated_at: datetime

    model_config = {"from_attributes": True}
