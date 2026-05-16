from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./banco_local.db"
    CSV_DIR: str = "./data"
    
    # App
    APP_NAME: str = "V-Commerce CRM 360"
    APP_VERSION: str = "1.0.0"
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Agent
    GEMINI_API_KEY: Optional[str] = None
    SCHEMA_DESCRIPTIONS_PATH: Optional[str] = None
    LLM_TEMPERATURE_INSIGHT: float = 0.3

    @property
    def DB_PATH(self) -> str:
        """Extrai o caminho do arquivo SQLite a partir do DATABASE_URL."""
        url = self.DATABASE_URL
        prefix = "sqlite+aiosqlite:///"
        if url.startswith(prefix):
            path = url[len(prefix):]
            import os
            return os.path.abspath(path)
        return self.DATABASE_URL

    RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_FROM_NAME: str = "V-Commerce CRM 360"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
