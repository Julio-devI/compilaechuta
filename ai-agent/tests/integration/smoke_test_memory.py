"""
Smoke test de memória do agente V-Commerce.

Executa fluxos de conversa encadeados (follow-up) contra a API Gemini real,
validando se o agente mantém e utiliza corretamente o histórico (DA-22, DA-23).

As configuracoes compartilhadas (limites, timeouts, delays) estao em
smoke_tests_config.py para garantir consistencia entre todos os smoke tests.
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
# 2. Execucao do smoke test de memoria
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.agent import VCommerceAgent
    from vcommerce_ai_agent.core.exceptions import LLMQuotaError
    from tests.integration.smoke_error_utils import (
        print_exception,
        print_response_error,
        response_error_fields,
    )
    from tests.integration.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
        wait_after_llm_interaction,
    )

    configure_llm_retries_for_smoke_tests()
    agent = VCommerceAgent(db_path=db_path)
    results: list[dict] = []
    api_calls = 0
    total_start = time.perf_counter()
    
    print("\n" + "="*60)
    print("INICIANDO SMOKE TEST DE MEMORIA (7 TURNOS = 14 CALLS API)")
    print("="*60)

    scenarios = [
        {"label": "S1", "question": "Qual a receita total por regiao?", "planned_calls": 2},
        {"label": "S2", "question": "E qual regiao vendeu mais?", "planned_calls": 2},
        {"label": "S3", "question": "Quantos pedidos essa regiao teve?", "planned_calls": 2},
        {
            "label": "S4",
            "question": "Quais foram os 3 produtos mais vendidos nessa regiao?",
            "planned_calls": 2,
        },
        {
            "label": "S5",
            "question": "Qual deles teve a maior avaliacao media?",
            "planned_calls": 2,
        },
        {
            "label": "S9",
            "question": "Voltando a regiao que mais vendeu, quantos clientes moram la?",
            "planned_calls": 2,
            "after_export_import": True,
        },
        {
            "label": "S10",
            "question": "E quantos desses clientes sao do segmento Campeões?",
            "planned_calls": 2,
        },
    ]

    print(f"\nOrcamento planejado: {sum(s['planned_calls'] for s in scenarios)}/{MAX_API_CALLS_PER_DAY} chamadas")
    print("\n--- BLOCO 1: Cadeia Extensa de Follow-up (5 Turnos) ---")

    for index, scenario in enumerate(scenarios):
        if scenario.get("after_export_import"):
            print("\n--- BLOCO 2: Export / Import ---")
            exported = agent.export_history()
            print(
                f"\n[ACAO] Historico exportado: {len(exported)} mensagens "
                f"({len(exported) // 2} turnos)."
            )
            del agent
            print("[ACAO] Agente destruido (simulando nova requisicao HTTP).")

            agent = VCommerceAgent(db_path=db_path)
            agent.import_history(exported)
            print("[ACAO] Novo agente criado. Historico importado com sucesso.")

        planned_calls = scenario["planned_calls"]
        is_last = index == len(scenarios) - 1

        if not ensure_daily_budget(api_calls, planned_calls):
            print(
                f"\n[ORCAMENTO ESGOTADO] Proximo turno exigiria "
                f"{api_calls + planned_calls}/{MAX_API_CALLS_PER_DAY} chamadas."
            )
            break

        print(f"\n{scenario['label']}: {scenario['question']}")
        start = time.perf_counter()
        try:
            resp = await agent.ask(scenario["question"])
        except LLMQuotaError as exc:
            elapsed = time.perf_counter() - start
            print(f" [QUOTA ESGOTADA] ({elapsed:.2f}s): {exc}")
            break
        except Exception as exc:
            elapsed = time.perf_counter() - start
            print(f" [EXCECAO] ({elapsed:.2f}s)")
            print_exception(exc)
            api_calls += planned_calls
            results.append({
                "label": scenario["label"],
                "status": "EXCECAO",
                "elapsed": elapsed,
                "error": str(exc),
            })
            print("[ABORTANDO] Cadeia de memoria depende do turno anterior.")
            break

        elapsed = time.perf_counter() - start
        api_calls += planned_calls

        if resp.status == "error":
            status = "ERRO"
        elif resp.status == "out_of_scope":
            status = "FORA_DO_ESCOPO"
        else:
            status = "SUCESSO"

        passed = status == "SUCESSO"
        if passed:
            print(f" SQL: {resp.developer_debug.sql}")
            print(f" Resposta: {resp.user_response.answer_text}")
        else:
            print(f" [FALHA] Status: {status}")
            print(f" SQL: {resp.developer_debug.sql}")
            print(f" Resposta: {resp.user_response.answer_text}")
            if resp.developer_debug.error:
                print_response_error(resp, indent=" ")
            print("[ABORTANDO] Cadeia de memoria depende do turno anterior.")

        results.append({
            "label": scenario["label"],
            "status": status,
            "passed": passed,
            "elapsed": elapsed,
            "sql": resp.developer_debug.sql,
            **response_error_fields(resp),
        })

        if not passed:
            break

        await wait_after_llm_interaction(planned_calls, is_last)

    total_elapsed = time.perf_counter() - total_start
    print("\n" + "="*60)
    print(f"TESTE DE MEMORIA FINALIZADO em {total_elapsed:.2f}s")
    print(f"Chamadas API planejadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")
    print("="*60)
    _print_summary(results, scenarios)


def _print_summary(results: list[dict], scenarios: list[dict]) -> None:
    """Imprime resumo do smoke test de memoria."""
    passed = sum(1 for result in results if result.get("passed"))
    failed = len(results) - passed
    skipped = len(scenarios) - len(results)

    print("\n--- RESUMO DA MEMORIA ---")
    print(f"Total de turnos: {len(scenarios)}")
    print(f"Executados: {len(results)}")
    print(f"  - Passaram: {passed}")
    print(f"  - Falharam: {failed}")
    if skipped:
        print(f"  - Nao executados: {skipped}")

    for result in results:
        icon = "[OK]" if result.get("passed") else "[FALHA]"
        print(
            f"  {result['label']}. {icon} ({result['elapsed']:.2f}s) "
            f"Status: {result['status']}"
        )
        if result.get("error_code"):
            print(
                f"      Erro: {result['error_code']} | "
                f"Stage: {result.get('error_stage')} | "
                f"Retryable: {result.get('error_retryable')}"
            )


def main() -> None:
    from tests.integration.smoke_tests_config import resolve_api_key

    api_key = resolve_api_key(sys.argv[1:])
    if not api_key:
        print(
            "Erro: GEMINI_API_KEY nao definida.\n"
            "Use --api-key SUA_CHAVE ou defina a variavel de ambiente."
        )
        raise SystemExit(1)

    from vcommerce_ai_agent.core import config

    config.GEMINI_API_KEY = api_key

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
