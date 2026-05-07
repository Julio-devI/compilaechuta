# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos o roteador central da v1
from app.api.v1.api import api_router
from app.core.config import settings

# Importante: Registamos os models aqui para garantir que o SQLAlchemy
# os reconheça. Removemos o prefixo "backend." para evitar conflitos.
import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401

app = FastAPI(
    title="V-Commerce CRM 360",
    description="API do CRM 360 da V-Commerce",
    version="1.0.0",
)

# Configuração de CORS profissional usando os seus settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if hasattr(settings, "CORS_ORIGINS") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluímos o roteador central. 
# Agora todas as suas rotas começam com /api/v1/
# Exemplo: seu GET de clientes será /api/v1/clients/
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "message": "V-Commerce CRM 360 API está online. Acesse /docs para ver a documentação."
    }