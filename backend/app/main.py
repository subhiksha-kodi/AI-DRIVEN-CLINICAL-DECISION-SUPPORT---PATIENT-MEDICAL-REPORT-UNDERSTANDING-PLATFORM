from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.database import engine, Base
from app.routes import auth_router, admin_router, doctors_router, patients_router, doctor_portal_router
from app.config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Admin Dashboard API",
    description="API for managing doctors, patients, and lab reports",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(doctors_router)
app.include_router(patients_router)
app.include_router(doctor_portal_router)

@app.get("/")
def root():
    return {"message": "Admin Dashboard API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
