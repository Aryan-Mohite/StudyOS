from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    syllabus_id: int
    messages: list[ChatMessage]
    topic_id: int | None = None


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = []
    model_used: str = ""

    model_config = {"protected_namespaces": ()}
