"""
Smoke test de memória do agente V-Commerce.

Executa fluxos de conversa encadeados (follow-up) contra a API Gemini real,
validando se o agente mantém e utiliza corretamente o histórico (DA-22, DA-23).

As configuracoes compartilhadas (limites, timeouts, delays) estao em
smoke_test_config.py para garantir consistencia entre todos os smoke tests.
"""

import asyncio
import sqlite3
import sys
import tempfile
import time
from pathlib import Path

# Adiciona ai-agent/ ao PYTHONPATH para permitir imports do pacote src
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))

# ---------------------------------------------------------------------------
# 1. Criacao do banco de teste temporario (igual ao smoke_test.py)
# ---------------------------------------------------------------------------

def _create_test_db(path: str) -> None:
    """Popula banco SQLite temporario com schema minimo e dados sinteticos."""
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS dim_cliente (
            id_cliente INTEGER PRIMARY KEY,
            nome_cliente TEXT,
            regiao TEXT,
            segmento_rfm TEXT
        );
        CREATE TABLE IF NOT EXISTS dim_produto (
            id_produto INTEGER PRIMARY KEY,
            nome_produto TEXT,
            categoria TEXT,
            preco REAL
        );
        CREATE TABLE IF NOT EXISTS fato_vendas (
            id_pedido INTEGER PRIMARY KEY,
            id_cliente INTEGER,
            id_produto INTEGER,
            valor_total_venda REAL,
            id_data TEXT,
            status TEXT,
            quantidade_vendas INTEGER
        );
        CREATE TABLE IF NOT EXISTS fato_suporte_ticket (
            id_ticket INTEGER PRIMARY KEY,
            id_produto INTEGER,
            id_cliente INTEGER,
            status TEXT,
            tempo_resolucao_horas INTEGER
        );
        CREATE TABLE IF NOT EXISTS fato_avaliacoes_pedido (
            id_avaliacao INTEGER PRIMARY KEY,
            id_produto INTEGER,
            id_cliente INTEGER,
            nota_produto INTEGER,
            nota_nps INTEGER,
            data_avaliacao TEXT
        );
        CREATE TABLE IF NOT EXISTS dim_tempo (
            id_data TEXT PRIMARY KEY,
            data_completa TEXT,
            mes INTEGER,
            ano INTEGER,
            trimestre INTEGER
        );
        """
    )

    # Dados sinteticos minimos
    cur.executemany(
        "INSERT INTO dim_cliente (id_cliente, nome_cliente, regiao, segmento_rfm) VALUES (?, ?, ?, ?)",
        [
            (1, "Ana Silva", "Sudeste", "Campeões"),
            (2, "Bruno Costa", "Nordeste", "Regulares"),
            (3, "Carla Dias", "Sul", "Campeões"),
            (4, "Daniel Lima", "Sudeste", "Regulares"),
            (5, "Elisa Mendes", "Centro-Oeste", "Campeões"),
        ],
    )

    cur.executemany(
        "INSERT INTO dim_produto (id_produto, nome_produto, categoria, preco) VALUES (?, ?, ?, ?)",
        [
            (1, "Notebook X1", "Eletrônicos", 4500.00),
            (2, "Mouse Sem Fio", "Eletrônicos", 120.00),
            (3, "Cadeira Ergonômica", "Móveis", 850.00),
            (4, "Monitor 27\"", "Eletrônicos", 1400.00),
            (5, "Mesa Escritório", "Móveis", 600.00),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_vendas (id_pedido, id_cliente, id_produto, valor_total_venda, id_data, status, quantidade_vendas) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (1, 1, 1, 4500.00, "20240115", "Entregue", 1),
            (2, 1, 2, 120.00, "20240120", "Entregue", 1),
            (3, 2, 1, 4500.00, "20240210", "Entregue", 1),
            (4, 3, 3, 850.00, "20240212", "Entregue", 1),
            (5, 4, 4, 1400.00, "20240305", "Entregue", 1),
            (6, 5, 2, 120.00, "20240308", "Entregue", 1),
            (7, 2, 2, 120.00, "20240315", "Entregue", 1),
            (8, 1, 4, 1400.00, "20240401", "Entregue", 1),
            (9, 3, 1, 4500.00, "20240410", "Entregue", 1),
            (10, 4, 2, 120.00, "20240412", "Entregue", 1),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_suporte_ticket (id_ticket, id_produto, id_cliente, status, tempo_resolucao_horas) VALUES (?, ?, ?, ?, ?)",
        [
            (1, 1, 2, "Fechado", 24),
            (2, 2, 1, "Fechado", 4),
            (3, 1, 3, "Aberto", 72),
            (4, 3, 4, "Fechado", 12),
            (5, 2, 5, "Fechado", 8),
            (6, 1, 1, "Aberto", 1),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_avaliacoes_pedido (id_avaliacao, id_produto, id_cliente, nota_produto, nota_nps, data_avaliacao) VALUES (?, ?, ?, ?, ?, ?)",
        [
            (1, 1, 1, 5, 9, "2024-01-20"),
            (2, 2, 2, 4, 7, "2024-01-25"),
            (3, 1, 3, 5, 10, "2024-02-15"),
            (4, 3, 4, 3, 5, "2024-02-20"),
            (5, 4, 1, 4, 8, "2024-03-10"),
            (6, 2, 5, 4, 7, "2024-03-12"),
            (7, 1, 2, 4, 8, "2024-04-05"),
            (8, 4, 3, 5, 9, "2024-04-15"),
        ],
    )

    cur.executemany(
        "INSERT INTO dim_tempo (id_data, data_completa, mes, ano, trimestre) VALUES (?, ?, ?, ?, ?)",
        [
            ("20240115", "2024-01-15", 1, 2024, 1),
            ("20240120", "2024-01-20", 1, 2024, 1),
            ("20240210", "2024-02-10", 2, 2024, 1),
            ("20240212", "2024-02-12", 2, 2024, 1),
            ("20240305", "2024-03-05", 3, 2024, 1),
            ("20240308", "2024-03-08", 3, 2024, 1),
            ("20240315", "2024-03-15", 3, 2024, 1),
            ("20240401", "2024-04-01", 4, 2024, 2),
            ("20240410", "2024-04-10", 4, 2024, 2),
            ("20240412", "2024-04-12", 4, 2024, 2),
        ],
    )

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# 2. Execucao do smoke test de memoria
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from src.agent import VCommerceAgent
    from tests.integration.smoke_test_config import DELAY_BETWEEN_BATCHES_SECONDS
    from src.core.exceptions import LLMQuotaError

    agent = VCommerceAgent(db_path=db_path)
    
    print("\n" + "="*60)
    print("INICIANDO SMOKE TEST DE MEMÓRIA")
    print("="*60)

    # ---------------------------------------------------------
    # BLOCO 1 - Cadeia de Follow-up (S1, S2, S3)
    # ---------------------------------------------------------
    print("\n--- BLOCO 1: Cadeia de Follow-up ---")
    
    q1 = "Qual a receita total por regiao?"
    print(f"\nS1: {q1}")
    resp1 = await agent.ask(q1)
    print(f" SQL: {resp1.sql}")
    print(f" Resposta: {resp1.text}")
    
    await asyncio.sleep(20)

    q2 = "E qual regiao vendeu mais?"
    print(f"\nS2 (Follow-up): {q2}")
    resp2 = await agent.ask(q2)
    print(f" SQL: {resp2.sql}")
    print(f" Resposta: {resp2.text}")
    # O SQL deve conter ORDER BY DESC LIMIT 1 e referenciar as tabelas de vendas/clientes
    
    await asyncio.sleep(20)

    q3 = "Quantos pedidos essa regiao teve?"
    print(f"\nS3 (Follow-up do follow-up): {q3}")
    resp3 = await agent.ask(q3)
    print(f" SQL: {resp3.sql}")
    print(f" Resposta: {resp3.text}")
    # O SQL deve referenciar explicitamente a regiao retornada em S2.

    print(f"\n[AGUARDANDO] {DELAY_BETWEEN_BATCHES_SECONDS}s para respeitar o rate limit...")
    await asyncio.sleep(DELAY_BETWEEN_BATCHES_SECONDS)

    # ---------------------------------------------------------
    # BLOCO 2 - Clear History (S4)
    # ---------------------------------------------------------
    print("\n--- BLOCO 2: Clear History ---")
    agent.clear_history()
    print("Histórico limpo!")

    q4 = "Quais produtos custam mais de R$ 1000?"
    print(f"\nS4 (Independente): {q4}")
    resp4 = await agent.ask(q4)
    print(f" SQL: {resp4.sql}")
    print(f" Resposta: {resp4.text}")
    # Nao deve referenciar nada sobre regiao ou vendas.

    print(f"\n[AGUARDANDO] {DELAY_BETWEEN_BATCHES_SECONDS}s para respeitar o rate limit...")
    await asyncio.sleep(DELAY_BETWEEN_BATCHES_SECONDS)

    # ---------------------------------------------------------
    # BLOCO 3 - Export / Import (S5, S6)
    # ---------------------------------------------------------
    print("\n--- BLOCO 3: Export / Import ---")
    
    q5 = "Quantos tickets temos na base?"
    print(f"\nS5: {q5}")
    resp5 = await agent.ask(q5)
    print(f" SQL: {resp5.sql}")
    print(f" Resposta: {resp5.text}")

    await asyncio.sleep(20)

    # Exporta
    exported = agent.export_history()
    print(f"\n[Ação] Histórico exportado: {len(exported)} mensagens.")
    
    # Destroi o agente
    del agent
    print("[Ação] Agente destruído (simulando nova requisição HTTP).")
    
    # Recria agente vazio e importa
    agent = VCommerceAgent(db_path=db_path)
    agent.import_history(exported)
    print(f"[Ação] Novo agente criado. Histórico importado.")

    q6 = "Destes, quantos estao abertos?"
    print(f"\nS6 (Follow-up pós-import): {q6}")
    resp6 = await agent.ask(q6)
    print(f" SQL: {resp6.sql}")
    print(f" Resposta: {resp6.text}")

    print("\n" + "="*60)
    print("TESTE DE MEMÓRIA CONCLUÍDO")
    print("="*60)


def main() -> None:
    from src.core import config

    if not config.GEMINI_API_KEY:
        print("Erro: GEMINI_API_KEY nao esta definida no .env.")
        raise SystemExit(1)

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        print("Criando banco de teste temporario...")
        _create_test_db(db_path)
        print(f"Banco criado em: {db_path}\n")

        asyncio.run(_run_smoke_test(db_path))
    finally:
        Path(db_path).unlink(missing_ok=True)
        print(f"\nBanco temporario removido.")


if __name__ == "__main__":
    main()
