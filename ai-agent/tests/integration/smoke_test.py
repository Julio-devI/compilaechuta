"""
Smoke test manual do agente V-Commerce.

Cria um banco SQLite temporario com schema minimo das tabelas Gold,
instancia VCommerceAgent e executa 5 perguntas de fluxo feliz
contra a API Gemini real.

As configuracoes compartilhadas (limites, timeouts, delays) estao em
smoke_tests_config.py para garantir consistencia entre todos os smoke tests.

Pré-requisito: variavel de ambiente GEMINI_API_KEY configurada no .env
"""

import asyncio
import sys
import tempfile
import time
from pathlib import Path

# Adiciona ai-agent/src ao path para permitir execução manual sem instalação editable.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT / "src"))
from tests.integration.smoke_test_db import create_test_db




# ---------------------------------------------------------------------------
# 2. Execucao do smoke test
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.agent import VCommerceAgent
    from tests.integration.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        MAX_DURATION_SECONDS,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
        wait_after_llm_interaction,
    )

    configure_llm_retries_for_smoke_tests()
    agent = VCommerceAgent(db_path=db_path)

    # 5 perguntas de fluxo feliz cobrindo diferentes dominios e tipos de saida.
    # NAO inclui guardrails (testados em smoke_test_guardrails.py) nem fora do escopo.
    scenarios = [
        {
            "question": "Qual a receita total por regiao?",
            "planned_calls": 2,
        },
        {
            "question": "Qual o ticket medio dos pedidos?",
            "planned_calls": 2,
        },
        {
            "question": "Qual o tempo medio de resolucao dos tickets?",
            "planned_calls": 2,
        },
        {
            "question": "Quantos clientes existem em cada segmento?",
            "planned_calls": 2,
        },
        {
            "question": "Quais clientes sao da regiao Sudeste?",
            "planned_calls": 2,
        },
    ]

    from vcommerce_ai_agent.core.exceptions import LLMQuotaError
    from tests.integration.smoke_error_utils import (
        print_exception,
        print_response_error,
        response_error_fields,
    )

    total_start = time.perf_counter()
    max_duration = MAX_DURATION_SECONDS

    results = []
    api_calls = 0

    print(f"\nOrcamento planejado: {sum(s['planned_calls'] for s in scenarios)}/{MAX_API_CALLS_PER_DAY} chamadas")

    for idx, scenario in enumerate(scenarios):
        question = scenario["question"]
        planned_calls = scenario["planned_calls"]
        is_last = idx == len(scenarios) - 1

        elapsed_total = time.perf_counter() - total_start
        if elapsed_total >= max_duration:
            print(f"\n[TIMEOUT] Limite de {max_duration}s atingido. Encerrando teste.")
            _print_summary(results, scenarios, api_calls)
            return

        if not ensure_daily_budget(api_calls, planned_calls):
            print(
                f"\n[ORCAMENTO ESGOTADO] Proximo cenario exigiria "
                f"{api_calls + planned_calls}/{MAX_API_CALLS_PER_DAY} chamadas."
            )
            _print_summary(results, scenarios, api_calls)
            return

        print(f"\nPergunta {idx + 1}/{len(scenarios)}: {question}")
        print("-" * 60)

        start = time.perf_counter()
        try:
            response = await agent.ask(question)
        except LLMQuotaError as exc:
            elapsed = time.perf_counter() - start
            print(f"[QUOTA ESGOTADA] ({elapsed:.2f}s): {exc}")
            _print_summary(results, scenarios, api_calls)
            return
        except Exception as exc:
            elapsed = time.perf_counter() - start
            error_msg = str(exc)
            if "Limite diario" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                print(f"[QUOTA ESGOTADA] ({elapsed:.2f}s): {error_msg}")
                _print_summary(results, scenarios, api_calls)
                return
            print(f"[EXCECAO] ({elapsed:.2f}s)")
            print_exception(exc)
            api_calls += planned_calls
            results.append({
                "question": question,
                "status": "ERRO",
                "elapsed": elapsed,
                "error": error_msg,
            })
            await wait_after_llm_interaction(planned_calls, is_last)
            continue

        elapsed = time.perf_counter() - start
        api_calls += planned_calls

        if response.status == "out_of_scope":
            print(f"[FORA DO ESCOPO] ({elapsed:.2f}s)")
            print(f"   Texto: {response.user_response.answer_text[:200]}")
            results.append({
                "question": question,
                "status": "FORA_DO_ESCOPO",
                "elapsed": elapsed,
                "sql": "",
            })
        elif response.status == "error":
            print(f"[ERRO] ({elapsed:.2f}s)")
            print(f"   Texto: {response.user_response.answer_text[:200]}")
            sql = response.developer_debug.sql
            print(f"   SQL  : {sql[:100] if sql else ''}")
            print_response_error(response)
            results.append({
                "question": question,
                "status": "ERRO",
                "elapsed": elapsed,
                "error": response.user_response.answer_text,
                "sql": sql,
                **response_error_fields(response),
            })
        else:
            print(f"[SUCESSO] ({elapsed:.2f}s)")
            print(f"   SQL  : {response.developer_debug.sql[:120]}...")
            print(f"   Texto: {response.user_response.answer_text[:200]}...")
            if response.user_response.data:
                print(f"   Dados: {len(response.user_response.data)} linha(s)")
            if response.user_response.chart:
                print(
                    f"   Grafico: {response.user_response.chart.type} "
                    f"(x={response.user_response.chart.x_axis}, "
                    f"y={response.user_response.chart.y_axis})"
                )
            results.append({
                "question": question,
                "status": "SUCESSO",
                "elapsed": elapsed,
                "sql": response.developer_debug.sql,
                "data_rows": (
                    len(response.user_response.data)
                    if response.user_response.data
                    else 0
                ),
                "chart_type": (
                    response.user_response.chart.type
                    if response.user_response.chart
                    else None
                ),
            })

        print(f"   Chamadas API planejadas: {planned_calls} | Total: {api_calls}/{MAX_API_CALLS_PER_DAY}")
        await wait_after_llm_interaction(planned_calls, is_last)

    total_elapsed = time.perf_counter() - total_start
    print(f"\n{'=' * 60}")
    print(f"TESTE FINALIZADO em {total_elapsed:.2f}s")
    print(f"Chamadas API planejadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")
    print(f"{'=' * 60}")
    _print_summary(results, scenarios, api_calls)


def _print_summary(results: list, all_questions: list, api_calls: int = 0) -> None:
    """Imprime resumo dos resultados."""
    from tests.integration.smoke_tests_config import MAX_API_CALLS_PER_DAY

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
        if r["status"] == "ERRO" and r.get("error_code"):
            print(
                f"      Erro: {r['error_code']} | "
                f"Stage: {r.get('error_stage')} | "
                f"Retryable: {r.get('error_retryable')}"
            )


def main() -> None:
    # Forca o carregamento do .env (config ja faz isso no import)
    from vcommerce_ai_agent.core import config

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
