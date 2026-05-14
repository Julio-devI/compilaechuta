"""
Smoke test de anonimizacao de dados sensiveis.

Cria um banco SQLite temporario, instancia VCommerceAgent e executa 2 cenarios
com evidencias em cada estagio do pipeline:

1. Query SEM dados sensiveis: exibe os dados do banco e confirma que nada foi
   alterado antes de enviar a LLM.
2. Query COM dados sensiveis: exibe os dados originais, os dados mascarados
   enviados a LLM, o insight bruto da LLM (ainda com tokens) e a resposta
   final restaurada.

As configuracoes compartilhadas (limites, timeouts, delays) estao em
smoke_tests_config.py para garantir consistencia entre todos os smoke tests.

Prerequisito: variavel de ambiente GEMINI_API_KEY configurada no .env
"""

import asyncio
import copy
import json
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

# Adiciona ai-agent/src ao path para permitir execucao manual sem instalacao editable.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT / "src"))
from tests.integration.smoke_test_db import create_test_db


async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.agent import VCommerceAgent
    from vcommerce_ai_agent.llm.insight_generator import generate_insight
    from tests.integration.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        MAX_DURATION_SECONDS,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
        wait_after_llm_interaction,
    )

    configure_llm_retries_for_smoke_tests()
    agent = VCommerceAgent(db_path=db_path)

    scenarios = [
        {
            "question": "Qual a receita total por regiao?",
            "planned_calls": 2,
            "expects_masking": False,
            "expected_token_prefixes": [],
        },
        {
            "question": "Quais sao os clientes da regiao Sudeste?",
            "planned_calls": 2,
            "expects_masking": True,
            "expected_token_prefixes": ["Cliente_"],
        },
        {
            "question": (
                "Liste os pedidos entregues da regiao Sudeste com nome do cliente, "
                "email, telefone, documento, codigo do pedido, produto, data da venda, "
                "valor total e quantidade de tickets de suporte, ordenando pelo maior valor."
            ),
            "planned_calls": 2,
            "expects_masking": True,
            "expected_token_prefixes": [
                "Cliente_",
                "Email_",
                "Telefone_",
                "Documento_",
                "Pedido_",
            ],
        },
    ]

    from vcommerce_ai_agent.core.exceptions import LLMQuotaError

    total_start = time.perf_counter()
    max_duration = MAX_DURATION_SECONDS

    results = []
    api_calls = 0

    print(f"\nOrcamento planejado: {sum(s['planned_calls'] for s in scenarios)}/{MAX_API_CALLS_PER_DAY} chamadas")

    for idx, scenario in enumerate(scenarios):
        question = scenario["question"]
        planned_calls = scenario["planned_calls"]
        expects_masking = scenario["expects_masking"]
        expected_token_prefixes = scenario.get("expected_token_prefixes", [])
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

        print(f"\n{'=' * 70}")
        print(f"CENARIO {idx + 1}/{len(scenarios)}: {question}")
        print(f"{'=' * 70}")

        captured_llm_data: list[dict] | None = None
        captured_llm_question: str | None = None
        captured_llm_sql: str | None = None
        captured_insight_raw: dict | None = None

        async def _capture_generate_insight(question, data, sql, *, history=None, model=None, **kwargs):
            nonlocal captured_llm_data, captured_llm_question, captured_llm_sql, captured_insight_raw
            captured_llm_question = question
            captured_llm_data = copy.deepcopy(data)
            captured_llm_sql = sql
            insight, tokens = await generate_insight(question, data, sql, history=history, model=model, **kwargs)
            captured_insight_raw = copy.deepcopy(insight)
            return insight, tokens

        start = time.perf_counter()
        try:
            with patch(
                "vcommerce_ai_agent.agent.generate_insight",
                side_effect=_capture_generate_insight,
            ):
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
            print(f"[ERRO] ({elapsed:.2f}s): {exc}")
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

        # --- Exibicao detalhada de evidencias ---
        checks: list[str] = []

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
            results.append({
                "question": question,
                "status": "ERRO",
                "elapsed": elapsed,
                "error": response.user_response.answer_text,
                "sql": sql,
            })
        else:
            sql = response.developer_debug.sql
            print(f"[SUCESSO] ({elapsed:.2f}s)")
            print(f"\n--- SQL Gerado ---")
            print(sql)

            # Dados originais retornados pelo banco
            print(f"\n--- [1] Dados Originais (do banco) ---")
            if response.user_response.data:
                print(json.dumps(response.user_response.data, indent=2, ensure_ascii=False))
            else:
                print("(sem dados)")

            # Dados que foram enviados a LLM (pos-mascaramento)
            print(f"\n--- [2] Dados Enviados a LLM (apos mascaramento) ---")
            if captured_llm_data is not None:
                print(json.dumps(captured_llm_data, indent=2, ensure_ascii=False))
            else:
                print("(nao capturados)")

            # Insight bruto da LLM (ainda com tokens, antes da restauracao)
            print(f"\n--- [3] Insight Bruto da LLM (antes da restauracao) ---")
            if captured_insight_raw and isinstance(captured_insight_raw, dict):
                # Exibe apenas campos textuais relevantes
                raw_activity = captured_insight_raw.get("activity", "")
                raw_sections = captured_insight_raw.get("answer_sections", [])
                print(f"activity: {raw_activity}")
                for sec in raw_sections:
                    print(f"section -> title: {sec.get('title', '')}")
                    print(f"section -> content: {sec.get('content', '')}")
            else:
                print("(nao capturado)")

            # Resposta final do agente (apos restauracao)
            print(f"\n--- [4] Resposta Final do Agente (apos restauracao) ---")
            print(f"answer_text:\n{response.user_response.answer_text}")
            if response.user_response.sources_text:
                print(f"\nsources_text:\n{response.user_response.sources_text}")

            # Validacoes automaticas
            print(f"\n--- Validacoes ---")

            detected_token_prefixes: set[str] = set()
            if captured_llm_data:
                for row in captured_llm_data:
                    for val in row.values():
                        if not isinstance(val, str):
                            continue
                        for prefix in expected_token_prefixes:
                            if val.startswith(prefix):
                                detected_token_prefixes.add(prefix)

            if expects_masking:
                has_masked_data = bool(detected_token_prefixes)
                if has_masked_data:
                    checks.append("mascaramento_detectado")
                    print("[OK] Mascaramento detectado nos dados enviados a LLM.")
                else:
                    checks.append("mascaramento_faltando")
                    print("[FALHA] Mascaramento NAO detectado nos dados enviados a LLM.")

                missing_prefixes = [
                    prefix for prefix in expected_token_prefixes
                    if prefix not in detected_token_prefixes
                ]
                if missing_prefixes:
                    checks.append("prefixos_esperados_faltando")
                    print(
                        "[FALHA] Prefixos esperados nao encontrados nos dados enviados a LLM: "
                        + ", ".join(missing_prefixes)
                    )
                else:
                    checks.append("prefixos_esperados_ok")
                    print(
                        "[OK] Prefixos esperados detectados nos dados enviados a LLM: "
                        + ", ".join(expected_token_prefixes)
                    )

                answer_text = response.user_response.answer_text or ""
                sources_text = response.user_response.sources_text or ""
                combined_text = answer_text + " " + sources_text
                expected_real_values = [
                    "Ana Silva",
                    "Daniel Lima",
                ]
                if "Email_" in expected_token_prefixes:
                    expected_real_values.extend([
                        "ana.silva@example.com",
                        "daniel.lima@example.com",
                    ])
                if "Telefone_" in expected_token_prefixes:
                    expected_real_values.extend([
                        "(11) 90000-0001",
                        "(21) 90000-0004",
                    ])
                if "Documento_" in expected_token_prefixes:
                    expected_real_values.extend([
                        "123.456.789-01",
                        "456.789.012-34",
                    ])
                if "Pedido_" in expected_token_prefixes:
                    expected_real_values.extend([
                        "PED-2024-0001",
                        "PED-2024-0005",
                    ])
                restored_any = any(value in combined_text for value in expected_real_values)

                if restored_any:
                    checks.append("restauracao_ok")
                    print("[OK] Nomes reais restaurados na resposta final.")
                else:
                    checks.append("restauracao_faltando")
                    print("[FALHA] Nomes reais NAO encontrados na resposta final.")
            else:
                has_masked_data = bool(detected_token_prefixes)
                if has_masked_data:
                    checks.append("mascaramento_inesperado")
                    print("[FALHA] Mascaramento inesperado em query sem dados sensiveis.")
                else:
                    checks.append("sem_mascaramento_ok")
                    print("[OK] Nenhum mascaramento em query sem dados sensiveis.")

            # Verificar qualidade do insight (nao vazio)
            insight_ok = False
            if captured_insight_raw and isinstance(captured_insight_raw, dict):
                activity = captured_insight_raw.get("activity", "")
                sections = captured_insight_raw.get("answer_sections", [])
                if activity.strip() or sections:
                    insight_ok = True

            if insight_ok:
                checks.append("insight_ok")
                print("[OK] Insight analitico gerado pela LLM nao esta vazio.")
            else:
                checks.append("insight_vazio")
                print("[FALHA] Insight analitico vazio ou malformado.")

            # Verificar que tokens nao vazaram para o usuario
            tokens_leaked = False
            if captured_llm_data:
                for row in captured_llm_data:
                    for val in row.values():
                        if (
                            isinstance(val, str)
                            and any(val.startswith(prefix) for prefix in expected_token_prefixes)
                        ):
                            if val in combined_text:
                                tokens_leaked = True
                                break
                if not tokens_leaked:
                    checks.append("tokens_nao_vazaram")
                    print("[OK] Tokens de mascaramento nao vazaram para o usuario.")
                else:
                    checks.append("tokens_vazaram")
                    print("[FALHA] Tokens de mascaramento vazaram para o usuario!")

            results.append({
                "question": question,
                "status": "SUCESSO",
                "elapsed": elapsed,
                "sql": sql,
                "checks": checks,
                "expects_masking": expects_masking,
                "has_masked_data": has_masked_data,
                "detected_token_prefixes": sorted(detected_token_prefixes),
            })

        print(f"\nChamadas API planejadas: {planned_calls} | Total: {api_calls}/{MAX_API_CALLS_PER_DAY}")
        await wait_after_llm_interaction(planned_calls, is_last)

    total_elapsed = time.perf_counter() - total_start
    print(f"\n{'=' * 70}")
    print(f"TESTE FINALIZADO em {total_elapsed:.2f}s")
    print(f"Chamadas API planejadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")
    print(f"{'=' * 70}")
    _print_summary(results, scenarios, api_calls)


def _print_summary(results: list, all_scenarios: list, api_calls: int = 0) -> None:
    """Imprime resumo dos resultados."""
    from tests.integration.smoke_tests_config import MAX_API_CALLS_PER_DAY

    print("\n--- RESUMO ---")
    success_count = sum(1 for r in results if r["status"] == "SUCESSO")
    oos_count = sum(1 for r in results if r["status"] == "FORA_DO_ESCOPO")
    error_count = sum(1 for r in results if r["status"] == "ERRO")
    skipped = len(all_scenarios) - len(results)

    print(f"Total de cenarios: {len(all_scenarios)}")
    print(f"Executados: {len(results)}")
    print(f"  - Sucesso: {success_count}")
    print(f"  - Fora do escopo: {oos_count}")
    print(f"  - Erro: {error_count}")
    if skipped:
        print(f"  - Nao executados (timeout/quota): {skipped}")
    print(f"Chamadas API estimadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")

    if results:
        avg_time = sum(r["elapsed"] for r in results) / len(results)
        print(f"\nTempo medio por cenario: {avg_time:.2f}s")

    for i, r in enumerate(results, 1):
        status_icon = "[OK]" if r["status"] == "SUCESSO" else f"[{r['status']}]"
        check_info = ""
        if r.get("checks"):
            check_info = f" | checks={','.join(r['checks'])}"
        print(f"  {i}. {status_icon} ({r['elapsed']:.2f}s){check_info} - {r['question'][:50]}...")

    print("\n--- VEREDICTO ANONIMIZACAO ---")
    masking_ok = True
    for r in results:
        if r["status"] != "SUCESSO":
            continue
        checks = r.get("checks", [])
        expects = r.get("expects_masking")
        if expects:
            if "mascaramento_detectado" not in checks:
                print(f"  FALHA: '{r['question']}' -> mascaramento nao detectado")
                masking_ok = False
            if "prefixos_esperados_faltando" in checks:
                print(f"  FALHA: '{r['question']}' -> nem todos os prefixos esperados foram detectados")
                masking_ok = False
            if "restauracao_ok" not in checks:
                print(f"  FALHA: '{r['question']}' -> restauracao nao confirmada")
                masking_ok = False
            if "tokens_nao_vazaram" not in checks:
                print(f"  FALHA: '{r['question']}' -> tokens vazaram para o usuario")
                masking_ok = False
        else:
            if "mascaramento_inesperado" in checks:
                print(f"  FALHA: '{r['question']}' -> mascaramento inesperado")
                masking_ok = False
        if "insight_ok" not in checks:
            print(f"  FALHA: '{r['question']}' -> insight analitico vazio")
            masking_ok = False

    if masking_ok and success_count == len(all_scenarios):
        print("  Todos os cenarios de anonimizacao passaram.")
    elif success_count < len(all_scenarios):
        print("  Alguns cenarios nao foram bem-sucedidos.")
    else:
        print("  Existem falhas no pipeline de anonimizacao.")


def main() -> None:
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
