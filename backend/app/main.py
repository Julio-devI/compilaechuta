from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router

app = FastAPI(
    title="Compila e Chuta API",
    description="API do backend para o projeto Compila e Chuta",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "ok",
        "message": "Bem-vindo à API do Compila e Chuta! Acesse /docs para ver a documentação."
    }

app.include_router(api_router, prefix="/api/v1")
