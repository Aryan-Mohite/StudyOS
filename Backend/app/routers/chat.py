"""AI Tutor chat — LangGraph powered, Qdrant RAG, Gemini Flash."""
from fastapi import APIRouter
from app.database import get_qdrant
from app.schemas.chat import ChatRequest, ChatResponse
from app.agents.graph import study_graph

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    last_user_msg = next(
        (m.content for m in reversed(req.messages) if m.role == "user"), ""
    )

    result = await study_graph.ainvoke({
        "query":       last_user_msg,
        "syllabus_id": req.syllabus_id,
        "task":        "",
        "context":     [],
        "response":    "",
        "model_used":  "",
    })

    return ChatResponse(
        reply=result["response"],
        model_used=result["model_used"],
    )
