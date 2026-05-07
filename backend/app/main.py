from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from backend.app.api.clients import router as clientes_router

# registra todos os models para o create_all funcionar
import backend.app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401

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

app.include_router(clientes_router, prefix="/clientes", tags=["Clientes"])
# Os demais routers serão adicionados aqui conforme forem implementados:
# app.include_router(pedidos_router,    prefix="/pedidos",    tags=["Pedidos"])
# app.include_router(produtos_router,   prefix="/produtos",   tags=["Produtos"])
# app.include_router(categorias_router, prefix="/categorias", tags=["Categorias"])
# app.include_router(tickets_router,    prefix="/tickets",    tags=["Tickets"])
# app.include_router(dashboard_router,  prefix="/dashboard",  tags=["Dashboard"])
# app.include_router(chat_router,       prefix="/chat",       tags=["Agente IA"])


@app.get("/")
def root():
    return {"message": "V-Commerce CRM 360 API está online"}