from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging, logger
from backend.app.core.errors import register_exception_handlers
from backend.app.database.session import engine, Base
from backend.app.api.router import api_router

# Setup application logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION} in {settings.ENVIRONMENT} mode...")
    # Ensure database schema is provisioned
    Base.metadata.create_all(bind=engine)
    logger.info("Database connection and schema verified.")
    yield
    logger.info("Application shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    description=(
        "Production API for CETCompass — Maharashtra Engineering Recommendations (MHT-CET / JEE Main). "
        "Provides transparent, historical cutoff-based recommendations across 326 colleges, "
        "94 branches, and 77 seat categories. All recommendations are historical estimates, "
        "not official admission guarantees."
    )
)

# CORS configuration
explicit_origins = [origin for origin in settings.BACKEND_CORS_ORIGINS if origin != "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=explicit_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register structured exception handlers
register_exception_handlers(app)

# Include unified API Router under /api
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["System"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "version": settings.PROJECT_VERSION,
        "environment": settings.ENVIRONMENT,
        "disclaimer": (
            "Educational recommendation platform based on historical MHT-CET cutoffs. "
            "Not an official admission authority."
        )
    }

@app.get("/api/health", tags=["System"])
@app.get("/health", tags=["System"], include_in_schema=False)
def health_check():
    return {
        "status": "healthy",
        "version": settings.PROJECT_VERSION,
        "database": "connected"
    }

@app.get("/api/health/db", tags=["System"])
def database_health_check():
    """Detailed database connectivity probe."""
    try:
        from backend.app.database.session import SessionLocal
        from sqlalchemy import text
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "dialect": engine.dialect.name
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "degraded",
            "database": "error",
            "detail": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
