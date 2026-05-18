from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.seed import seed_database_if_needed
from app.api.v1.api import api_router  # Importa o "cérebro" das rotas

import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401
import app.models.orders   # noqa: F401
import app.models.category  # noqa: F401
import app.models.products  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_database_if_needed()
    yield


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
