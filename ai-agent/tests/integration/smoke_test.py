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
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
from tests.integration.smoke_test_db import create_test_db




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
        create_test_db(db_path)
        print(f"Banco criado em: {db_path}\n")

        asyncio.run(_run_smoke_test(db_path))
    finally:
        Path(db_path).unlink(missing_ok=True)
        print(f"\nBanco temporario removido.")


if __name__ == "__main__":
    main()
