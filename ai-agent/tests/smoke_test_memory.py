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
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY,
            nome TEXT,
            regiao TEXT,
            segmento TEXT
        );
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY,
            nome TEXT,
            categoria TEXT,
            preco REAL
        );
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY,
            cliente_id INTEGER,
            produto_id INTEGER,
            valor REAL,
            data TEXT,
            status TEXT
        );
        CREATE TABLE IF NOT EXISTS tickets_suporte (
            id INTEGER PRIMARY KEY,
            produto_id INTEGER,
            cliente_id INTEGER,
            status TEXT,
            tempo_resolucao_horas INTEGER
        );
        CREATE TABLE IF NOT EXISTS avaliacoes (
            id INTEGER PRIMARY KEY,
            produto_id INTEGER,
            cliente_id INTEGER,
            nota INTEGER,
            nps INTEGER,
            data TEXT
        );
        """
    )

    # Dados sinteticos minimos
    cur.executemany(
        "INSERT INTO clientes (id, nome, regiao, segmento) VALUES (?, ?, ?, ?)",
        [
            (1, "Ana Silva", "Sudeste", "Premium"),
            (2, "Bruno Costa", "Nordeste", "Standard"),
            (3, "Carla Dias", "Sul", "Premium"),
            (4, "Daniel Lima", "Sudeste", "Standard"),
            (5, "Elisa Mendes", "Centro-Oeste", "Premium"),
        ],
    )

    cur.executemany(
        "INSERT INTO produtos (id, nome, categoria, preco) VALUES (?, ?, ?, ?)",
        [
            (1, "Notebook X1", "Eletronicos", 4500.00),
            (2, "Mouse Sem Fio", "Eletronicos", 120.00),
            (3, "Cadeira Ergonomica", "Moveis", 850.00),
            (4, "Monitor 27\"", "Eletronicos", 1400.00),
            (5, "Mesa Escritorio", "Moveis", 600.00),
        ],
    )

    cur.executemany(
        "INSERT INTO pedidos (id, cliente_id, produto_id, valor, data, status) VALUES (?, ?, ?, ?, ?, ?)",
        [
            (1, 1, 1, 4500.00, "2024-01-15", "Entregue"),
            (2, 1, 2, 120.00, "2024-01-20", "Entregue"),
            (3, 2, 1, 4500.00, "2024-02-10", "Entregue"),
            (4, 3, 3, 850.00, "2024-02-12", "Entregue"),
            (5, 4, 4, 1400.00, "2024-03-05", "Entregue"),
            (6, 5, 2, 120.00, "2024-03-08", "Entregue"),
            (7, 2, 2, 120.00, "2024-03-15", "Entregue"),
            (8, 1, 4, 1400.00, "2024-04-01", "Entregue"),
            (9, 3, 1, 4500.00, "2024-04-10", "Entregue"),
            (10, 4, 2, 120.00, "2024-04-12", "Entregue"),
        ],
    )

    cur.executemany(
        "INSERT INTO tickets_suporte (id, produto_id, cliente_id, status, tempo_resolucao_horas) VALUES (?, ?, ?, ?, ?)",
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
        "INSERT INTO avaliacoes (id, produto_id, cliente_id, nota, nps, data) VALUES (?, ?, ?, ?, ?, ?)",
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

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# 2. Execucao do smoke test de memoria
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from src.agent import VCommerceAgent
    from tests.smoke_test_config import DELAY_BETWEEN_BATCHES_SECONDS
    from src.exceptions import LLMQuotaError

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
    from src import config

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
