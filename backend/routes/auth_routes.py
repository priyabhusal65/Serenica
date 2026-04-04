"""
routes/auth_routes.py
POST /auth/register    — student registration
POST /auth/login       — student login
POST /auth/admin/login — admin login
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AdminUser, Student
from schemas import AdminLoginRequest, LoginRequest, RegisterRequest, TokenResponse
from utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Student Register ──────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    existing = await db.scalar(select(Student).where(Student.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    student = Student(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        age=payload.age,
        gender=payload.gender,
        course=payload.course,
        cgpa=payload.cgpa,
        residence_type=payload.residence_type,
    )
    db.add(student)
    await db.flush()  # materialise the UUID before the token is created

    token = create_access_token({"sub": str(student.id), "role": "student"})
    return TokenResponse(access_token=token, student_id=student.id, role="student")


# ── Student Login ─────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    student = await db.scalar(select(Student).where(Student.email == payload.email))
    if not student or not verify_password(payload.password, student.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": str(student.id), "role": "student"})
    return TokenResponse(access_token=token, student_id=student.id, role="student")


# ── Admin Login ───────────────────────────────────────────────
@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(payload: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    admin = await db.scalar(select(AdminUser).where(AdminUser.email == payload.email))
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )
    token = create_access_token({"sub": str(admin.id), "role": admin.role})
    return TokenResponse(access_token=token, role=admin.role)