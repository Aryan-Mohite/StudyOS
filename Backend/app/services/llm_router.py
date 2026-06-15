"""
Multi-model LLM router.

Task routing:
  notes_generation    → OpenAI GPT-4o
  syllabus_analysis   → Anthropic Claude
  fast_qa / chat      → Google Gemini Flash
"""
from enum import Enum
from openai import AsyncOpenAI
import anthropic
import google.generativeai as genai
from app.config import get_settings

cfg = get_settings()

openai_client    = AsyncOpenAI(api_key=cfg.openai_api_key)
anthropic_client = anthropic.AsyncAnthropic(api_key=cfg.anthropic_api_key)
genai.configure(api_key=cfg.google_api_key)


class Task(str, Enum):
    notes_generation  = "notes_generation"
    syllabus_analysis = "syllabus_analysis"
    fast_qa           = "fast_qa"
    quiz_generation   = "quiz_generation"


async def call_llm(task: Task, prompt: str, system: str = "") -> tuple[str, str]:
    """
    Route to the right model.
    Returns (response_text, model_name).
    """
    if task == Task.syllabus_analysis:
        msg = await anthropic_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=system or "You are a curriculum analysis expert.",
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text, "claude-opus-4-6"

    if task in (Task.fast_qa,):
        model = genai.GenerativeModel("gemini-1.5-flash")
        res   = await model.generate_content_async(prompt)
        return res.text, "gemini-1.5-flash"

    # Default: GPT-4o for notes + quizzes
    resp = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system or "You are an expert study notes generator."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=4096,
    )
    return resp.choices[0].message.content, "gpt-4o"
