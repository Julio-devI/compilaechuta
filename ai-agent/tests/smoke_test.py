"""
Smoke test manual do agente V-Commerce (Branch 2).

Cria um banco SQLite temporario com schema minimo das tabelas Gold,
instancia VCommerceAgent e executa 10 perguntas de ponta a ponta
contra a API Gemini real.

As perguntas sao executadas em lotes de 2 (limite do free tier: 5 req/min),
com intervalo de 60s entre lotes.

Pré-requisito: variavel de ambiente GEMINI_API_KEY configurada no .env
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
# 1. Criacao do banco de teste temporario
# ---------------------------------------------------------------------------

def _create_test_db(path: str) -> None:
    """Popula um banco SQLite temporario com schema minimo e dados sinteticos."""
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
# 2. Execucao do smoke test
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from src.agent import VCommerceAgent

    agent = VCommerceAgent(db_path=db_path)

    # 10 perguntas cobrindo diferentes cenarios e domínios
    questions = [
        # 1. Vendas - Receita por regiao (ranking/comparacao)
        "Qual a receita total por regiao?",
        # 2. Vendas - Ticket medio (valor escalar)
        "Qual o ticket medio dos pedidos?",
        # 3. Suporte - Produtos com mais tickets
        "Quais produtos geram mais tickets de suporte?",
        # 4. Suporte - Tempo medio de resolucao (escalar)
        "Qual o tempo medio de resolucao dos tickets?",
        # 5. Avaliacoes - NPS por categoria
        "Qual o NPS medio por categoria de produto?",
        # 6. Avaliacoes - Ranking de notas
        "Quais produtos tem a melhor avaliacao dos clientes?",
        # 7. Clientes - Segmentacao
        "Quantos clientes existem em cada segmento?",
        # 8. Clientes - Filtro por regiao
        "Quais clientes sao da regiao Sudeste?",
        # 9. Fora do escopo
        "Me conte uma piada",
        # 10. Ambigua (deveria pedir esclarecimento ou assumir algo razoavel)
        "Qual a receita?",
    ]

    total_start = time.perf_counter()
    max_duration = 300  # 5 minutos
    batch_size = 2
    delay_between_batches = 75  # 1 minuto e 15 segundos

    results = []

    for i in range(0, len(questions), batch_size):
        batch = questions[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(questions) + batch_size - 1) // batch_size

        print(f"\n{'=' * 60}")
        print(f"LOTE {batch_num}/{total_batches}")
        print(f"{'=' * 60}")

        for question in batch:
            # Verifica timeout global
            elapsed_total = time.perf_counter() - total_start
            if elapsed_total >= max_duration:
                print(f"\n[TIMEOUT] Limite de 5 minutos atingido. Encerrando teste.")
                _print_summary(results, questions)
                return

            print(f"\nPergunta: {question}")
            print("-" * 60)

            start = time.perf_counter()
            try:
                response = await agent.ask(question)
            except Exception as exc:
                elapsed = time.perf_counter() - start
                print(f"[ERRO] ({elapsed:.2f}s): {exc}")
                results.append({
                    "question": question,
                    "status": "ERRO",
                    "elapsed": elapsed,
                    "error": str(exc),
                })
                continue

            elapsed = time.perf_counter() - start

            if response.out_of_scope:
                print(f"[FORA DO ESCOPO] ({elapsed:.2f}s)")
                print(f"   Texto: {response.text[:200]}")
                results.append({
                    "question": question,
                    "status": "FORA_DO_ESCOPO",
                    "elapsed": elapsed,
                    "sql": "",
                })
            elif response.error:
                print(f"[ERRO] ({elapsed:.2f}s)")
                print(f"   Texto: {response.text[:200]}")
                print(f"   SQL  : {response.sql[:100] if response.sql else ''}")
                results.append({
                    "question": question,
                    "status": "ERRO",
                    "elapsed": elapsed,
                    "error": response.text,
                    "sql": response.sql,
                })
            else:
                print(f"[SUCESSO] ({elapsed:.2f}s)")
                print(f"   SQL  : {response.sql[:120]}...")
                print(f"   Texto: {response.text[:200]}...")
                if response.data:
                    print(f"   Dados: {len(response.data)} linha(s)")
                if response.chart:
                    print(
                        f"   Grafico: {response.chart.type} "
                        f"(x={response.chart.x_axis}, y={response.chart.y_axis})"
                    )
                results.append({
                    "question": question,
                    "status": "SUCESSO",
                    "elapsed": elapsed,
                    "sql": response.sql,
                    "data_rows": len(response.data) if response.data else 0,
                    "chart_type": response.chart.type if response.chart else None,
                })

        # Aguarda 60s entre lotes (exceto apos o ultimo)
        if i + batch_size < len(questions):
            elapsed_total = time.perf_counter() - total_start
            remaining = max_duration - elapsed_total
            wait_time = min(delay_between_batches, remaining)

            if wait_time > 0:
                print(f"\n[AGUARDANDO] {wait_time:.0f}s para respeitar o rate limit...")
                await asyncio.sleep(wait_time)
            else:
                print(f"\n[TIMEOUT] Tempo restante insuficiente. Encerrando.")
                break

    total_elapsed = time.perf_counter() - total_start
    print(f"\n{'=' * 60}")
    print(f"TESTE FINALIZADO em {total_elapsed:.2f}s")
    print(f"{'=' * 60}")
    _print_summary(results, questions)


def _print_summary(results: list, all_questions: list) -> None:
    """Imprime resumo dos resultados."""
    print("\n--- RESUMO ---")
    success_count = sum(1 for r in results if r["status"] == "SUCESSO")
    oos_count = sum(1 for r in results if r["status"] == "FORA_DO_ESCOPO")
    error_count = sum(1 for r in results if r["status"] == "ERRO")
    skipped = len(all_questions) - len(results)

    print(f"Total de perguntas: {len(all_questions)}")
    print(f"Respondidas: {len(results)}")
    print(f"  - Sucesso: {success_count}")
    print(f"  - Fora do escopo: {oos_count}")
    print(f"  - Erro: {error_count}")
    if skipped:
        print(f"  - Nao executadas (timeout): {skipped}")

    if results:
        avg_time = sum(r["elapsed"] for r in results) / len(results)
        print(f"\nTempo medio por pergunta: {avg_time:.2f}s")

    for i, r in enumerate(results, 1):
        status_icon = "[OK]" if r["status"] == "SUCESSO" else f"[{r['status']}]"
        chart_info = f" | grafico={r.get('chart_type', 'n/a')}" if r.get("chart_type") else ""
        print(f"  {i}. {status_icon} ({r['elapsed']:.2f}s){chart_info} - {r['question'][:50]}...")


def main() -> None:
    # Forca o carregamento do .env (src.config ja faz isso no import)
    from src import config

    if not config.GEMINI_API_KEY:
        print(
            "Erro: GEMINI_API_KEY nao esta definida.\n"
            "Verifique o arquivo .env na raiz do projeto."
        )
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
