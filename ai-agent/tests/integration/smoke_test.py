"""
Smoke test manual do agente V-Commerce.

Cria um banco SQLite temporario com schema minimo das tabelas Gold,
instancia VCommerceAgent e executa 5 perguntas de fluxo feliz
contra a API Gemini real.

As configuracoes compartilhadas (limites, timeouts, delays) estao em
smoke_test_config.py para garantir consistencia entre todos os smoke tests.

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
# 2. Execucao do smoke test
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from src.agent import VCommerceAgent

    agent = VCommerceAgent(db_path=db_path)

    # 5 perguntas de fluxo feliz cobrindo diferentes domínios e tipos de saída.
    # NAO inclui guardrails (testados em smoke_test_guardrails.py) nem fora do escopo.
    questions = [
        # 1. Vendas - Receita por regiao (JOIN + SUM, retorna tabela + grafico bar)
        "Qual a receita total por regiao?",
        # 2. Vendas - Ticket medio (AVG escalar, retorna valor unico)
        "Qual o ticket medio dos pedidos?",
        # 3. Suporte - Tempo medio de resolucao (AVG escalar, outra tabela)
        "Qual o tempo medio de resolucao dos tickets?",
        # 4. Clientes - Segmentacao (COUNT + GROUP BY, retorna tabela + grafico bar)
        "Quantos clientes existem em cada segmento?",
        # 5. Clientes - Filtro por regiao (SELECT + WHERE, retorna tabela)
        "Quais clientes sao da regiao Sudeste?",
    ]

    from tests.integration.smoke_test_config import (
        BATCH_SIZE,
        DELAY_BETWEEN_BATCHES_SECONDS,
        MAX_API_CALLS_PER_DAY,
        MAX_DURATION_SECONDS,
    )

    from src.core.exceptions import LLMQuotaError

    total_start = time.perf_counter()
    max_duration = MAX_DURATION_SECONDS
    batch_size = BATCH_SIZE
    delay_between_batches = DELAY_BETWEEN_BATCHES_SECONDS

    results = []
    api_calls = 0
    quota_exhausted = False

    for i in range(0, len(questions), batch_size):
        batch = questions[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(questions) + batch_size - 1) // batch_size

        print(f"\n{'=' * 60}")
        print(f"LOTE {batch_num}/{total_batches}")
        print(f"{'=' * 60}")

        for idx, question in enumerate(batch):
            # Verifica timeout global
            elapsed_total = time.perf_counter() - total_start
            if elapsed_total >= max_duration:
                print(f"\n[TIMEOUT] Limite de 10 minutos atingido. Encerrando teste.")
                _print_summary(results, questions, api_calls)
                return

            print(f"\nPergunta: {question}")
            print("-" * 60)

            start = time.perf_counter()
            try:
                response = await agent.ask(question)
            except LLMQuotaError as exc:
                elapsed = time.perf_counter() - start
                print(f"[QUOTA ESGOTADA] ({elapsed:.2f}s): {exc}")
                print("\n[!] A chave de API atingiu o limite diario de 20 requisicoes.")
                print("[!] O teste sera encerrado. Execute novamente amanha ou use outra chave.")
                quota_exhausted = True
                _print_summary(results, questions, api_calls)
                return
            except Exception as exc:
                elapsed = time.perf_counter() - start
                error_msg = str(exc)
                # Fallback: detecta quota por mensagem
                if "Limite diario" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    print(f"[QUOTA ESGOTADA] ({elapsed:.2f}s): {error_msg}")
                    print("\n[!] A chave de API atingiu o limite diario de 20 requisicoes.")
                    print("[!] O teste sera encerrado. Execute novamente amanha ou use outra chave.")
                    quota_exhausted = True
                    _print_summary(results, questions, api_calls)
                    return
                print(f"[ERRO] ({elapsed:.2f}s): {exc}")
                results.append({
                    "question": question,
                    "status": "ERRO",
                    "elapsed": elapsed,
                    "error": error_msg,
                })
                api_calls += 1
                continue

            elapsed = time.perf_counter() - start

            # Estima chamadas API
            if elapsed < 0.5:
                calls = 0  # Bloqueado em guardrail pre-LLM
            elif response.out_of_scope:
                calls = 1
            else:
                calls = 2  # SQL + insight
            api_calls += calls

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

            print(f"   Chamadas API: {calls} | Total acumulado: {api_calls}/{MAX_API_CALLS_PER_DAY}")

        # Aguarda entre lotes (exceto apos o ultimo)
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
    print(f"Chamadas API estimadas: {api_calls}/20")
    print(f"{'=' * 60}")
    _print_summary(results, questions, api_calls)


def _print_summary(results: list, all_questions: list, api_calls: int = 0) -> None:
    """Imprime resumo dos resultados."""
    from tests.integration.smoke_test_config import MAX_API_CALLS_PER_DAY

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
        print(f"  - Nao executadas (timeout/quota): {skipped}")
    print(f"Chamadas API estimadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")

    if results:
        avg_time = sum(r["elapsed"] for r in results) / len(results)
        print(f"\nTempo medio por pergunta: {avg_time:.2f}s")

    for i, r in enumerate(results, 1):
        status_icon = "[OK]" if r["status"] == "SUCESSO" else f"[{r['status']}]"
        chart_info = f" | grafico={r.get('chart_type', 'n/a')}" if r.get("chart_type") else ""
        print(f"  {i}. {status_icon} ({r['elapsed']:.2f}s){chart_info} - {r['question'][:50]}...")


def main() -> None:
    # Forca o carregamento do .env (src.config ja faz isso no import)
    from src.core import config

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
