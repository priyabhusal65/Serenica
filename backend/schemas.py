"""
schemas.py
Pydantic v2 request / response schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Shared Config ─────────────────────────────────────────────
class OrmBase(BaseModel):
    model_config = {"from_attributes": True}


# ============================================================
# AUTH
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    age: Optional[int] = Field(None, ge=15, le=60)
    gender: Optional[str] = None
    course: Optional[str] = None
    cgpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    residence_type: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student_id: Optional[uuid.UUID] = None
    role: Optional[str] = None


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


# ============================================================
# STUDENT
# ============================================================

class StudentProfileResponse(OrmBase):
    id: uuid.UUID
    name: str
    email: str
    age: Optional[int]
    gender: Optional[str]
    course: Optional[str]
    cgpa: Optional[float]
    residence_type: Optional[str]
    created_at: datetime


class StudentProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    age: Optional[int] = Field(None, ge=15, le=60)
    gender: Optional[str] = None
    course: Optional[str] = None
    cgpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    residence_type: Optional[str] = None


class ProgressPoint(BaseModel):
    date: datetime
    risk_level: str
    stress_level: Optional[int]
    anxiety_score: Optional[int]
    depression_score: Optional[int]


# ============================================================
# ASSESSMENT
# ============================================================

class AssessmentSubmitRequest(BaseModel):
    # Numeric scales (1-10)
    stress_level: int = Field(..., ge=1, le=10)
    depression_score: int = Field(..., ge=1, le=10)
    anxiety_score: int = Field(..., ge=1, le=10)
    sleep_quality: int = Field(..., ge=1, le=10)
    physical_activity: int = Field(..., ge=1, le=10)
    diet_quality: int = Field(..., ge=1, le=10)
    social_support: int = Field(..., ge=1, le=10)
    financial_stress: int = Field(..., ge=1, le=10)
    extracurricular_involvement: int = Field(..., ge=1, le=10)
    semester_credit_load: int = Field(..., ge=1, le=30)

    # Categorical
    relationship_status: str
    residence_type: Optional[str] = None

    # Boolean flags
    substance_use: bool = False
    counseling_service_use: bool = False
    family_history: bool = False
    chronic_illness: bool = False

    # Free text
    free_text: Optional[str] = Field(None, max_length=2000)


# ── Feature importance item ───────────────────────────────────
class FeatureImportanceItem(BaseModel):
    feature: str
    value: float
    importance: float


class AssessmentResponse(OrmBase):
    id: uuid.UUID
    student_id: uuid.UUID
    final_risk: str
    tabular_risk: Optional[str]
    text_risk: Optional[str]
    tabular_confidence: Optional[float]
    text_confidence: Optional[float]
    summary: Optional[str]
    rag_response: Optional[str]
    created_at: datetime

    # NEW: rich ML breakdown — NOT stored in DB, populated by the route
    # after calling ml_service. Uses Any so they can be dicts/lists.
    tabular_probabilities: Optional[dict[str, float]] = None
    text_probabilities:    Optional[dict[str, float]] = None
    feature_importances:   Optional[list[FeatureImportanceItem]] = None

    model_config = {"from_attributes": True}


class AssessmentDetailResponse(AssessmentResponse):
    stress_level: Optional[int]
    depression_score: Optional[int]
    anxiety_score: Optional[int]
    sleep_quality: Optional[int]
    physical_activity: Optional[int]
    diet_quality: Optional[int]
    social_support: Optional[int]
    financial_stress: Optional[int]
    extracurricular_involvement: Optional[int]
    semester_credit_load: Optional[int]
    relationship_status: Optional[str]
    substance_use: bool
    counseling_service_use: bool
    family_history: bool
    chronic_illness: bool
    free_text: Optional[str]


# ============================================================
# RISK HISTORY
# ============================================================

class RiskHistoryItem(OrmBase):
    id: uuid.UUID
    assessment_id: uuid.UUID
    risk_level: str
    created_at: datetime


# ============================================================
# ADMIN DASHBOARD
# ============================================================

class ChartData(BaseModel):
    labels: list[str]
    values: list[float | int]


class AdminStatsResponse(BaseModel):
    total_students: int
    total_assessments: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    assessments_today: int


class HighRiskStudent(BaseModel):
    student_id: uuid.UUID
    name: str
    email: str
    course: Optional[str]
    risk_level: str
    last_assessment: datetime


class StudentHistoryResponse(BaseModel):
    student: StudentProfileResponse
    assessments: list[AssessmentDetailResponse]


class AverageScorePoint(BaseModel):
    date: str   # YYYY-MM-DD
    avg_stress: float
    avg_anxiety: float
    avg_depression: float