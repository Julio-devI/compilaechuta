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
from app.api.v1.ai_agent import router as ai_agent_router
from app.api.v1.clients import router as clientes_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.products import router as produtos_router
from app.api.v1.category import router as categorias_router
from app.api.v1.orders import router as pedidos_router
from app.api.v1.dashboard import router as dashboards_router
from app.api.v1.operator import router as operadores_router
from app.api.v1.auth import router as auth_router

import app.models.ai_agent  # noqa: F401
import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401
import app.models.products  # noqa: F401
import app.models.category  # noqa: F401
import app.models.orders  # noqa: F401
import app.models.operator  # noqa: F401

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

app.include_router(ai_agent_router, prefix="/ai-agent", tags=["AI Agent"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(clientes_router, prefix="/clientes", tags=["Clientes"])
app.include_router(tickets_router,  prefix="/tickets",  tags=["Tickets"])
app.include_router(produtos_router, prefix="/produtos", tags=["Produtos"])
app.include_router(categorias_router, prefix="/categorias", tags=["Categorias"])
app.include_router(pedidos_router, prefix="/pedidos", tags=["Pedidos"])
app.include_router(dashboards_router, prefix="/dashboards", tags=["Dashboards"])
app.include_router(operadores_router, prefix="/operadores", tags=["Operadores"])


@app.get("/", tags=["Health"])
async def root():
    return {"message": "V-Commerce CRM 360 API está online"}