"""
models.py
SQLAlchemy ORM models — mirrors the Supabase schema exactly.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey,
    Integer, Numeric, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


# ── Students ──────────────────────────────────────────────────
class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(50))
    course: Mapped[str | None] = mapped_column(String(255))
    cgpa: Mapped[float | None] = mapped_column(Numeric(4, 2))
    residence_type: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    assessments: Mapped[list["Assessment"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    risk_histories: Mapped[list["RiskHistory"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )


# ── Assessments ───────────────────────────────────────────────
class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )

    # Questionnaire
    stress_level: Mapped[int | None] = mapped_column(Integer)
    depression_score: Mapped[int | None] = mapped_column(Integer)
    anxiety_score: Mapped[int | None] = mapped_column(Integer)
    sleep_quality: Mapped[int | None] = mapped_column(Integer)
    physical_activity: Mapped[int | None] = mapped_column(Integer)
    diet_quality: Mapped[int | None] = mapped_column(Integer)
    social_support: Mapped[int | None] = mapped_column(Integer)
    relationship_status: Mapped[str | None] = mapped_column(String(50))
    substance_use: Mapped[bool] = mapped_column(Boolean, default=False)
    counseling_service_use: Mapped[bool] = mapped_column(Boolean, default=False)
    family_history: Mapped[bool] = mapped_column(Boolean, default=False)
    chronic_illness: Mapped[bool] = mapped_column(Boolean, default=False)
    financial_stress: Mapped[int | None] = mapped_column(Integer)
    extracurricular_involvement: Mapped[int | None] = mapped_column(Integer)
    semester_credit_load: Mapped[int | None] = mapped_column(Integer)

    free_text: Mapped[str | None] = mapped_column(Text)

    # ML results
    tabular_risk: Mapped[str | None] = mapped_column(String(50))
    text_risk: Mapped[str | None] = mapped_column(String(50))
    final_risk: Mapped[str | None] = mapped_column(String(50))
    tabular_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    text_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))

    # LLM / RAG
    summary: Mapped[str | None] = mapped_column(Text)
    rag_response: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["Student"] = relationship(back_populates="assessments")
    risk_history: Mapped[list["RiskHistory"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )


# ── Risk History ──────────────────────────────────────────────
class RiskHistory(Base):
    __tablename__ = "risk_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    student: Mapped["Student"] = relationship(back_populates="risk_histories")
    assessment: Mapped["Assessment"] = relationship(back_populates="risk_history")


# ── Admin Users ───────────────────────────────────────────────
class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="admin")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )