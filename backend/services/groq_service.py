"""
services/groq_service.py
Calls Groq (llama-3.3-70b-versatile) to generate a personalised
mental health support response based on assessment data.
"""

from __future__ import annotations

import logging

from groq import AsyncGroq

from utils.config import settings

logger = logging.getLogger(__name__)

_client: AsyncGroq | None = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


# ── Prompt builder ────────────────────────────────────────────
def _build_prompt(student_data: dict, assessment: dict, suggestions: list[str]) -> str:
    name       = student_data.get("name", "the student")
    course     = student_data.get("course", "their course")
    final_risk = assessment.get("final_risk", "Unknown")
    stress     = assessment.get("stress_level")
    anxiety    = assessment.get("anxiety_score")
    depression = assessment.get("depression_score")
    sleep      = assessment.get("sleep_quality")
    free_text  = assessment.get("free_text", "")

    suggestions_text = "\n".join(f"- {s}" for s in suggestions)

    prompt = f"""
You are a compassionate, professional mental health support assistant at a university.

A student named {name} studying {course} has just completed a mental health assessment.

**Risk Classification:** {final_risk}

**Key Scores (1-10 scale):**
- Stress Level: {stress}
- Anxiety Score: {anxiety}
- Depression Score: {depression}
- Sleep Quality: {sleep}
- Substance Use: {assessment.get('substance_use', False)}
- Family History of Mental Health: {assessment.get('family_history', False)}
- Financial Stress: {assessment.get('financial_stress')}

**Student's own words:**
"{free_text or 'No free text provided.'}"

**Preliminary suggestions from the assessment system:**
{suggestions_text}

---

Please write a warm, empathetic, and personalised response to this student that:
1. Acknowledges their current situation with empathy (2-3 sentences)
2. Provides 3-5 specific, actionable mental health strategies tailored to their profile
3. Recommends appropriate support resources (counseling, peer groups, etc.)
4. Ends with an encouraging message

Keep the response under 350 words. Be warm but professional. Do NOT be clinical or dismissive.
{"If this is High Risk, strongly and gently urge them to seek immediate professional help." if final_risk == "High Risk" else ""}
""".strip()
    return prompt


# ── Main call ─────────────────────────────────────────────────
async def get_llm_response(
    student_data: dict,
    assessment: dict,
    suggestions: list[str],
) -> str:
    """
    Returns the Groq LLM response string.
    student_data: dict with name, course, etc.
    assessment:   dict with risk scores and free_text
    suggestions:  list of ML-generated suggestion strings
    """
    client = _get_client()
    prompt = _build_prompt(student_data, assessment, suggestions)

    try:
        chat = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a compassionate university mental health support assistant. "
                        "Always respond with empathy, clarity, and actionable advice. "
                        "Never diagnose; always recommend professional help when needed."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
            temperature=0.7,
        )
        return chat.choices[0].message.content.strip()

    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        # Return a safe fallback so assessment still saves
        return (
            "We were unable to generate a personalised response at this time. "
            "Please reach out to your campus counseling centre for immediate support. "
            "Remember: you are not alone, and help is always available."
        )