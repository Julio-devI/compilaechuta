import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

if settings.GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
os.environ.setdefault(
    "LLM_TEMPERATURE_INSIGHT", str(settings.LLM_TEMPERATURE_INSIGHT)
)

from app.api.v1.ai_agent import cleanup_session_locks_loop

import app.models.ai_agent  # noqa: F401
import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401
import app.models.products  # noqa: F401
import app.models.category  # noqa: F401
import app.models.orders  # noqa: F401
import app.models.operator  # noqa: F401

from app.api.v1.api import api_router

# Configura logger do agente de IA
vcommerce_ai_logger = logging.getLogger("vcommerce_ai_agent")
vcommerce_ai_logger.setLevel(logging.INFO)
if not vcommerce_ai_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(name)s - %(levelname)s - %(message)s"))
    vcommerce_ai_logger.addHandler(handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "V-Commerce CRM 360 API está online"}