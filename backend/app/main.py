from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1.clients import router as clientes_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.products import router as produtos_router
from app.api.v1.category import router as categorias_router
from app.api.v1.orders import router as pedidos_router
from app.api.v1.dashboard import router as dashboards_router
from app.api.v1.operator import router as operadores_router
from app.api.v1.auth import router as auth_router

import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401
import app.models.products  # noqa: F401
import app.models.category  # noqa: F401
import app.models.orders  # noqa: F401
import app.models.operator  # noqa: F401


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