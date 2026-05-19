"""
Smoke test dedicado a validar a decisao do agente sobre retorno de graficos.

Cria um banco SQLite temporario com schema minimo, instancia VCommerceAgent
e executa 6 perguntas variadas: metade espera chart preenchido, metade espera
chart=None. Valida que o agente decide corretamente quando sugerir grafico.

As configuracoes compartilhadas estao em smoke_tests_config.py.

Pré-requisito: variavel de ambiente GEMINI_API_KEY configurada no .env
"""

import asyncio
import sys
import tempfile
import time
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT / "src"))
from tests.smoke.smoke_test_db import create_test_db


async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.agent import VCommerceAgent
    from tests.smoke.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        MAX_DURATION_SECONDS,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
        wait_after_llm_interaction,
    )
    from vcommerce_ai_agent.core.exceptions import LLMQuotaError
    from tests.smoke.smoke_error_utils import (
        print_exception,
        print_response_error,
        response_error_fields,
    )

    configure_llm_retries_for_smoke_tests()
    agent = VCommerceAgent(db_path=db_path)

    scenarios = [
        {
            "question": "Mostre um grafico de barras com a receita por regiao",
            "planned_calls": 2,
            "expects_chart": True,
            "expected_type": "bar",
        },
        {
            "question": "Qual a receita total geral?",
            "planned_calls": 2,
            "expects_chart": False,
        },
        {
            "question": "Liste todos os clientes do segmento Campeão",
            "planned_calls": 2,
            "expects_chart": False,
        },
        {
            "question": "Qual a evolucao mensal de vendas?",
            "planned_calls": 2,
            "expects_chart": True,
            "expected_type": ("line", "area"),
        },
        {
            "question": "Quais produtos geram mais tickets de suporte?",
            "planned_calls": 2,
            "expects_chart": True,
            "expected_type": "bar",
        },
        {
            "question": "Mostre um grafico de pizza com a distribuicao de pedidos por status",
            "planned_calls": 2,
            "expects_chart": True,
            "expected_type": "pie",
        },
    ]

    total_start = time.perf_counter()
    max_duration = MAX_DURATION_SECONDS

    results = []
    api_calls = 0
    validations_passed = 0
    validations_failed = 0

    print(f"\nOrçamento planejado: {sum(s['planned_calls'] for s in scenarios)}/{MAX_API_CALLS_PER_DAY} chamadas")
    print("=" * 70)
    print("OBJETIVO: Validar que o agente decide corretamente quando retornar grafico")
    print("=" * 70)

    for idx, scenario in enumerate(scenarios):
        question = scenario["question"]
        planned_calls = scenario["planned_calls"]
        is_last = idx == len(scenarios) - 1
        expects_chart = scenario["expects_chart"]
        expected_type = scenario.get("expected_type")

        elapsed_total = time.perf_counter() - total_start
        if elapsed_total >= max_duration:
            print(f"\n[TIMEOUT] Limite de {max_duration}s atingido. Encerrando teste.")
            _print_summary(results, scenarios, api_calls, validations_passed, validations_failed)
            return

        if not ensure_daily_budget(api_calls, planned_calls):
            print(
                f"\n[ORÇAMENTO ESGOTADO] Próximo cenário exigiria "
                f"{api_calls + planned_calls}/{MAX_API_CALLS_PER_DAY} chamadas."
            )
            _print_summary(results, scenarios, api_calls, validations_passed, validations_failed)
            return

        print(f"\nCenário {idx + 1}/{len(scenarios)}: {question}")
        print(f"   Esperado: chart={'preencido' if expects_chart else 'null'}")
        if expected_type:
            type_label = expected_type if isinstance(expected_type, str) else f"{expected_type[0]} ou {expected_type[1]}"
            print(f"   Tipo esperado (se houver): {type_label}")
        print("-" * 60)

        start = time.perf_counter()
        try:
            response = await agent.ask(question)
        except LLMQuotaError as exc:
            elapsed = time.perf_counter() - start
            print(f"[QUOTA ESGOTADA] ({elapsed:.2f}s): {exc}")
            _print_summary(results, scenarios, api_calls, validations_passed, validations_failed)
            return
        except Exception as exc:
            elapsed = time.perf_counter() - start
            error_msg = str(exc)
            if "Limite diario" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                print(f"[QUOTA ESGOTADA] ({elapsed:.2f}s): {error_msg}")
                _print_summary(results, scenarios, api_calls, validations_passed, validations_failed)
                return
            print(f"[EXCEÇÃO] ({elapsed:.2f}s)")
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
            chart = response.user_response.chart
            chart_type = chart.type if chart else None
            print(f"[SUCESSO] ({elapsed:.2f}s)")
            print(f"   SQL  : {response.developer_debug.sql[:120]}...")
            print(f"   Texto: {response.user_response.answer_text[:200]}...")
            if response.user_response.data:
                print(f"   Dados: {len(response.user_response.data)} linha(s)")
            if chart:
                print(
                    f"   Gráfico: {chart.type} "
                    f"(x={chart.x_axis}, y={chart.y_axis})"
                )
            else:
                print("   Gráfico: null")

            # Validação principal deste smoke test
            validation_ok = True
            validation_msgs = []

            if expects_chart:
                if chart is None:
                    validation_ok = False
                    validation_msgs.append("Esperava chart preenchido, mas veio null")
                elif expected_type:
                    if isinstance(expected_type, tuple):
                        if chart_type not in expected_type:
                            validation_ok = False
                            validation_msgs.append(
                                f"Tipo esperado {expected_type}, veio {chart_type}"
                            )
                    elif chart_type != expected_type:
                        validation_ok = False
                        validation_msgs.append(
                            f"Tipo esperado {expected_type}, veio {chart_type}"
                        )

                if chart is not None and response.user_response.data:
                    sample_keys = set(response.user_response.data[0].keys())
                    if chart.x_axis is not None and chart.x_axis not in sample_keys:
                        validation_ok = False
                        validation_msgs.append(
                            f"x_axis '{chart.x_axis}' não existe nos dados"
                        )
                    if chart.y_axis is not None and chart.y_axis not in sample_keys:
                        validation_ok = False
                        validation_msgs.append(
                            f"y_axis '{chart.y_axis}' não existe nos dados"
                        )
            else:
                if chart is not None:
                    validation_ok = False
                    validation_msgs.append(f"Esperava chart=null, mas veio {chart_type}")

            if validation_ok:
                validations_passed += 1
                print("   [VALIDAÇÃO OK]")
            else:
                validations_failed += 1
                for msg in validation_msgs:
                    print(f"   [FALHA] {msg}")

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
                "chart_type": chart_type,
                "validation_ok": validation_ok,
                "validation_msgs": validation_msgs,
            })

        print(f"   Chamadas API planejadas: {planned_calls} | Total: {api_calls}/{MAX_API_CALLS_PER_DAY}")
        await wait_after_llm_interaction(planned_calls, is_last)

    total_elapsed = time.perf_counter() - total_start
    print(f"\n{'=' * 70}")
    print(f"TESTE FINALIZADO em {total_elapsed:.2f}s")
    print(f"Chamadas API planejadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")
    print(f"{'=' * 70}")
    _print_summary(results, scenarios, api_calls, validations_passed, validations_failed)


def _print_summary(
    results: list,
    all_questions: list,
    api_calls: int = 0,
    validations_passed: int = 0,
    validations_failed: int = 0,
) -> None:
    from tests.smoke.smoke_tests_config import MAX_API_CALLS_PER_DAY

    print("\n--- RESUMO ---")
    success_count = sum(1 for r in results if r["status"] == "SUCESSO")
    oos_count = sum(1 for r in results if r["status"] == "FORA_DO_ESCOPO")
    error_count = sum(1 for r in results if r["status"] == "ERRO")
    skipped = len(all_questions) - len(results)

    print(f"Total de cenários: {len(all_questions)}")
    print(f"Executados: {len(results)}")
    print(f"  - Sucesso: {success_count}")
    print(f"  - Fora do escopo: {oos_count}")
    print(f"  - Erro: {error_count}")
    if skipped:
        print(f"  - Não executados (timeout/quota): {skipped}")
    print(f"Chamadas API estimadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")
    print(f"Validações do chart: {validations_passed} OK | {validations_failed} falha(s)")

    if results:
        avg_time = sum(r["elapsed"] for r in results) / len(results)
        print(f"\nTempo médio por cenário: {avg_time:.2f}s")

    for i, r in enumerate(results, 1):
        status_icon = "[OK]" if r["status"] == "SUCESSO" else f"[{r['status']}]"
        chart_info = f" | gráfico={r.get('chart_type', 'n/a')}"
        val_info = ""
        if r.get("validation_msgs"):
            val_info = f" | FALHAS: {'; '.join(r['validation_msgs'])}"
        print(
            f"  {i}. {status_icon} ({r['elapsed']:.2f}s){chart_info}"
            f"{' | VALIDAÇÃO OK' if r.get('validation_ok') else val_info}"
            f" - {r['question'][:50]}..."
        )
        if r["status"] == "ERRO" and r.get("error_code"):
            print(
                f"      Erro: {r['error_code']} | "
                f"Stage: {r.get('error_stage')} | "
                f"Retryable: {r.get('error_retryable')}"
            )


def main() -> None:
    from tests.smoke.smoke_tests_config import resolve_api_key

    api_key = resolve_api_key(sys.argv[1:])
    if not api_key:
        print(
            "Erro: GEMINI_API_KEY não definida.\n"
            "Use --api-key SUA_CHAVE ou defina a variável de ambiente."
        )
        raise SystemExit(1)

    import os
    from vcommerce_ai_agent.core import config

    config.GEMINI_API_KEY = api_key
    os.environ["GEMINI_API_KEY"] = api_key

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        print("Criando banco de teste temporário...")
        create_test_db(db_path)
        print(f"Banco criado em: {db_path}\n")

        asyncio.run(_run_smoke_test(db_path))
    finally:
        Path(db_path).unlink(missing_ok=True)
        print("\nBanco temporário removido.")


if __name__ == "__main__":
    main()
