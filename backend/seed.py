# backend/seed.py
#
# Popula o banco local com os CSVs da camada Gold gerados pelo Databricks.
# Substitui o seed anterior que simulava as métricas a partir dos CSVs brutos.
#
# Uso:
#   python seed.py
#
# Configuração:
#   Defina CSV_DIR no .env apontando para a pasta com os CSVs Gold.
#   Ex: CSV_DIR=C:/Users/usuario/Downloads/gold-csvs

import asyncio
import os
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text
from app.core.database import AsyncSessionLocal, engine, Base
import app.models.clients  # noqa: F401
import app.models.tickets  # noqa: F401

load_dotenv()

DATA_DIR = Path(os.getenv("CSV_DIR", "./data"))

# Mapeamento: nome da tabela → arquivo CSV
TABELAS = {
    "dim_cliente":              "dim_cliente.csv",
    "fato_suporte_ticket":      "fato_suporte_ticket.csv",
}


def carregar_csv(caminho: Path) -> pd.DataFrame:
    df = pd.read_csv(caminho)
    # remove coluna de controle do pipeline, não vai pro banco
    if "timestamp_ingestion_gold" in df.columns:
        df = df.drop(columns=["timestamp_ingestion_gold"])
    return df


async def seed():
    print("🔧 Criando tabelas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for tabela, arquivo in TABELAS.items():
            caminho = DATA_DIR / arquivo
            if not caminho.exists():
                print(f"⚠️  {arquivo} não encontrado em {DATA_DIR} — pulando.")
                continue

            print(f"📥 Carregando {arquivo}...")
            df = carregar_csv(caminho)

            print(f"🗑️  Limpando tabela {tabela}...")
            await session.execute(text(f"DELETE FROM {tabela}"))
            await session.commit()

            print(f"💾 Inserindo {len(df)} registros em {tabela}...")
            batch_size = 1000
            records = df.to_dict(orient="records")
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                await session.execute(
                    text(f"INSERT INTO {tabela} ({', '.join(batch[0].keys())}) VALUES ({', '.join([f':{k}' for k in batch[0].keys()])})"),
                    batch
                )
                await session.commit()
                print(f"   ✅ {min(i + batch_size, len(records))}/{len(records)}")

        print("🎉 Seed concluído!")


if __name__ == "__main__":
    asyncio.run(seed())