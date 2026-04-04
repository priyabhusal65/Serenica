"""
routes/admin_routes.py
Admin Dashboard endpoints — all require admin JWT.

GET /admin/stats
GET /admin/risk-distribution-chart
GET /admin/student-growth-chart
GET /admin/average-score-chart
GET /admin/students-per-course-chart
GET /admin/high-risk-students
GET /admin/student-history/{student_id}
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AdminUser
from schemas import (
    AdminStatsResponse,
    AverageScorePoint,
    ChartData,
    HighRiskStudent,
    StudentHistoryResponse,
)
from services import analytics_service
from utils.dependencies import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await analytics_service.get_admin_stats(db)
    return AdminStatsResponse(**data)


@router.get("/risk-distribution-chart", response_model=ChartData)
async def risk_distribution_chart(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_risk_distribution(db)


@router.get("/student-growth-chart", response_model=ChartData)
async def student_growth_chart(
    weeks: int = 12,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_student_growth(db, weeks=weeks)


@router.get("/average-score-chart", response_model=list[AverageScorePoint])
async def average_score_chart(
    days: int = 30,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_average_scores_over_time(db, days=days)


@router.get("/students-per-course-chart", response_model=ChartData)
async def students_per_course_chart(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await analytics_service.get_students_per_course(db)


@router.get("/high-risk-students", response_model=list[HighRiskStudent])
async def high_risk_students(
    limit: int = 50,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = await analytics_service.get_high_risk_students(db, limit=limit)
    return [HighRiskStudent(**r) for r in rows]


@router.get("/student-history/{student_id}", response_model=StudentHistoryResponse)
async def student_history(
    student_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await analytics_service.get_student_history(db, student_id)
    if not data:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentHistoryResponse(
        student=data["student"],
        assessments=data["assessments"],
    )