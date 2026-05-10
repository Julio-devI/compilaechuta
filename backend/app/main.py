from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.v1.clients import router as clientes_router
from app.api.v1.tickets import router as tickets_router

import app.models.clients  # noqa: F401
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
app.include_router(tickets_router,  prefix="/tickets",  tags=["Tickets"])


@app.get("/", tags=["Health"])
async def root():
    return {"message": "V-Commerce CRM 360 API está online"}