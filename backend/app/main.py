import os
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.seed import seed_database_if_needed

if settings.GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
os.environ.setdefault(
    "LLM_TEMPERATURE_INSIGHT", str(settings.LLM_TEMPERATURE_INSIGHT)
)

from app.api.v1.ai_agent import cleanup_session_locks_loop
from app.api.v1.api import api_router # Importa o "cérebro" das rotas

# Importamos os modelos aqui para o SQLAlchemy/Alembic "sentirem" as tabelas
import app.models.ai_agent  # noqa: F401
import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401
import app.models.products  # noqa: F401
import app.models.category  # noqa: F401
import app.models.orders  # noqa: F401
import app.models.orders_evaluation  # noqa: F401
import app.models.operator  # noqa: F401
import app.models.satisfaction_agents  # noqa: F401
import app.models.problem_satisfaction  # noqa: F401
import app.models.time  # noqa: F401
import app.models.clickstream  # noqa: F401

# Configura logger do agente de IA
import json
class ExtraFormatter(logging.Formatter):
    def format(self, record):
        s = super().format(record)
        extra = {k: v for k, v in record.__dict__.items() if k not in logging.LogRecord('', 0, '', 0, '', (), None).__dict__ and k != 'message'}
        if extra:
            s += f" | {json.dumps(extra, default=str, ensure_ascii=False)}"
        return s

vcommerce_ai_logger = logging.getLogger("vcommerce_ai_agent")
vcommerce_ai_logger.setLevel(logging.INFO)
if not vcommerce_ai_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(ExtraFormatter("%(name)s - %(levelname)s - %(message)s"))
    vcommerce_ai_logger.addHandler(handler)

# Logger do namespace da aplicação (app.*), usado por app.core.seed e similares.
# Necessário porque uvicorn não configura o root logger em INFO por padrão.
app_logger = logging.getLogger("app")
app_logger.setLevel(logging.INFO)
app_logger.propagate = False  # evita duplicar quando o root também tiver handler (alembic.ini)
if not app_logger.handlers:
    app_handler = logging.StreamHandler()
    app_handler.setFormatter(
        logging.Formatter("%(asctime)s | %(name)s | %(levelname)s | %(message)s")
    )
    app_logger.addHandler(app_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_database_if_needed()
    cleanup_task = asyncio.create_task(cleanup_session_locks_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="V-Commerce CRM 360",
    description="API do CRM 360 da V-Commerce",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "V-Commerce CRM 360 API está online"}