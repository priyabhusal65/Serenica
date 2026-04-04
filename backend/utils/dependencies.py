"""
utils/dependencies.py
Reusable FastAPI dependencies for authentication.
"""

import uuid

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import AdminUser, Student
from utils.security import decode_access_token

# HTTPBearer shows a simple text box in Swagger — just paste your token
bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_student(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Student:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials        # extract raw token string
        payload = decode_access_token(token)
        student_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if student_id is None or role != "student":
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(Student).where(Student.id == uuid.UUID(student_id)))
    student = result.scalar_one_or_none()
    if student is None:
        raise credentials_exc
    return student


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials        # extract raw token string
        payload = decode_access_token(token)
        admin_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if admin_id is None or role not in ("admin", "super_admin"):
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(AdminUser).where(AdminUser.id == uuid.UUID(admin_id)))
    admin = result.scalar_one_or_none()
    if admin is None:
        raise credentials_exc
    return admin