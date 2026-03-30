"""
rag/generator.py
----------------
Generates a personalized mental health response using:
  - Groq LLM (llama3-8b-8192) as the language model
  - ChromaDB retrieved docs as grounding context (RAG)
  - Student structured data + optional free text as input
"""

import os
import sys
from dotenv import load_dotenv
from groq import Groq

# ── Load .env ──────────────────────────────────────────────────────────────────
load_dotenv()

# ── Path setup ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "rag":
    BASE_DIR = os.path.dirname(BASE_DIR)
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)

sys.path.insert(0, os.path.join(BASE_DIR, "src"))

from rag.retriever import retrieve

# ── Groq client ────────────────────────────────────────────────────────────────
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
GROQ_MODEL = "llama-3.3-70b-versatile"   # current free tier model


# ── Crisis resources (always appended for High risk) ──────────────────────────
CRISIS_RESOURCES = """
🆘 IMMEDIATE SUPPORT RESOURCES:
   • iCall (India)         : 9152987821
   • Vandrevala Foundation : 1860-2662-345 (24/7)
   • iCall Email           : icall@tiss.edu
   • TPO Nepal             : 1166
   • International         : https://www.iasp.info/resources/Crisis_Centres/
"""


def build_query(student_data: dict, free_text: str = "") -> str:
    """Build a retrieval query from student data + free text."""
    parts = []
    if free_text:
        parts.append(free_text)

    if student_data.get("Stress_Level", 0) >= 4:
        parts.append("high stress levels")
    if student_data.get("Anxiety_Score", 0) >= 4:
        parts.append("severe anxiety")
    if student_data.get("Depression_Score", 0) >= 4:
        parts.append("depression symptoms")
    if student_data.get("Sleep_Quality") == "Poor":
        parts.append("sleep problems")
    if student_data.get("Financial_Stress", 0) >= 4:
        parts.append("financial stress")

    return " ".join(parts) if parts else "general mental health support"


def build_student_summary(student_data: dict) -> str:
    """Convert student dict into a readable summary for the LLM prompt."""
    return f"""
- Age: {student_data.get('Age')}
- Course: {student_data.get('Course')}
- Gender: {student_data.get('Gender')}
- CGPA: {student_data.get('CGPA')}
- Stress Level: {student_data.get('Stress_Level')}/5
- Depression Score: {student_data.get('Depression_Score')}/5
- Anxiety Score: {student_data.get('Anxiety_Score')}/5
- Sleep Quality: {student_data.get('Sleep_Quality')}
- Physical Activity: {student_data.get('Physical_Activity')}
- Diet Quality: {student_data.get('Diet_Quality')}
- Social Support: {student_data.get('Social_Support')}
- Financial Stress: {student_data.get('Financial_Stress')}/5
- Family History of Mental Health Issues: {student_data.get('Family_History')}
- Counseling Service Use: {student_data.get('Counseling_Service_Use')}
- Substance Use: {student_data.get('Substance_Use')}
""".strip()


def build_prompt(
    risk_level: str,
    confidence: float,
    student_summary: str,
    free_text: str,
    retrieved_docs: list[dict]
) -> str:
    """
    Build the full prompt sent to Groq.
    The retrieved docs are injected as context (RAG grounding).
    """

    # Format the retrieved knowledge base docs as context
    context_block = ""
    if retrieved_docs:
        context_block = "RELEVANT MENTAL HEALTH KNOWLEDGE (use this to ground your response):\n"
        for i, doc in enumerate(retrieved_docs, 1):
            context_block += f"\n[{i}] {doc['text']}\n"

    # Risk-level instruction
    risk_instructions = {
        "High": (
            "The student is at HIGH RISK. Your tone must be warm, urgent, and caring. "
            "Strongly encourage them to seek immediate professional help or call a crisis line. "
            "Do not be dismissive. Acknowledge their pain directly."
        ),
        "Medium": (
            "The student is at MEDIUM RISK. Your tone should be empathetic and encouraging. "
            "Suggest practical coping strategies, recommend counseling as a proactive step, "
            "and help them build healthy habits."
        ),
        "Low": (
            "The student is at LOW RISK. Your tone should be positive and supportive. "
            "Reinforce their good habits and offer tips to maintain and improve their wellbeing."
        ),
    }

    instruction = risk_instructions.get(risk_level, risk_instructions["Medium"])

    prompt = f"""You are a compassionate and professional mental health support assistant 
for university students. Your role is to provide personalized, evidence-based guidance.

{instruction}

STUDENT PROFILE:
{student_summary}

STUDENT'S OWN WORDS:
"{free_text if free_text.strip() else 'No message provided.'}"

RISK ASSESSMENT RESULT:
- Risk Level: {risk_level} (model confidence: {confidence:.1%})

{context_block}

YOUR TASK:
Write a warm, personalized mental health support response for this student. 
Structure your response as follows:
1. A brief empathetic acknowledgment of how they are feeling (2-3 sentences)
2. Key risk factors you noticed from their profile (bullet points)
3. 3-4 specific, actionable recommendations tailored to their situation
4. A closing encouraging sentence

Keep the total response under 350 words. Do not use clinical jargon.
Do not repeat the student's scores back to them as raw numbers.
Speak directly to the student using "you" language.
"""
    return prompt


def generate_response(
    risk_level: str,
    confidence: float,
    student_data: dict,
    free_text: str = "",
    n_docs: int = 3
) -> str:
    """
    Main function — generates a Groq LLM response grounded in ChromaDB docs.

    Parameters
    ----------
    risk_level   : "Low", "Medium", or "High"
    confidence   : float between 0 and 1
    student_data : dict of student features
    free_text    : student's optional typed message
    n_docs       : number of ChromaDB docs to retrieve as context

    Returns
    -------
    Formatted string response (header + LLM output + crisis line if High)
    """

    # Step 1: Retrieve relevant docs from ChromaDB (still used as LLM context)
    query = build_query(student_data, free_text)
    retrieved_docs = retrieve(query, risk_level=risk_level, n_results=n_docs)

    # Step 2: Build student summary and prompt
    student_summary = build_student_summary(student_data)
    prompt = build_prompt(
        risk_level=risk_level,
        confidence=confidence,
        student_summary=student_summary,
        free_text=free_text,
        retrieved_docs=retrieved_docs
    )

    # Step 3: Call Groq LLM
    try:
        chat_completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a compassionate university mental health support assistant. "
                        "You provide personalized, practical, and empathetic guidance to students. "
                        "You never diagnose. You always encourage professional help when needed."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,       # balanced: not too robotic, not too random
            max_tokens=512,        # enough for a thorough response
        )
        llm_response = chat_completion.choices[0].message.content.strip()

    except Exception as e:
        # Graceful fallback if API call fails
        llm_response = (
            f"I was unable to generate a personalized response at this time (error: {e}). "
            "Please speak with your university counselor directly."
        )

    # Step 4: Wrap in a report header
    lines = []
    lines.append("=" * 62)
    lines.append("  MENTAL HEALTH RISK ASSESSMENT REPORT")
    lines.append("=" * 62)
    lines.append(f"\n📊 Risk Level   : {risk_level.upper()}")
    lines.append(f"   Confidence   : {confidence:.1%}\n")
    lines.append("-" * 62)
    lines.append(llm_response)
    lines.append("-" * 62)

    # Step 5: Append crisis resources for High risk
    if risk_level == "High":
        lines.append(CRISIS_RESOURCES)

    lines.append("=" * 62)
    lines.append(
        "⚠️  This report is for informational purposes only and is not "
        "a clinical diagnosis. Please consult a qualified mental health professional."
    )

    return "\n".join(lines)


# ── Quick test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample_student = {
        "Age": 21, "Course": "Engineering", "Gender": "Female",
        "CGPA": 2.6, "Stress_Level": 5, "Depression_Score": 4,
        "Anxiety_Score": 4, "Sleep_Quality": "Poor",
        "Physical_Activity": "Low", "Diet_Quality": "Average",
        "Social_Support": "Low", "Relationship_Status": "Single",
        "Substance_Use": "Occasionally", "Counseling_Service_Use": "Never",
        "Family_History": "Yes", "Chronic_Illness": "No",
        "Financial_Stress": 4, "Extracurricular_Involvement": "Low",
        "Semester_Credit_Load": 24, "Residence_Type": "Off-Campus"
    }
    response = generate_response(
        risk_level="High",
        confidence=0.91,
        student_data=sample_student,
        free_text="I've been crying every day and feel completely hopeless.",
    )
    print(response)