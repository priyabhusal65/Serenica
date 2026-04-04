"""
routes/assessment_routes.py
POST /assessment/submit  — full ML + LLM pipeline
GET  /assessment/{id}    — retrieve one assessment

FIX: The submit endpoint now injects tabular_proba and text_proba
     (full per-class probability dicts) into the AssessmentResponse
     that is returned to the frontend. These are NOT persisted to the
     DB (no column exists) — they come from the AssessmentResult
     dataclass produced by ml_service and are attached to the
     response object before returning.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Assessment, RiskHistory, Student
from schemas import AssessmentDetailResponse, AssessmentResponse, AssessmentSubmitRequest
from services import groq_service, ml_service
from utils.dependencies import get_current_student

router = APIRouter(prefix="/assessment", tags=["Assessment"])


@router.post("/submit", response_model=AssessmentResponse, status_code=201)
async def submit_assessment(
    payload: AssessmentSubmitRequest,
    current: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Full pipeline:
    1. Run ML models (tabular + text) — now returns full proba dicts
    2. Call Groq LLM for personalised response
    3. Persist to Supabase
    4. Return AssessmentResponse with proba dicts injected
    """
    # ── 1. ML inference ───────────────────────────────────────
    student_dict = payload.model_dump()
    ml_result = ml_service.assess_student(
        student_data=student_dict,
        free_text=payload.free_text or "",
    )

    # ── 2. Groq LLM ───────────────────────────────────────────
    student_info = {
        "name":   current.name,
        "course": current.course or "their studies",
    }
    assessment_info = {
        **student_dict,
        "final_risk": ml_result.final_risk,
    }
    rag_response = await groq_service.get_llm_response(
        student_data=student_info,
        assessment=assessment_info,
        suggestions=ml_result.suggestions,
    )

    # ── 3. Persist assessment ─────────────────────────────────
    assessment = Assessment(
        student_id=current.id,
        stress_level=payload.stress_level,
        depression_score=payload.depression_score,
        anxiety_score=payload.anxiety_score,
        sleep_quality=payload.sleep_quality,
        physical_activity=payload.physical_activity,
        diet_quality=payload.diet_quality,
        social_support=payload.social_support,
        financial_stress=payload.financial_stress,
        extracurricular_involvement=payload.extracurricular_involvement,
        semester_credit_load=payload.semester_credit_load,
        relationship_status=payload.relationship_status,
        substance_use=payload.substance_use,
        counseling_service_use=payload.counseling_service_use,
        family_history=payload.family_history,
        chronic_illness=payload.chronic_illness,
        free_text=payload.free_text,
        tabular_risk=ml_result.tabular_risk,
        text_risk=ml_result.text_risk,
        final_risk=ml_result.final_risk,
        tabular_confidence=ml_result.tabular_confidence,
        text_confidence=ml_result.text_confidence,
        summary=ml_result.summary,
        rag_response=rag_response,
    )
    db.add(assessment)
    await db.flush()

    # ── 4. Persist risk history ───────────────────────────────
    history_entry = RiskHistory(
        student_id=current.id,
        assessment_id=assessment.id,
        risk_level=ml_result.final_risk,
    )
    db.add(history_entry)

    # ── 5. FIX: Build response with proba dicts injected ─────
    # AssessmentResponse is an ORM-backed schema but tabular_proba
    # and text_proba have no DB columns — we build the response
    # manually so we can attach the in-memory proba dicts.
    response = AssessmentResponse.model_validate(assessment)
    response.tabular_probabilities = ml_result.tabular_proba
    response.text_probabilities    = ml_result.text_proba
    return response


@router.get("/{assessment_id}", response_model=AssessmentDetailResponse)
async def get_assessment(
    assessment_id: str,
    current: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    try:
        aid = uuid.UUID(assessment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid assessment ID")

    assessment = await db.get(Assessment, aid)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.student_id != current.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return assessment