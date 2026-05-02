# main.py
from fastapi import FastAPI

# Inicializa a aplicação
app = FastAPI(
    title="Minha API",
    description="Um boilerplate básico de FastAPI",
    version="1.0.0"
)

# Rota básica (Health check)
@app.get("/")
async def root():
    return {"message": "Olá, FastAPI!"}

# Exemplo de rota com parâmetro
@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}