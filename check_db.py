import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Conecta diretamente no banco vcommerce.db especificado
DATABASE_URL = "sqlite+aiosqlite:///backend/vcommerce.db"

# Create the async SQLAlchemy engine
engine = create_async_engine(DATABASE_URL)

async def main():
    try:
        async with engine.begin() as connection:
            print(f"Conectado ao banco de dados: {DATABASE_URL}")
            print("Criando índices...")
            
            # Criação de índices para otimizar as queries de tickets e pedidos
            await connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ticket_id_pedido ON fato_suporte_ticket(id_pedido);"))
            await connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ticket_status ON fato_suporte_ticket(status);"))
            await connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ticket_status ON dim_produto(nome_produto);"))
            await connection.execute(text("CREATE INDEX IF NOT EXISTS idx_ticket_pedido_status ON fato_suporte_ticket(id_pedido, status);"))
            await connection.execute(text("CREATE INDEX IF NOT EXISTS idx_vendas_status ON fato_vendas(status);"))
            
            print("Índices criados com sucesso!")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    asyncio.run(main())
