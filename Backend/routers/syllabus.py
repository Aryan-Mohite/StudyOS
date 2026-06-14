"""Syllabus upload, parsing, and topic extraction."""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()


class Subtopic(BaseModel):
    name: str
    difficulty: str = "medium"


class Unit(BaseModel):
    unit_number: int
    title: str
    subtopics: List[Subtopic]


class SyllabusResponse(BaseModel):
    syllabus_id: int
    subject: str
    units: List[Unit]


@router.post("/upload", response_model=SyllabusResponse)
async def upload_syllabus(
    file: UploadFile = File(...),
    subject_name: str = "Unknown Subject",
):
    """
    Upload a syllabus PDF.
    Triggers Syllabus Parsing Agent → extracts units and subtopics.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted.")

    # TODO: pass to SyllabusParsingAgent (Agent 1)
    # content = await file.read()
    # result = await syllabus_parsing_agent.run(content)

    return SyllabusResponse(
        syllabus_id=1,
        subject=subject_name,
        units=[
            Unit(
                unit_number=1,
                title="Trees",
                subtopics=[
                    Subtopic(name="Binary Tree", difficulty="easy"),
                    Subtopic(name="BST", difficulty="medium"),
                    Subtopic(name="AVL Tree", difficulty="hard"),
                ],
            )
        ],
    )


@router.get("/{syllabus_id}/topics")
def get_topics(syllabus_id: int):
    """Return structured topic list for a given syllabus."""
    # TODO: fetch from MySQL
    return {"syllabus_id": syllabus_id, "topics": []}
