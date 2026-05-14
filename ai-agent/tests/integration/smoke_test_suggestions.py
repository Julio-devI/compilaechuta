"""
Smoke test manual para sugestões iniciais dinâmicas.

Cria um banco SQLite temporario com schema minimo, instancia VCommerceAgent
e executa 3 chamadas ao LLM para gerar lotes de 5 perguntas de exemplo
dinamicas.

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


def _normalize_suggestion(text: str) -> str:
    """Normaliza sugestoes para comparacao entre rodadas."""
    return " ".join(text.strip().lower().split())


def _validate_suggestions(
    suggestions: list[str],
    previous_suggestions: list[str] | None,
    fallback_suggestions: list[str],
    call_number: int,
) -> list[str]:
    """Valida o lote de sugestoes gerado por uma chamada."""
    errors: list[str] = []

    if len(suggestions) != 5:
        errors.append(
            f"Chamada {call_number}: esperado 5 sugestoes, recebido {len(suggestions)}"
        )

    if suggestions == fallback_suggestions:
        errors.append(
            f"Chamada {call_number}: initial_suggestions() retornou o fallback fixo. "
            "O caminho dinamico via LLM nao foi validado."
        )

    normalized = [_normalize_suggestion(s) for s in suggestions]
    if len(normalized) != len(set(normalized)):
        errors.append(f"Chamada {call_number}: ha sugestoes duplicadas no lote.")

    if previous_suggestions is not None:
        previous_normalized = {
            _normalize_suggestion(s) for s in previous_suggestions
        }
        current_normalized = set(normalized)
        repeated = current_normalized.intersection(previous_normalized)
        if repeated:
            errors.append(
                f"Chamada {call_number}: repetiu sugestoes ja enviadas no "
                f"contexto anterior: {sorted(repeated)}"
            )

    for idx, s in enumerate(suggestions):
        if not s or not s.strip():
            errors.append(f"Chamada {call_number}: sugestao {idx + 1} esta vazia")
        if not s.endswith("?"):
            errors.append(
                f"Chamada {call_number}: sugestao {idx + 1} nao termina com '?': {s}"
            )

    sql_keywords = {"select", "from", "join", "where", "group by", "order by", "limit"}
    for idx, s in enumerate(suggestions):
        lower = s.lower()
        for kw in sql_keywords:
            if kw in lower:
                errors.append(
                    f"Chamada {call_number}: sugestao {idx + 1} contem "
                    f"palavra SQL '{kw}': {s}"
                )
                break

    physical_tables = {
        "dim_cliente",
        "dim_produto",
        "fato_vendas",
        "fato_suporte_ticket",
        "fato_avaliacoes_pedido",
        "dim_tempo",
    }
    for idx, s in enumerate(suggestions):
        lower = s.lower()
        for table in physical_tables:
            if table.lower() in lower:
                errors.append(
                    f"Chamada {call_number}: sugestao {idx + 1} contem nome "
                    f"fisico de tabela '{table}': {s}"
                )
                break

    return errors


async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.agent import VCommerceAgent
    from vcommerce_ai_agent.llm.suggestions_generator import (
        select_fallback_suggestions,
    )
    from tests.integration.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
    )

    configure_llm_retries_for_smoke_tests()
    agent = VCommerceAgent(db_path=db_path)

    # Preenche historico com valor fake para garantir isolamento
    fake_history = [
        {"role": "user", "content": "pergunta anterior", "sql": None},
        {"role": "assistant", "content": "resposta anterior", "sql": "SELECT 1"},
    ]
    agent._history = fake_history.copy()

    # Substitui ask por funcao que falha se for chamada
    async def _failing_ask(question):
        raise AssertionError("agent.ask() nao deve ser chamado por initial_suggestions()")

    agent.ask = _failing_ask

    planned_calls = 3

    if not ensure_daily_budget(0, planned_calls):
        print(
            f"\n[ORCAMENTO ESGOTADO] Proximo cenario exigiria "
            f"{planned_calls}/{MAX_API_CALLS_PER_DAY} chamadas."
        )
        return

    print(f"\nChamando initial_suggestions() ({planned_calls} chamadas LLM planejadas)...")
    print("A partir da segunda chamada, envia as sugestoes anteriores no parametro.")
    print("-" * 60)

    all_errors: list[str] = []
    previous_suggestions: list[str] = []
    results: list[tuple[int, float, list[str], int]] = []
    total_start = time.perf_counter()

    for call_number in range(1, planned_calls + 1):
        print(f"\nChamada {call_number}/{planned_calls}")
        print(f"Sugestoes anteriores enviadas: {len(previous_suggestions)}")
        start = time.perf_counter()
        try:
            suggestions = await agent.initial_suggestions(
                previous_suggestions=previous_suggestions
            )
        except Exception as exc:
            elapsed = time.perf_counter() - start
            print(f"[EXCECAO] ({elapsed:.2f}s): {exc}")
            raise

        elapsed = time.perf_counter() - start
        print(f"[SUCESSO] ({elapsed:.2f}s)")

        errors = _validate_suggestions(
            suggestions=suggestions,
            previous_suggestions=previous_suggestions or None,
            fallback_suggestions=select_fallback_suggestions(
                previous_suggestions
            ),
            call_number=call_number,
        )
        all_errors.extend(errors)

        if agent._history != fake_history:
            all_errors.append(
                f"Chamada {call_number}: o historico do agente foi alterado. "
                f"Antes: {fake_history} | Depois: {agent._history}"
            )

        previous_count = len(previous_suggestions)
        previous_suggestions.extend(suggestions)
        results.append((call_number, elapsed, suggestions, previous_count))

    total_elapsed = time.perf_counter() - total_start

    if all_errors:
        print("\n[VALIDACAO FALHOU]")
        for err in all_errors:
            print(f"  - {err}")
    else:
        print("\n[VALIDACAO OK] Todas as validacoes passaram.")

    print(f"\n{'=' * 60}")
    print("SUGESTOES GERADAS:")
    for call_number, elapsed, suggestions, previous_count in results:
        print(f"\nChamada {call_number} ({elapsed:.2f}s):")
        print(f"  Sugestoes anteriores enviadas: {previous_count}")
        for i, s in enumerate(suggestions, 1):
            print(f"  {i}. {s}")
    print(f"{'=' * 60}")
    print(f"Chamadas API planejadas: {planned_calls}/{MAX_API_CALLS_PER_DAY}")
    print(f"Tempo total: {total_elapsed:.2f}s")

    if all_errors:
        raise AssertionError("Smoke test de sugestoes falhou nas validacoes.")


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
