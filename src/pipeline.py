"""
pipeline.py
-----------
Simplified pipeline: Tabular model + Text model + Groq LLM only.
ChromaDB/RAG removed. Robust JSON parsing added.
Groq model: llama-3.3-70b-versatile

FIX: text_predict now correctly loads the full sklearn Pipeline saved by
     merge_and_retrain.py and calls predict_proba directly on raw text —
     no manual vectorizer.transform() or .toarray() needed.

FIX 2: load_dotenv() added at top so GROQ_API_KEY is always loaded
        from .env file automatically (works with Streamlit, FastAPI, scripts).
"""

# ── Load .env FIRST before anything else ─────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()   # reads fyp_final/.env and sets all variables as environment vars

import os
import json
import traceback
import joblib
import numpy as np
import pandas as pd
from groq import Groq

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)

MODELS_DIR    = os.path.join(BASE_DIR, "models")
MODEL_PATH    = os.path.join(MODELS_DIR, "risk_model.pkl")
ENCODERS_PATH = os.path.join(MODELS_DIR, "label_encoders.pkl")
TEXT_MODEL_PATH   = os.path.join(MODELS_DIR, "text_model.pkl")
TEXT_ENCODER_PATH = os.path.join(MODELS_DIR, "text_vectorizer.pkl")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    raise EnvironmentError(
        "[ERROR] GROQ_API_KEY is not set. "
        "Make sure your .env file exists in the project root (fyp_final/) "
        "and contains: GROQ_API_KEY=your_key_here"
    )
groq_client = Groq(api_key=GROQ_API_KEY)

GROQ_MODEL = "llama-3.3-70b-versatile"

FEATURE_COLS = [
    "Age", "Course", "Gender", "CGPA",
    "Stress_Level", "Depression_Score", "Anxiety_Score",
    "Sleep_Quality", "Physical_Activity", "Diet_Quality",
    "Social_Support", "Relationship_Status", "Substance_Use",
    "Counseling_Service_Use", "Family_History", "Chronic_Illness",
    "Financial_Stress", "Extracurricular_Involvement",
    "Semester_Credit_Load", "Residence_Type"
]

CAT_COLS = [
    "Course", "Gender", "Sleep_Quality", "Physical_Activity", "Diet_Quality",
    "Social_Support", "Relationship_Status", "Substance_Use",
    "Counseling_Service_Use", "Family_History", "Chronic_Illness",
    "Extracurricular_Involvement", "Residence_Type"
]

CRISIS_RESOURCES_TEXT = (
    "If you are in immediate distress, please reach out now:\n"
    "• Nepal: TPO Nepal — 1166\n"
    "• India: iCall — 9152987821 | Vandrevala Foundation — 1860-2662-345 (24/7)\n"
    "• International: findahelpline.com"
)

FALLBACK_RESULT = {
    "summary": "We were unable to generate a personalised response at this time. Please try again.",
    "suggestions": [
        "Reach out to your university counselling centre.",
        "Try to maintain a consistent sleep schedule.",
        "Talk to a trusted friend, family member, or lecturer.",
        "Consider mindfulness or simple breathing exercises."
    ],
    "crisis_resources": False,
    "rag_response": "Please reach out to a mental health professional for support."
}


# ── Tabular model ─────────────────────────────────────────────────────────────

def load_tabular_model():
    model    = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODERS_PATH)
    return model, encoders


def encode_input(raw_input: dict, encoders: dict) -> dict:
    encoded = {}
    for col, val in raw_input.items():
        if col in CAT_COLS:
            le = encoders[col]
            encoded[col] = le.transform([val])[0] if val in le.classes_ else 0
        else:
            try:
                encoded[col] = float(val)
            except (TypeError, ValueError):
                encoded[col] = 0
    return encoded


def tabular_predict(student_data: dict):
    model, encoders = load_tabular_model()
    encoded = encode_input(student_data, encoders)
    X = pd.DataFrame(
        [[encoded.get(c, 0) for c in FEATURE_COLS]],
        columns=FEATURE_COLS
    )

    pred_encoded = model.predict(X)[0]
    pred_proba   = model.predict_proba(X)[0]
    class_names  = encoders["Risk_Level"].classes_
    risk_label   = encoders["Risk_Level"].inverse_transform([pred_encoded])[0]

    confidence = {
        cls + " Risk": round(float(prob) * 100, 1)
        for cls, prob in zip(class_names, pred_proba)
    }

    importances  = model.feature_importances_
    feat_series  = pd.Series(importances, index=FEATURE_COLS).sort_values(ascending=False)
    top_features = feat_series.head(5).to_dict()

    return risk_label + " Risk", confidence, top_features, X


# ── Text model ────────────────────────────────────────────────────────────────

def text_predict(free_text: str) -> dict:
    """
    Predict risk probabilities from free text using the saved sklearn Pipeline.

    merge_and_retrain.py saves the FULL pipeline (TfidfVectorizer + LogisticRegression)
    into text_model.pkl via:
        joblib.dump(pipeline, TEXT_MODEL_PATH)

    So we just load the pipeline and call predict_proba([text]) directly.
    No manual vectorisation or .toarray() conversion needed.
    """
    if not free_text or not free_text.strip():
        return {}

    if not os.path.exists(TEXT_MODEL_PATH):
        print(
            f"[WARN] Text model not found at {TEXT_MODEL_PATH}. "
            "Run merge_and_retrain.py first."
        )
        return {}

    try:
        text_pipeline = joblib.load(TEXT_MODEL_PATH)
        proba         = text_pipeline.predict_proba([free_text.strip()])[0]
        classes       = text_pipeline.classes_

        label_map = {
            "Low Risk":    "Low Risk",
            "Medium Risk": "Medium Risk",
            "High Risk":   "High Risk",
            # Legacy fallbacks
            "0":           "Low Risk",
            "1":           "Medium Risk",
            "2":           "High Risk",
            "Low":         "Low Risk",
            "Medium":      "Medium Risk",
            "High":        "High Risk",
            "non-suicide": "Low Risk",
            "suicide":     "High Risk",
        }

        result = {}
        for cls, prob in zip(classes, proba):
            display_label = label_map.get(str(cls), str(cls))
            pct = round(float(prob) * 100, 1)
            # If two raw classes map to the same display label, keep the higher prob
            result[display_label] = max(result.get(display_label, 0.0), pct)

        return result

    except Exception as e:
        print(f"[WARN] Text model prediction failed: {type(e).__name__}: {e}")
        traceback.print_exc()
        return {}


# ── Explanation ───────────────────────────────────────────────────────────────

def build_explanation(student_data: dict, top_features: dict, final_risk: str) -> str:
    friendly_names = {
        "Stress_Level":                "stress level",
        "Depression_Score":            "depression score",
        "Anxiety_Score":               "anxiety score",
        "Financial_Stress":            "financial stress",
        "Sleep_Quality":               "sleep quality",
        "Physical_Activity":           "physical activity",
        "Diet_Quality":                "diet quality",
        "Social_Support":              "social support",
        "Family_History":              "family history of mental illness",
        "Chronic_Illness":             "chronic illness",
        "CGPA":                        "academic performance (CGPA)",
        "Substance_Use":               "substance use",
        "Counseling_Service_Use":      "counseling history",
        "Extracurricular_Involvement": "extracurricular involvement",
        "Semester_Credit_Load":        "semester credit load",
        "Age":                         "age",
        "Gender":                      "gender",
        "Course":                      "field of study",
        "Residence_Type":              "living situation",
        "Relationship_Status":         "relationship status",
    }

    lines = [
        f"• {friendly_names.get(feat, feat).capitalize()}: "
        f"{student_data.get(feat, 'N/A')} (importance: {importance:.1%})"
        for feat, importance in top_features.items()
    ]

    return (
        f"The model predicted **{final_risk}** primarily based on these factors:\n"
        + "\n".join(lines)
    )


# ── Groq ──────────────────────────────────────────────────────────────────────

def _build_groq_prompt(
    student_data: dict,
    free_text: str,
    final_risk: str,
    explanation: str
) -> str:
    risk_instruction = {
        "High Risk": (
            "The student is at HIGH RISK. Your tone must be warm, urgent, and caring. "
            "Directly acknowledge their pain. Strongly encourage them to seek professional "
            "help or contact a crisis line immediately. Do not minimise their situation."
        ),
        "Medium Risk": (
            "The student is at MEDIUM RISK. Your tone should be empathetic and encouraging. "
            "Suggest practical coping strategies and recommend counselling as a proactive step. "
            "Help them build healthier habits without alarming them unnecessarily."
        ),
        "Low Risk": (
            "The student is at LOW RISK. Your tone should be warm and positive. "
            "Affirm their current coping and offer tips to maintain and improve their wellbeing."
        ),
    }.get(final_risk, "Your tone should be empathetic and supportive.")

    student_summary = "\n".join([
        f"  Age: {student_data.get('Age')}",
        f"  Course: {student_data.get('Course')}",
        f"  Gender: {student_data.get('Gender')}",
        f"  CGPA: {student_data.get('CGPA')}",
        f"  Stress level: {student_data.get('Stress_Level')}/5",
        f"  Depression score: {student_data.get('Depression_Score')}/5",
        f"  Anxiety score: {student_data.get('Anxiety_Score')}/5",
        f"  Sleep quality: {student_data.get('Sleep_Quality')}",
        f"  Physical activity: {student_data.get('Physical_Activity')}",
        f"  Diet quality: {student_data.get('Diet_Quality')}",
        f"  Social support: {student_data.get('Social_Support')}",
        f"  Financial stress: {student_data.get('Financial_Stress')}/5",
        f"  Family history of mental illness: {student_data.get('Family_History')}",
        f"  Counseling use: {student_data.get('Counseling_Service_Use')}",
        f"  Substance use: {student_data.get('Substance_Use')}",
        f"  Living situation: {student_data.get('Residence_Type')}",
    ])

    crisis_note = (
        f"\n\nIMPORTANT: Since this student is at {final_risk}, you MUST include "
        f"the following crisis resources naturally in the rag_response:\n{CRISIS_RESOURCES_TEXT}"
        if final_risk == "High Risk"
        else ""
    )

    return f"""You are a compassionate, trauma-informed mental health support assistant for university students.

TONE INSTRUCTION:
{risk_instruction}

STUDENT PROFILE:
{student_summary}

STUDENT'S OWN WORDS:
"{free_text.strip() if free_text.strip() else 'No message provided.'}"

AI RISK ASSESSMENT: {final_risk}

MODEL EXPLANATION (top factors driving this prediction):
{explanation}
{crisis_note}

RESPONSE FORMAT — respond with ONLY a valid JSON object, no markdown, no extra text:
{{
  "summary": "2-3 sentence warm empathetic summary of the student situation. Do not echo raw numbers.",
  "suggestions": [
    "Specific actionable suggestion tailored to this student profile",
    "Specific actionable suggestion tailored to this student profile",
    "Specific actionable suggestion tailored to this student profile",
    "Specific actionable suggestion tailored to this student profile"
  ],
  "crisis_resources": false,
  "rag_response": "A warm 3-4 paragraph personalised message. Paragraph 1: acknowledge how they feel. Paragraph 2: highlight 1-2 specific risk factors you noticed and why they matter. Paragraph 3: 2-3 concrete tailored coping recommendations. Paragraph 4: encouraging close."
}}

RULES:
- Be non-judgmental, warm, and specific
- Never use clinical jargon or echo raw score numbers back to the student
- Tailor every suggestion to this student's course, living situation, and lifestyle
- crisis_resources must be the boolean false for Medium and Low risk
- crisis_resources must be the boolean true for High Risk
- Output ONLY the JSON object, nothing before or after it
"""


def _safe_parse_groq(raw: str) -> dict:
    """
    Robustly parse Groq output into a dict.
    Handles: markdown fences, outer wrapper keys, bad booleans, non-dict returns.
    """
    raw = raw.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    # Extract only the JSON object (first { ... last })
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        raw = raw[start : end + 1]

    parsed = json.loads(raw)

    if not isinstance(parsed, dict):
        raise ValueError(
            f"Expected dict from Groq, got {type(parsed).__name__}: {parsed}"
        )

    # Unwrap single outer key if Groq wrapped the response
    if len(parsed) == 1:
        inner = next(iter(parsed.values()))
        if isinstance(inner, dict) and "summary" in inner:
            parsed = inner

    # Normalise crisis_resources to a real Python bool
    cr = parsed.get("crisis_resources", False)
    parsed["crisis_resources"] = (
        cr.strip().lower() == "true" if isinstance(cr, str) else bool(cr)
    )

    return {
        "summary":          str(parsed.get("summary", "")),
        "suggestions":      list(parsed.get("suggestions", [])),
        "crisis_resources": parsed["crisis_resources"],
        "rag_response":     str(parsed.get("rag_response", "")),
    }


def call_groq(
    student_data: dict,
    free_text: str,
    final_risk: str,
    explanation: str
) -> dict:
    """Calls Groq LLaMA and returns a guaranteed dict with all required keys."""
    prompt = _build_groq_prompt(student_data, free_text, final_risk, explanation)

    chat = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a compassionate university mental health support assistant. "
                    "You provide personalised, practical, and empathetic guidance to students. "
                    "You never diagnose. You always encourage professional help when needed. "
                    "You respond ONLY with a valid JSON object — "
                    "no markdown fences, no preamble, no explanation."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.65,
        max_tokens=1024,
    )

    raw = chat.choices[0].message.content.strip()
    print(f"[DEBUG] Groq raw response:\n{raw}\n")
    return _safe_parse_groq(raw)


# ── Main entry point ──────────────────────────────────────────────────────────

def assess_student(student_data: dict, free_text: str = "") -> dict:
    """
    Main entry point called by the FastAPI backend and Streamlit app.

    Returns a fully populated assessment dict with keys:
        final_risk, tabular_confidence, text_confidence,
        model_explanation, top_features,
        summary, suggestions, crisis_resources, rag_response
    """
    # 1. Tabular model (Random Forest)
    final_risk, tab_confidence, top_features, _ = tabular_predict(student_data)

    # 2. Text model (sklearn Pipeline: TF-IDF + Logistic Regression)
    text_confidence = text_predict(free_text)

    # 3. Human-readable model explanation
    explanation = build_explanation(student_data, top_features, final_risk)

    # 4. Groq LLaMA response (with fallback on any failure)
    try:
        groq_result = call_groq(student_data, free_text, final_risk, explanation)
    except Exception as e:
        print(f"[ERROR] Groq call failed: {type(e).__name__}: {e}")
        traceback.print_exc()
        groq_result = dict(FALLBACK_RESULT)
        groq_result["crisis_resources"] = (final_risk == "High Risk")
        if final_risk == "High Risk":
            groq_result["rag_response"] = (
                "Please reach out to a mental health professional for support.\n\n"
                + CRISIS_RESOURCES_TEXT
            )

    return {
        "final_risk":         final_risk,
        "tabular_confidence": tab_confidence,
        "text_confidence":    text_confidence,
        "model_explanation":  explanation,
        "top_features":       {k: round(v, 4) for k, v in top_features.items()},
        "summary":            groq_result.get("summary", ""),
        "suggestions":        groq_result.get("suggestions", []),
        "crisis_resources":   groq_result.get("crisis_resources", False),
        "rag_response":       groq_result.get("rag_response", ""),
    }