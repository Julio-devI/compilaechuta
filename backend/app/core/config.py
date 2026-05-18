from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


BACKEND_ROOT = Path(__file__).resolve().parents[2]
SQLITE_ASYNC_PREFIX = "sqlite+aiosqlite:///"
DEFAULT_DATABASE_URL = (
    f"{SQLITE_ASYNC_PREFIX}{(BACKEND_ROOT / 'vcommerce.db').as_posix()}"
)


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    CSV_DIR: str = "./data"
    AUTO_SEED_DATABASE: bool = True
    
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
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        """Normaliza URLs SQLite relativas para a raiz do backend."""
        url = self.DATABASE_URL
        if not url.startswith(SQLITE_ASYNC_PREFIX):
            return url

        raw_path = url[len(SQLITE_ASYNC_PREFIX):]
        path = Path(raw_path)
        if not path.is_absolute():
            path = BACKEND_ROOT / path

        return f"{SQLITE_ASYNC_PREFIX}{path.resolve().as_posix()}"

    @property
    def DB_PATH(self) -> str:
        """Extrai o caminho do arquivo SQLite a partir do DATABASE_URL."""
        url = self.SQLALCHEMY_DATABASE_URL
        if url.startswith(SQLITE_ASYNC_PREFIX):
            return url[len(SQLITE_ASYNC_PREFIX):]
        return url

    @property
    def AI_AGENT_SCHEMA_DESCRIPTIONS_PATH(self) -> str | None:
        """Resolve o JSON de descrições do schema usado pelo agente de IA."""
        if self.SCHEMA_DESCRIPTIONS_PATH and self.SCHEMA_DESCRIPTIONS_PATH.strip():
            return self.SCHEMA_DESCRIPTIONS_PATH

        default_path = (
            Path(__file__).resolve().parents[2]
            / "config"
            / "schema_descriptions.json"
        )
        return str(default_path) if default_path.exists() else None

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
