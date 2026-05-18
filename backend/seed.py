import sqlite3
import pandas as pd

conn = sqlite3.connect("vcommerce.db")

tabelas = [
    "dim_cliente",
    "dim_produto",
    "dim_tempo",
    "fato_vendas",
    "fato_avaliacoes_pedido", 
    "fato_clickstream_navegacao",
    "fato_suporte_ticket",
    "gold_satisfacao_agente",
    "gold_satisfacao_problema",
    "gold_categoria"
]

for tabela in tabelas:
    caminho_csv = f"data/{tabela}.csv"

    df = pd.read_csv(caminho_csv)

    if "timestamp_ingestion_gold" in df.columns:
        df = df.drop(columns=["timestamp_ingestion_gold"])

    df.to_sql(
        tabela,
        conn,
        if_exists="append",
        index=False
    )

    print(f"✅ {tabela} populada")

conn.close()

print("✅ Banco SQLite criado com sucesso!")
