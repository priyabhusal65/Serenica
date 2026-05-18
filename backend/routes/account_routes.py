"""
routes/account_routes.py
Password management and admin creation endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Student, AdminUser
from schemas import ChangePasswordRequest, AddAdminRequest, MessageResponse
from utils.security import verify_password, hash_password
from utils.dependencies import get_current_student, get_current_admin

router = APIRouter(tags=["Account"])


# ── Student changes their own password ────────────────────────
@router.post("/student/change-password", response_model=MessageResponse)
async def student_change_password(
    body: ChangePasswordRequest,
    current_user: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match",
        )
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    current_user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


# ── Admin changes their own password ─────────────────────────
@router.post("/admin/change-password", response_model=MessageResponse)
async def admin_change_password(
    body: ChangePasswordRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if body.new_password != body.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match",
        )
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    current_admin.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


# ── Admin adds a new admin account ───────────────────────────
@router.post("/admin/add-admin", response_model=MessageResponse)
async def add_admin(
    body: AddAdminRequest,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An admin account with this email already exists",
        )

    new_admin = AdminUser(
        email=body.email,
        password_hash=hash_password(body.password),
        role="admin",
    )
    db.add(new_admin)
    await db.commit()
    return {"message": f"Admin account created for {body.email}"}