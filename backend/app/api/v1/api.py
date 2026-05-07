# app/api/v1/api.py
from fastapi import APIRouter
from app.api.v1 import clients

api_router = APIRouter()

# Aqui você registra o seu router de clientes
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])