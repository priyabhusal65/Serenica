"""
main.py  —  FastAPI application entry point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from utils.config import settings
from services.ml_service import load_models

from routes.auth_routes import router as auth_router
from routes.student_routes import router as student_router
from routes.assessment_routes import router as assessment_router
from routes.admin_routes import router as admin_router
from routes.account_routes import router as account_router   # ← ADD THIS


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    load_models()
    print("✅  Database tables verified.")
    print("✅  ML models loaded.")
    yield
    # Shutdown
    await engine.dispose()
    print("🔒  Application shut down.")


app = FastAPI(
    title="Student Mental Health Risk Assessment API",
    description="University mental health monitoring — Random Forest + TF-IDF + Groq LLM.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(student_router)
app.include_router(assessment_router)
app.include_router(admin_router)
app.include_router(account_router)         # ← ADD THIS


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Mental Health API is running."}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "version": "1.0.0"}