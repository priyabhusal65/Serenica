"""
services/analytics_service.py
All SQL / ORM queries that power the admin dashboard charts.
"""

from __future__ import annotations

import uuid as _uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models import Assessment, Student


# ── 1. Overall stats ──────────────────────────────────────────
async def get_admin_stats(db: AsyncSession) -> dict:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    total_students    = await db.scalar(select(func.count(Student.id)))
    total_assessments = await db.scalar(select(func.count(Assessment.id)))
    assessments_today = await db.scalar(
        select(func.count(Assessment.id)).where(Assessment.created_at >= today_start)
    )

    risk_counts = await db.execute(
        select(Assessment.final_risk, func.count(Assessment.id))
        .group_by(Assessment.final_risk)
    )
    risk_map = {row[0]: row[1] for row in risk_counts.fetchall()}

    return {
        "total_students":    total_students or 0,
        "total_assessments": total_assessments or 0,
        "high_risk_count":   risk_map.get("High Risk", 0),
        "medium_risk_count": risk_map.get("Medium Risk", 0),
        "low_risk_count":    risk_map.get("Low Risk", 0),
        "assessments_today": assessments_today or 0,
    }


# ── 2. Risk distribution (pie / bar) ─────────────────────────
async def get_risk_distribution(db: AsyncSession) -> dict:
    rows = await db.execute(
        select(Assessment.final_risk, func.count(Assessment.id))
        .group_by(Assessment.final_risk)
        .order_by(Assessment.final_risk)
    )
    data = {row[0]: row[1] for row in rows.fetchall() if row[0]}

    labels = ["Low Risk", "Medium Risk", "High Risk"]
    values = [data.get(lbl, 0) for lbl in labels]
    return {"labels": labels, "values": values}


# ── 3. Student growth (new students per week) ─────────────────
async def get_student_growth(db: AsyncSession, weeks: int = 12) -> dict:
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    rows = await db.execute(
        select(
            func.date_trunc("week", Student.created_at).label("week"),
            func.count(Student.id).label("count"),
        )
        .where(Student.created_at >= since)
        .group_by(text("week"))
        .order_by(text("week"))
    )
    records = rows.fetchall()
    labels = [r.week.strftime("%b %d") for r in records]
    values = [r.count for r in records]
    return {"labels": labels, "values": values}


# ── 4. Average scores over time ───────────────────────────────
async def get_average_scores_over_time(
    db: AsyncSession, days: int = 30
) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = await db.execute(
        select(
            func.date_trunc("day", Assessment.created_at).label("day"),
            func.avg(Assessment.stress_level).label("avg_stress"),
            func.avg(Assessment.anxiety_score).label("avg_anxiety"),
            func.avg(Assessment.depression_score).label("avg_depression"),
        )
        .where(Assessment.created_at >= since)
        .group_by(text("day"))
        .order_by(text("day"))
    )
    result = []
    for r in rows.fetchall():
        result.append({
            "date":           r.day.strftime("%Y-%m-%d"),
            "avg_stress":     round(float(r.avg_stress or 0), 2),
            "avg_anxiety":    round(float(r.avg_anxiety or 0), 2),
            "avg_depression": round(float(r.avg_depression or 0), 2),
        })
    return result


# ── 5. Students per course (bar) ──────────────────────────────
async def get_students_per_course(db: AsyncSession) -> dict:
    rows = await db.execute(
        select(Student.course, func.count(Student.id).label("count"))
        .where(Student.course.isnot(None))
        .group_by(Student.course)
        .order_by(func.count(Student.id).desc())
        .limit(15)
    )
    records = rows.fetchall()
    labels = [r.course for r in records]
    values = [r.count for r in records]
    return {"labels": labels, "values": values}


# ── 6. High-risk students list ────────────────────────────────
async def get_high_risk_students(db: AsyncSession, limit: int = 50) -> list[dict]:
    """
    FIX: replaced the fragile timestamp-equality join with a correlated
    subquery that fetches the latest assessment ID per student.
    Timestamp joins fail when microsecond precision differs between
    the subquery MAX() result and the actual stored value.
    """
    # Correlated subquery: for each Student row, get the ID of their
    # most recent assessment.
    latest_assessment_id = (
        select(Assessment.id)
        .where(Assessment.student_id == Student.id)
        .order_by(Assessment.created_at.desc())
        .limit(1)
        .correlate(Student)
        .scalar_subquery()
    )

    rows = await db.execute(
        select(Student, Assessment)
        .join(Assessment, Assessment.student_id == Student.id)
        .where(Assessment.id == latest_assessment_id)
        .where(Assessment.final_risk == "High Risk")
        .order_by(Assessment.created_at.desc())
        .limit(limit)
    )

    result = []
    for student, assessment in rows.fetchall():
        result.append({
            "student_id":      str(student.id),
            "name":            student.name,
            "email":           student.email,
            "course":          student.course,
            "risk_level":      assessment.final_risk,
            "last_assessment": assessment.created_at.isoformat(),
        })
    return result


# ── 7. Student history ────────────────────────────────────────
async def get_student_history(db: AsyncSession, student_id: str) -> dict | None:
    try:
        sid = _uuid.UUID(student_id)
    except ValueError:
        return None

    student_row = await db.get(Student, sid)
    if not student_row:
        return None

    assessments_rows = await db.execute(
        select(Assessment)
        .where(Assessment.student_id == sid)
        .order_by(Assessment.created_at.desc())
    )
    assessments = assessments_rows.scalars().all()

    return {"student": student_row, "assessments": list(assessments)}