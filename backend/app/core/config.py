import os
import json
from typing import List, Any
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "CETCompass API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = Field(default="development", description="development | staging | production")
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG | INFO | WARNING | ERROR")
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./college_predictor.db",
        description="PostgreSQL URL (e.g. postgresql://user:pass@host:5432/db) or SQLite local fallback"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any) -> str:
        if isinstance(v, str):
            clean_url = v.strip()
            # Normalize postgres:// to postgresql:// for SQLAlchemy compatibility
            if clean_url.startswith("postgres://"):
                return clean_url.replace("postgres://", "postgresql://", 1)
            return clean_url
        return str(v)
    
    # Security & Auth
    ADMIN_API_KEY: str = Field(
        default=os.getenv("ADMIN_API_KEY", "admin_secret_key_123"),
        description="Secret key required for administrative operations"
    )
    JWT_SECRET: str = Field(
        default=os.getenv("JWT_SECRET", "supersecret_jwt_key_for_testing"),
        description="Secret key for JWT verification"
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        origins: List[str] = []
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        origins = [str(x).strip().rstrip("/") for x in parsed if x]
                except Exception:
                    origins = [x.strip().rstrip("/") for x in stripped.split(",") if x.strip()]
            else:
                origins = [x.strip().rstrip("/") for x in stripped.split(",") if x.strip()]
        elif isinstance(v, list):
            origins = [str(x).strip().rstrip("/") for x in v if x]

        # Also merge from CORS_ORIGINS or FRONTEND_URL environment variables
        env_cors = os.getenv("CORS_ORIGINS")
        if env_cors:
            for item in env_cors.split(","):
                clean = item.strip().rstrip("/")
                if clean and clean not in origins:
                    origins.append(clean)

        frontend_url = os.getenv("FRONTEND_URL")
        if frontend_url:
            clean = frontend_url.strip().rstrip("/")
            if clean and clean not in origins:
                origins.append(clean)

        return origins or [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    
    # Supabase (Optional for auth verification)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Ingestion default path
    DEFAULT_DATASET_PATH: str = os.getenv(
        "DEFAULT_DATASET_PATH", 
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "college_data_cleaned.xlsx")
    )

    model_config = {"case_sensitive": True, "env_file": ".env", "extra": "ignore"}

settings = Settings()
