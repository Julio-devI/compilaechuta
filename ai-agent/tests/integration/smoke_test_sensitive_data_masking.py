"""
Smoke test manual para comparar a Chamada 2 com e sem anonimização.

O teste executa várias rodadas usando a API Gemini real. Em cada rodada:
1. O agente gera SQL dinamicamente, executa a query e chama a Chamada 2
   com dados anonimizados.
2. O mesmo SQL gerado na rodada é reutilizado em outro fluxo do agente,
   mas com o mascaramento desabilitado, para chamar a Chamada 2 com dados reais.
3. O script imprime os dados recebidos pela Chamada 2, o JSON retornado
   pela Chamada 2 e a resposta final montada pelo agente nos dois cenários.

Configuração opcional:
    ANON_SMOKE_RUNS=2
    ANON_SMOKE_QUESTION="Pergunta customizada para executar como cenário único"

Pré-requisito: variável de ambiente GEMINI_API_KEY configurada no .env.
"""

import asyncio
import copy
import json
import os
import sys
import tempfile
import time
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
sys.path.insert(0, str(_PROJECT_ROOT / "src"))

from tests.integration.smoke_test_db import create_test_db


DEFAULT_RUNS = 2
PLANNED_CALLS_PER_ROUND = 3
DATA_SAMPLE_ROWS = 5


@dataclass
class SmokeScenario:
    """Cenário executado no smoke test de anonimização."""

    name: str
    question: str


@dataclass
class CapturedCase:
    """Resultado capturado de um cenário de comparação."""

    label: str
    status: str
    sql: str
    llm_input_data: list[dict[str, Any]]
    insight_payload: dict[str, Any] | None
    insight_tokens: int | None
    masked_columns: list[str]
    token_to_value: dict[str, str]
    error_code: str | None
    error_stage: str | None
    error_message: str | None
    error_retryable: bool | None
    final_answer: str
    sources_text: str | None
    elapsed_seconds: float
    insight_time_ms: float | None
    total_time_ms: float | None


DEFAULT_SCENARIOS = [
    SmokeScenario(
        name="perfil_cliente_multicampos",
        question=(
            "Liste os clientes da região Sudeste com nome, email, telefone, "
            "documento, cidade, segmento, total gasto, quantidade de pedidos "
            "e tickets de suporte, ordenando pelo maior total gasto."
        ),
    ),
    SmokeScenario(
        name="pedidos_com_cliente_produto_tempo",
        question=(
            "Quais pedidos entregues de clientes do segmento Campeões mostram "
            "cliente, email, código do pedido, produto, região, data da venda "
            "e valor total, ordenando pelo maior valor?"
        ),
    ),
    SmokeScenario(
        name="suporte_com_contato_e_vendas",
        question=(
            "Compare os clientes que tiveram tickets de suporte mostrando nome, "
            "telefone, documento, segmento, status do ticket, tempo de resolução, "
            "produto relacionado e total gasto do cliente."
        ),
    ),
]


@contextmanager
def _temporary_patch(module: Any, name: str, value: Any) -> Iterator[None]:
    """Substitui temporariamente um atributo de módulo."""
    original = getattr(module, name)
    setattr(module, name, value)
    try:
        yield
    finally:
        setattr(module, name, original)


def _json_dump(value: Any) -> str:
    """Serializa valores para impressão legível no terminal."""
    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


def _data_sample(data: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Retorna uma amostra curta dos dados enviados à Chamada 2."""
    return data[:DATA_SAMPLE_ROWS]


def _get_requested_runs() -> int:
    """Lê a quantidade de rodadas, limitada ao orçamento diário planejado."""
    raw_runs = os.getenv("ANON_SMOKE_RUNS", str(DEFAULT_RUNS))
    try:
        requested_runs = int(raw_runs)
    except ValueError:
        requested_runs = DEFAULT_RUNS

    requested_runs = max(1, requested_runs)
    max_runs_by_budget = max(
        1,
        20 // (len(_get_scenarios()) * PLANNED_CALLS_PER_ROUND),
    )
    return min(requested_runs, max_runs_by_budget)


def _get_scenarios() -> list[SmokeScenario]:
    """Retorna os cenários padrão ou uma pergunta customizada única."""
    custom_question = os.getenv("ANON_SMOKE_QUESTION", "").strip()
    if custom_question:
        return [
            SmokeScenario(
                name="pergunta_customizada",
                question=custom_question,
            )
        ]
    return DEFAULT_SCENARIOS


def _make_capture_wrapper(agent_module: Any, capture: dict[str, Any]) -> Any:
    """Cria wrapper para capturar entrada e saída da Chamada 2."""
    original_generate_insight = agent_module.generate_insight

    async def _capture_generate_insight(
        question: str,
        data: list[dict[str, Any]],
        sql: str,
        history: list[dict[str, str | None]] | None = None,
        model: str | None = None,
    ) -> tuple[dict[str, Any], int | None]:
        capture["input_data"] = copy.deepcopy(data)
        insight, tokens_used = await original_generate_insight(
            question,
            data,
            sql,
            history=history,
            model=model,
        )
        capture["insight_payload"] = copy.deepcopy(insight)
        capture["insight_tokens"] = tokens_used
        return insight, tokens_used

    return _capture_generate_insight


async def _run_masked_case(db_path: str, question: str) -> CapturedCase:
    """Executa o fluxo normal do agente, com anonimização ativa."""
    import vcommerce_ai_agent.agent as agent_module
    from vcommerce_ai_agent.agent import VCommerceAgent

    capture: dict[str, Any] = {}

    original_mask_sensitive_data = agent_module.mask_sensitive_data

    def _capture_mask_sensitive_data(
        data: list[dict[str, Any]],
        *,
        sql: str,
        descriptions: dict[str, Any],
        technical_schema: dict[str, Any] | None = None,
    ) -> Any:
        result = original_mask_sensitive_data(
            data,
            sql=sql,
            descriptions=descriptions,
            technical_schema=technical_schema,
        )
        capture["masked_columns"] = sorted(result.masked_columns)
        capture["token_to_value"] = dict(result.token_to_value)
        return result

    start = time.perf_counter()
    with ExitStack() as stack:
        stack.enter_context(
            _temporary_patch(
                agent_module,
                "generate_insight",
                _make_capture_wrapper(agent_module, capture),
            )
        )
        stack.enter_context(
            _temporary_patch(
                agent_module,
                "mask_sensitive_data",
                _capture_mask_sensitive_data,
            )
        )
        response = await VCommerceAgent(db_path=db_path).ask(question)

    elapsed = time.perf_counter() - start
    debug_error = response.developer_debug.error
    return CapturedCase(
        label="com anonimização",
        status=response.status,
        sql=response.developer_debug.sql,
        llm_input_data=capture.get("input_data", []),
        insight_payload=capture.get("insight_payload"),
        insight_tokens=capture.get("insight_tokens"),
        masked_columns=capture.get("masked_columns", []),
        token_to_value=capture.get("token_to_value", {}),
        error_code=debug_error.code if debug_error else None,
        error_stage=debug_error.stage if debug_error else None,
        error_message=debug_error.message if debug_error else None,
        error_retryable=debug_error.retryable if debug_error else None,
        final_answer=response.user_response.answer_text,
        sources_text=response.user_response.sources_text,
        elapsed_seconds=elapsed,
        insight_time_ms=response.developer_debug.insight_generation_time_ms,
        total_time_ms=response.developer_debug.total_time_ms,
    )


async def _run_raw_case(db_path: str, question: str, sql: str) -> CapturedCase:
    """Executa o agente reutilizando o SQL da rodada e sem mascarar dados."""
    import vcommerce_ai_agent.agent as agent_module
    from vcommerce_ai_agent.agent import VCommerceAgent
    from vcommerce_ai_agent.security.sensitive_data_masking import MaskingResult

    capture: dict[str, Any] = {}

    async def _reuse_sql(*_args: Any, **_kwargs: Any) -> tuple[str, int | None]:
        return sql, 0

    def _do_not_mask(
        data: list[dict[str, Any]],
        *,
        sql: str,
        descriptions: dict[str, Any],
        technical_schema: dict[str, Any] | None = None,
    ) -> MaskingResult:
        del sql, descriptions, technical_schema
        return MaskingResult(
            llm_data=copy.deepcopy(data),
            token_to_value={},
            masked_columns=set(),
        )

    start = time.perf_counter()
    with ExitStack() as stack:
        stack.enter_context(
            _temporary_patch(
                agent_module,
                "generate_insight",
                _make_capture_wrapper(agent_module, capture),
            )
        )
        stack.enter_context(_temporary_patch(agent_module, "generate_sql", _reuse_sql))
        stack.enter_context(
            _temporary_patch(agent_module, "mask_sensitive_data", _do_not_mask)
        )
        response = await VCommerceAgent(db_path=db_path).ask(question)

    elapsed = time.perf_counter() - start
    debug_error = response.developer_debug.error
    return CapturedCase(
        label="sem anonimização",
        status=response.status,
        sql=response.developer_debug.sql,
        llm_input_data=capture.get("input_data", []),
        insight_payload=capture.get("insight_payload"),
        insight_tokens=capture.get("insight_tokens"),
        masked_columns=[],
        token_to_value={},
        error_code=debug_error.code if debug_error else None,
        error_stage=debug_error.stage if debug_error else None,
        error_message=debug_error.message if debug_error else None,
        error_retryable=debug_error.retryable if debug_error else None,
        final_answer=response.user_response.answer_text,
        sources_text=response.user_response.sources_text,
        elapsed_seconds=elapsed,
        insight_time_ms=response.developer_debug.insight_generation_time_ms,
        total_time_ms=response.developer_debug.total_time_ms,
    )


def _section_count(case: CapturedCase) -> int | None:
    """Conta seções retornadas pela Chamada 2."""
    if not case.insight_payload:
        return None
    sections = case.insight_payload.get("answer_sections")
    return len(sections) if isinstance(sections, list) else None


def _chart_type(case: CapturedCase) -> str | None:
    """Extrai o tipo de gráfico retornado pela Chamada 2."""
    if not case.insight_payload:
        return None
    chart = case.insight_payload.get("chart")
    if isinstance(chart, dict):
        chart_type = chart.get("type")
        return str(chart_type) if chart_type is not None else None
    return None


def _format_value(value: Any) -> str:
    """Formata valores simples para tabela textual."""
    if value is None:
        return "n/a"
    return str(value)


def _delta(left: int | float | None, right: int | float | None) -> int | float | None:
    """Calcula diferença entre os cenários quando ambos têm valor."""
    if left is None or right is None:
        return None
    return round(left - right, 2)


def _print_metric_table(masked: CapturedCase, raw: CapturedCase) -> None:
    """Imprime tabela curta de métricas comparativas."""
    rows = [
        (
            "Status",
            masked.status,
            raw.status,
            str(masked.status == raw.status),
        ),
        (
            "Tempo total agente (ms)",
            masked.total_time_ms,
            raw.total_time_ms,
            _delta(masked.total_time_ms, raw.total_time_ms),
        ),
        (
            "Tempo Chamada 2 (ms)",
            masked.insight_time_ms,
            raw.insight_time_ms,
            _delta(masked.insight_time_ms, raw.insight_time_ms),
        ),
        (
            "Tokens Chamada 2",
            masked.insight_tokens,
            raw.insight_tokens,
            _delta(masked.insight_tokens, raw.insight_tokens),
        ),
        (
            "Seções Chamada 2",
            _section_count(masked),
            _section_count(raw),
            str(_section_count(masked) == _section_count(raw)),
        ),
        (
            "Tipo de gráfico",
            _chart_type(masked),
            _chart_type(raw),
            str(_chart_type(masked) == _chart_type(raw)),
        ),
    ]

    print("\n[1] COMPARATIVO RESUMIDO")
    print("| Métrica | Com anonimização | Sem anonimização | Delta/igualdade |")
    print("|---|---:|---:|---:|")
    for name, masked_value, raw_value, delta_value in rows:
        print(
            f"| {name} | {_format_value(masked_value)} | "
            f"{_format_value(raw_value)} | {_format_value(delta_value)} |"
        )


def _print_masking_summary(masked: CapturedCase) -> None:
    """Imprime as máscaras aplicadas antes da Chamada 2."""
    print("\n[2] MÁSCARAS APLICADAS")
    if not masked.masked_columns:
        print("Nenhuma coluna foi mascarada.")
        return
    print(f"Colunas mascaradas: {', '.join(masked.masked_columns)}")
    print("Mapa token -> valor real:")
    print(_json_dump(masked.token_to_value))


def _print_pair(title: str, masked_value: Any, raw_value: Any) -> None:
    """Imprime valores equivalentes dos dois cenários em sequência."""
    print(f"\n{title}")
    print("\n--- COM ANONIMIZAÇÃO ---")
    if isinstance(masked_value, str):
        print(masked_value)
    else:
        print(_json_dump(masked_value))
    print("\n--- SEM ANONIMIZAÇÃO ---")
    if isinstance(raw_value, str):
        print(raw_value)
    else:
        print(_json_dump(raw_value))


def _print_case_for_error(case: CapturedCase) -> None:
    """Imprime resposta parcial quando o fluxo com anonimização falha."""
    print(f"\n[{case.label.upper()}]")
    print(f"Status: {case.status}")
    print(f"SQL: {case.sql}")
    if case.error_code:
        print(f"Erro: {case.error_code}")
        print(f"Stage: {case.error_stage}")
        print(f"Retryable: {case.error_retryable}")
        print(f"Mensagem: {case.error_message}")
    print(f"Resposta final: {case.final_answer}")
    if case.sources_text:
        print(f"Fontes: {case.sources_text}")


def _print_scenario_result(masked: CapturedCase, raw: CapturedCase) -> None:
    """Imprime todos os dados do cenário em formato comparativo."""
    print(f"\nSQL gerado dinamicamente no cenário:\n{masked.sql}")
    _print_metric_table(masked, raw)
    _print_masking_summary(masked)
    _print_pair(
        "\n[3] DADOS ENVIADOS PARA A CHAMADA 2 (AMOSTRA)",
        _data_sample(masked.llm_input_data),
        _data_sample(raw.llm_input_data),
    )
    _print_pair(
        "\n[4] RESPOSTA JSON DA CHAMADA 2",
        masked.insight_payload,
        raw.insight_payload,
    )
    _print_pair(
        "\n[5] RESPOSTA FINAL MONTADA PELO AGENTE",
        masked.final_answer,
        raw.final_answer,
    )
    _print_pair(
        "\n[6] FONTES",
        masked.sources_text or "",
        raw.sources_text or "",
    )


def _print_exception(exc: BaseException) -> None:
    """Imprime uma exceção usando os mapeamentos de erro disponíveis."""
    error_code = getattr(exc, "error_code", None)
    if error_code is not None:
        code_value = getattr(error_code, "value", str(error_code))
        print(f"\n[ERRO] {code_value}: {exc}")
        return

    message = str(exc).strip()
    if message:
        print(f"\n[ERRO] {type(exc).__name__}: {message}")
        return

    print(f"\n[ERRO] {type(exc).__name__}: {exc!r}")


async def _run_smoke_test(db_path: str) -> None:
    from vcommerce_ai_agent.core.exceptions import LLMQuotaError
    from tests.integration.smoke_tests_config import (
        MAX_API_CALLS_PER_DAY,
        MAX_DURATION_SECONDS,
        configure_llm_retries_for_smoke_tests,
        ensure_daily_budget,
        wait_after_llm_interaction,
    )

    configure_llm_retries_for_smoke_tests()
    scenarios = _get_scenarios()
    runs = _get_requested_runs()
    total_start = time.perf_counter()
    api_calls = 0
    completed_rounds = 0
    time_deltas: list[float] = []
    token_deltas: list[int] = []

    print("\nSmoke test de anonimização de dados sensíveis")
    print(f"Cenários por rodada: {len(scenarios)}")
    for scenario in scenarios:
        print(f"- {scenario.name}: {scenario.question}")
    print(f"Rodadas planejadas por cenário: {runs}")
    print(
        "Orçamento planejado: "
        f"{runs * len(scenarios) * PLANNED_CALLS_PER_ROUND}/"
        f"{MAX_API_CALLS_PER_DAY} chamadas"
    )
    print(
        "Observação: a primeira execução da rodada gera SQL com o LLM. "
        "A segunda reutiliza esse SQL e chama apenas a Chamada 2."
    )

    total_cases = runs * len(scenarios)
    case_index = 0
    should_stop = False

    for run_index in range(runs):
        for scenario in scenarios:
            case_index += 1
            if time.perf_counter() - total_start >= MAX_DURATION_SECONDS:
                print(f"\n[TIMEOUT] Limite de {MAX_DURATION_SECONDS}s atingido.")
                should_stop = True
                break

            if not ensure_daily_budget(api_calls, PLANNED_CALLS_PER_ROUND):
                print(
                    "\n[ORÇAMENTO ESGOTADO] Próximo cenário exigiria "
                    f"{api_calls + PLANNED_CALLS_PER_ROUND}/"
                    f"{MAX_API_CALLS_PER_DAY} chamadas."
                )
                should_stop = True
                break

            print(f"\n{'=' * 80}")
            print(
                f"RODADA {run_index + 1}/{runs} | "
                f"CENÁRIO {scenario.name} ({case_index}/{total_cases})"
            )
            print(f"Pergunta: {scenario.question}")
            print(f"{'=' * 80}")

            try:
                masked_case = await _run_masked_case(db_path, scenario.question)
                api_calls += 2

                if masked_case.status != "success" or not masked_case.sql:
                    print("\n[ERRO] Fluxo com anonimização não retornou sucesso.")
                    _print_case_for_error(masked_case)
                    continue

                raw_case = await _run_raw_case(
                    db_path,
                    scenario.question,
                    masked_case.sql,
                )
                api_calls += 1

            except LLMQuotaError as exc:
                print(f"\n[QUOTA ESGOTADA]: {exc}")
                should_stop = True
                break
            except Exception as exc:
                _print_exception(exc)
                should_stop = True
                break

            completed_rounds += 1
            _print_scenario_result(masked_case, raw_case)

            if (
                masked_case.insight_time_ms is not None
                and raw_case.insight_time_ms is not None
            ):
                time_deltas.append(masked_case.insight_time_ms - raw_case.insight_time_ms)
            if (
                masked_case.insight_tokens is not None
                and raw_case.insight_tokens is not None
            ):
                token_deltas.append(masked_case.insight_tokens - raw_case.insight_tokens)

            print(
                "\nChamadas API planejadas usadas neste cenário: "
                f"{PLANNED_CALLS_PER_ROUND} | Total estimado: "
                f"{api_calls}/{MAX_API_CALLS_PER_DAY}"
            )
            await wait_after_llm_interaction(
                PLANNED_CALLS_PER_ROUND,
                is_last=case_index == total_cases,
            )

        if should_stop:
            break

    print(f"\n{'=' * 80}")
    print("RESUMO FINAL")
    print(f"{'=' * 80}")
    print(f"Cenários concluídos: {completed_rounds}/{total_cases}")
    print(f"Chamadas API estimadas: {api_calls}/{MAX_API_CALLS_PER_DAY}")
    if time_deltas:
        avg_time_delta = sum(time_deltas) / len(time_deltas)
        print(
            "Delta médio de tempo da Chamada 2 "
            f"(anon - sem anon): {avg_time_delta:.2f} ms"
        )
    if token_deltas:
        avg_token_delta = sum(token_deltas) / len(token_deltas)
        print(
            "Delta médio de tokens da Chamada 2 "
            f"(anon - sem anon): {avg_token_delta:.2f}"
        )


def main() -> None:
    from vcommerce_ai_agent.core import config

    if not config.GEMINI_API_KEY:
        print(
            "Erro: GEMINI_API_KEY não está definida.\n"
            "Verifique o arquivo .env na raiz do projeto."
        )
        raise SystemExit(1)

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
