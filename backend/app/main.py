from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router # Importa o "cérebro" das rotas

# Importamos os modelos aqui para o SQLAlchemy/Alembic "sentirem" as tabelas
import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401
import app.models.orders   # noqa: F401
import app.models.category # noqa: F401
import app.models.products # noqa: F401
import app.models.satisfaction_agents  # noqa: F401
import app.models.problem_satisfaction  # noqa: F401

app = FastAPI(
    title="V-Commerce CRM 360",
    description="API do CRM 360 da V-Commerce",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ÚNICA LINHA DE ROTAS NECESSÁRIA:
app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "V-Commerce CRM 360 API está online"}