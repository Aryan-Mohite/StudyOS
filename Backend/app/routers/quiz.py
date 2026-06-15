"""Quiz generation — MCQs, viva, interview questions."""
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.llm_router import call_llm, Task

router = APIRouter()


class QuizRequest(BaseModel):
    topic_id:    int
    quiz_type:   str = "mcq"    # mcq | viva | interview
    num_questions: int = 10


class QuizResponse(BaseModel):
    topic_id:   int
    quiz_type:  str
    questions:  list[dict]


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    prompt = f"""Generate {req.num_questions} {req.quiz_type} questions for topic_id {req.topic_id}.
Return as JSON array: [{{"question":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."}}]"""
    content, _ = await call_llm(Task.quiz_generation, prompt)
    # TODO: parse JSON response + save to DB
    return QuizResponse(topic_id=req.topic_id, quiz_type=req.quiz_type, questions=[])
