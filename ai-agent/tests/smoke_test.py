"""
Smoke test manual do agente V-Commerce (Branch 2).

Cria um banco SQLite temporário com schema mínimo das tabelas Gold,
instancia VCommerceAgent e executa 2–3 perguntas de ponta a ponta
contra a API Gemini real.

Pré-requisito: variável de ambiente GEMINI_API_KEY configurada.
"""

import asyncio
import os
import sqlite3
import sys
import tempfile
import time
from pathlib import Path

# Adiciona ai-agent/ ao PYTHONPATH para permitir imports do pacote src
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))

# ---------------------------------------------------------------------------
# 1. Criação do banco de teste temporário
# ---------------------------------------------------------------------------

def _create_test_db(path: str) -> None:
    """Popula um banco SQLite temporário com schema mínimo e dados sintéticos."""
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

    # Dados sintéticos mínimos
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
            (1, "Notebook X1", "Eletrônicos", 4500.00),
            (2, "Mouse Sem Fio", "Eletrônicos", 120.00),
            (3, "Cadeira Ergonômica", "Móveis", 850.00),
            (4, "Monitor 27\"", "Eletrônicos", 1400.00),
            (5, "Mesa Escritório", "Móveis", 600.00),
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
# 2. Execução do smoke test
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from src.agent import VCommerceAgent

    agent = VCommerceAgent(db_path=db_path)

    questions = [
        "Quais os produtos mais vendidos?",
        "Qual o NPS médio por categoria de produto?",
        "Me conte uma piada",
    ]

    for question in questions:
        print(f"\n{'=' * 60}")
        print(f"Pergunta: {question}")
        print("=" * 60)

        start = time.perf_counter()
        try:
            response = await agent.ask(question)
        except Exception as exc:
            elapsed = time.perf_counter() - start
            print(f"❌ ERRO ({elapsed:.2f}s): {exc}")
            continue

        elapsed = time.perf_counter() - start

        if response.out_of_scope:
            print(f"⛔ FORA DO ESCOPO ({elapsed:.2f}s)")
            print(f"   Texto: {response.text}")
        elif response.error:
            print(f"❌ ERRO ({elapsed:.2f}s)")
            print(f"   Texto: {response.text}")
            print(f"   SQL  : {response.sql}")
        else:
            print(f"✅ SUCESSO ({elapsed:.2f}s)")
            print(f"   SQL  : {response.sql}")
            print(f"   Texto: {response.text[:200]}...")
            if response.data:
                print(f"   Dados: {len(response.data)} linha(s)")
            if response.chart:
                print(
                    f"   Gráfico: {response.chart.type} "
                    f"(x={response.chart.x_axis}, y={response.chart.y_axis})"
                )


def main() -> None:
    if not os.getenv("GEMINI_API_KEY"):
        print(
            "Erro: GEMINI_API_KEY não está definida.\n"
            "Exporte a variável antes de executar:\n"
            "  export GEMINI_API_KEY='sua-chave-aqui'"
        )
        raise SystemExit(1)

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        print("Criando banco de teste temporário...")
        _create_test_db(db_path)
        print(f"Banco criado em: {db_path}\n")

        asyncio.run(_run_smoke_test(db_path))
    finally:
        Path(db_path).unlink(missing_ok=True)
        print(f"\nBanco temporário removido.")


if __name__ == "__main__":
    main()
