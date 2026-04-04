"""
routes/student_routes.py
GET  /student/profile
PUT  /student/profile
GET  /student/history
GET  /student/progress-chart
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Assessment, RiskHistory, Student
from schemas import (
    AssessmentDetailResponse,
    ProgressPoint,
    StudentProfileResponse,
    StudentProfileUpdate,
)
from utils.dependencies import get_current_student

router = APIRouter(prefix="/student", tags=["Student"])


@router.get("/profile", response_model=StudentProfileResponse)
async def get_profile(current: Student = Depends(get_current_student)):
    return current


@router.put("/profile", response_model=StudentProfileResponse)
async def update_profile(
    payload: StudentProfileUpdate,
    current: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        # Nothing to update — return current profile unchanged
        return current
    for field, value in update_data.items():
        setattr(current, field, value)
    # db.add() is needed when the object may have been loaded in a different session
    db.add(current)
    await db.flush()
    return current


@router.get("/history", response_model=list[AssessmentDetailResponse])
async def get_history(
    current: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Assessment)
        .where(Assessment.student_id == current.id)
        .order_by(Assessment.created_at.desc())
    )
    return rows.scalars().all()


@router.get("/progress-chart", response_model=list[ProgressPoint])
async def get_progress_chart(
    current: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Assessment)
        .where(Assessment.student_id == current.id)
        .order_by(Assessment.created_at.asc())
    )
    assessments = rows.scalars().all()
    return [
        ProgressPoint(
            date=a.created_at,
            risk_level=a.final_risk or "Unknown",
            stress_level=a.stress_level,
            anxiety_score=a.anxiety_score,
            depression_score=a.depression_score,
        )
        for a in assessments
    ]