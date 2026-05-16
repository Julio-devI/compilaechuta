"""
Smoke test manual para sugestões contextuais de perguntas.

Cria um banco SQLite temporario com schema minimo, instancia VCommerceAgent
e valida os cenarios do metodo initial_suggestions():

1. Chamada 1: historico com 1 turno.
2. Chamada 2: historico com 2 turnos.
3. Chamada 3: historico com 3 turnos.
4. Chamada 4: sem historico (nova conversa, lista fixa).

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
from tests.smoke.smoke_test_db import create_test_db


# Historico falso fixo que simula uma conversa real de 3 turnos.
# Cada turno é um par user/assistant (2 entradas na lista).
# As chamadas usam fatias cumulativas: turno 1, turnos 1+2, turnos 1+2+3.
_FAKE_HISTORY: list[dict[str, str | None]] = [
    # Turno 1
    {
        "role": "user",
        "content": "Quais os 10 produtos mais vendidos?",
        "sql": None,
    },
    {
        "role": "assistant",
        "content": (
            "Os 10 produtos mais vendidos são: Camiseta Básica (450 unidades), "
            "Tênis Esportivo (380), Mochila Urbana (320), Relógio Digital (290), "
            "Fone Bluetooth (275), Garrafa Térmica (260), Notebook Slim (245), "
            "Cadeira Gamer (230), Mouse Wireless (215) e Teclado Mecânico (200)."
        ),
        "sql": "SELECT p.nome_produto, SUM(v.quantidade) AS total_vendido FROM fato_vendas v JOIN dim_produto p ON v.id_produto = p.id_produto GROUP BY p.nome_produto ORDER BY total_vendido DESC LIMIT 10",
    },
    # Turno 2
    {
        "role": "user",
        "content": "E desses, quais têm a melhor avaliação dos clientes?",
        "sql": None,
    },
    {
        "role": "assistant",
        "content": (
            "Entre os 10 mais vendidos, os produtos com melhor avaliação são: "
            "Notebook Slim (4.8), Cadeira Gamer (4.7), Fone Bluetooth (4.6), "
            "Tênis Esportivo (4.5) e Relógio Digital (4.4)."
        ),
        "sql": "SELECT p.nome_produto, AVG(a.nota) AS media_nota FROM fato_avaliacoes_pedido a JOIN dim_produto p ON a.id_produto = p.id_produto WHERE p.nome_produto IN ('Camiseta Básica','Tênis Esportivo','Mochila Urbana','Relógio Digital','Fone Bluetooth','Garrafa Térmica','Notebook Slim','Cadeira Gamer','Mouse Wireless','Teclado Mecânico') GROUP BY p.nome_produto ORDER BY media_nota DESC",
    },
    # Turno 3
    {
        "role": "user",
        "content": "Qual a receita total gerada pelo Notebook Slim?",
        "sql": None,
    },
    {
        "role": "assistant",
        "content": (
            "O Notebook Slim gerou uma receita total de R$ 612.500,00, "
            "com um ticket médio de R$ 2.500,00 por unidade vendida."
        ),
        "sql": "SELECT SUM(v.valor_total_venda) AS receita_total, AVG(v.valor_total_venda) AS ticket_medio FROM fato_vendas v JOIN dim_produto p ON v.id_produto = p.id_produto WHERE p.nome_produto = 'Notebook Slim'",
    },
]


def _history_slice(turns: int) -> list[dict[str, str | None]]:
    """Retorna os primeiros N turnos do historico falso."""
    return _FAKE_HISTORY[: turns * 2]


def _normalize_suggestion(text: str) -> str:
    """Normaliza sugestoes para comparacao entre rodadas."""
    return " ".join(text.strip().lower().split())


def _validate_suggestions(
    suggestions: list[str],
    initial_suggestions: list[str],
    label: str,
    expect_dynamic: bool = True,
) -> list[str]:
    """Valida o lote de sugestoes gerado por uma chamada."""
    errors: list[str] = []

    if len(suggestions) != 5:
        errors.append(
            f"{label}: esperado 5 sugestoes, recebido {len(suggestions)}"
        )

    if expect_dynamic and suggestions == initial_suggestions:
        errors.append(
            f"{label}: initial_suggestions() retornou a lista fixa. "
            "O caminho dinamico via LLM nao foi validado."
        )

    if not expect_dynamic and suggestions != initial_suggestions:
        errors.append(
            f"{label}: esperava lista fixa, mas recebeu sugestoes dinamicas."
        )

    normalized = [_normalize_suggestion(s) for s in suggestions]
    if len(normalized) != len(set(normalized)):
        errors.append(f"{label}: ha sugestoes duplicadas no lote.")

    for idx, s in enumerate(suggestions):
        if not s or not s.strip():
            errors.append(f"{label}: sugestao {idx + 1} esta vazia")
        if not s.endswith("?"):
            errors.append(
                f"{label}: sugestao {idx + 1} nao termina com '?': {s}"
            )

    sql_keywords = {"select", "from", "join", "where", "group by", "order by", "limit"}
    for idx, s in enumerate(suggestions):
        lower = s.lower()
        for kw in sql_keywords:
            if kw in lower:
                errors.append(
                    f"{label}: sugestao {idx + 1} contem "
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
                    f"{label}: sugestao {idx + 1} contem nome "
                    f"fisico de tabela '{table}': {s}"
                )
                break

    return errors


async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.agent import VCommerceAgent
    from vcommerce_ai_agent.llm.suggestions_generator import INITIAL_SUGGESTIONS
    from tests.smoke.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
    )

    configure_llm_retries_for_smoke_tests()
    agent = VCommerceAgent(db_path=db_path)
    initial_list = list(INITIAL_SUGGESTIONS)

    planned_llm_calls = 3

    if not ensure_daily_budget(0, planned_llm_calls):
        print(
            f"\n[ORCAMENTO ESGOTADO] Cenario exigiria "
            f"{planned_llm_calls}/{MAX_API_CALLS_PER_DAY} chamadas."
        )
        return

    # Definicao das 4 chamadas: (label, turnos_historico, expect_dynamic)
    calls = [
        ("Chamada 1/4 (1 turno)", 1, True),
        ("Chamada 2/4 (2 turnos)", 2, True),
        ("Chamada 3/4 (3 turnos)", 3, True),
        ("Chamada 4/4 (nova conversa)", 0, False),
    ]

    all_errors: list[str] = []
    results: list[tuple[str, int, float, list[str]]] = []
    total_start = time.perf_counter()

    for label, turns, expect_dynamic in calls:
        history = _history_slice(turns) if turns > 0 else None

        print(f"\n{'=' * 60}")
        if turns > 0:
            print(f"{label}")
            print(f"Historico: {turns} turno(s) injetado(s)")
            print("Esperado: follow-ups contextuais via LLM")
        else:
            print(f"{label}")
            print("Historico: nenhum (usuario iniciou nova conversa)")
            print("Esperado: lista fixa, sem chamada ao LLM")
        print("=" * 60)

        start = time.perf_counter()
        try:
            suggestions = await agent.initial_suggestions(history=history)
        except Exception as exc:
            elapsed = time.perf_counter() - start
            print(f"[EXCECAO] ({elapsed:.2f}s): {exc}")
            raise

        elapsed = time.perf_counter() - start
        print(f"[SUCESSO] ({elapsed:.2f}s)")

        for i, s in enumerate(suggestions, 1):
            print(f"  {i}. {s}")

        errors = _validate_suggestions(
            suggestions=suggestions,
            initial_suggestions=initial_list,
            label=label,
            expect_dynamic=expect_dynamic,
        )
        all_errors.extend(errors)
        results.append((label, turns, elapsed, suggestions))

    total_elapsed = time.perf_counter() - total_start

    # ---------------------------------------------------------------
    # Resumo
    # ---------------------------------------------------------------
    print(f"\n{'=' * 60}")
    print("RESUMO")
    print("=" * 60)

    if all_errors:
        print("\n[VALIDACAO FALHOU]")
        for err in all_errors:
            print(f"  - {err}")
    else:
        print("\n[VALIDACAO OK] Todas as validacoes passaram.")

    print(f"\n  Chamadas API (LLM): {planned_llm_calls}/{MAX_API_CALLS_PER_DAY}")
    print(f"  Tempo total: {total_elapsed:.2f}s")

    if all_errors:
        raise AssertionError("Smoke test de sugestoes falhou nas validacoes.")


def main() -> None:
    from tests.smoke.smoke_tests_config import resolve_api_key

    api_key = resolve_api_key(sys.argv[1:])
    if not api_key:
        print(
            "Erro: GEMINI_API_KEY nao definida.\n"
            "Use --api-key SUA_CHAVE ou defina a variavel de ambiente."
        )
        raise SystemExit(1)

    import os
    from vcommerce_ai_agent.core import config

    config.GEMINI_API_KEY = api_key
    os.environ['GEMINI_API_KEY'] = api_key

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        print("Criando banco de teste temporario...")
        create_test_db(db_path)
        print(f"Banco criado em: {db_path}")

        asyncio.run(_run_smoke_test(db_path))
    finally:
        Path(db_path).unlink(missing_ok=True)
        print(f"\nBanco temporario removido.")


if __name__ == "__main__":
    main()
