from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional, Any


class ChartSuggestionSchema(BaseModel):
    """Sugestão de gráfico para renderização no frontend (Recharts)."""

    type: Literal["bar", "line", "pie", "area"] = Field(
        ...,
        description=(
            "Tipo de gráfico sugerido. Mapeia 1:1 para componentes Recharts "
            "(BarChart, LineChart, PieChart, AreaChart)."
        ),
    )
    x_axis: Optional[str] = Field(
        None,
        description=(
            "Nome da chave em `data` que deve ser usada como dataKey do eixo X. "
            "Pode ser nulo em gráficos do tipo pie."
        ),
    )
    y_axis: Optional[str] = Field(
        None,
        description=(
            "Nome da chave em `data` que deve ser usada como dataKey do valor "
            "(Bar/Line/Area)."
        ),
    )
    title: str = Field(..., description="Título sugerido para o gráfico.")
    y_axis_format: Optional[Literal["percent", "currency", "number"]] = Field(
        None,
        description=(
            "Formato sugerido para a métrica do eixo Y, usado pelo frontend "
            "para formatar tooltip e rótulos. 'percent' aplica sufixo %, "
            "'currency' formata como R$, 'number' usa separador de milhar "
            "padrão. None equivale a 'number'."
        ),
    )


class UserResponseSchema(BaseModel):
    """Parte da resposta segura para exibição direta ao usuário no frontend."""

    answer_text: str = Field(
        ...,
        description="Texto em PT-BR pronto para exibição ao usuário.",
    )
    sources_text: Optional[str] = Field(
        None,
        description="Descrição das fontes consultadas para gerar a resposta.",
    )
    data: Optional[list[dict[str, Any]]] = Field(
        None,
        description=(
            "Linhas retornadas pela query, no formato lista de dicts. "
            "Pode ser null quando a resposta não envolve dados tabulares."
        ),
    )
    chart: Optional[ChartSuggestionSchema] = Field(
        None,
        description=(
            "Sugestão opcional de gráfico. Quando null e `data` não é null, "
            "o frontend deve renderizar como tabela."
        ),
    )
    truncated: bool = Field(
        ...,
        description="Indica se o conjunto de dados foi truncado por limite de linhas.",
    )


class AgentResponseSchema(BaseModel):
    """Resposta pública do agente para um POST /ai-agent/ask.

    Os dados técnicos da execução do agente ficam restritos ao backend e
    são registrados nos logs internos. Eles não trafegam para o frontend.
    """

    status: Literal["success", "error", "out_of_scope"] = Field(
        ...,
        description=(
            "success quando a resposta foi gerada com êxito; out_of_scope quando "
            "a pergunta não pode ser respondida com os dados disponíveis; error "
            "em falhas técnicas. O HTTP status é sempre 200; o frontend deve "
            "verificar este campo."
        ),
    )
    session_id: str = Field(
        ...,
        description="Identificador da sessão atrelado a esta resposta.",
    )
    user_response: UserResponseSchema

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "success",
                "session_id": "sessao-usuario-123",
                "user_response": {
                    "answer_text": (
                        "Os 3 produtos mais vendidos foram Camiseta Básica, "
                        "Tênis Runner e Mochila Urban."
                    ),
                    "sources_text": "Fonte: pedidos do período consultado.",
                    "data": [
                        {"produto": "Camiseta Básica", "quantidade": 1240},
                        {"produto": "Tênis Runner", "quantidade": 980},
                        {"produto": "Mochila Urban", "quantidade": 870},
                    ],
                    "chart": {
                        "type": "bar",
                        "x_axis": "produto",
                        "y_axis": "quantidade",
                        "title": "Top 3 produtos mais vendidos",
                        "y_axis_format": "number",
                    },
                    "truncated": False,
                },
            }
        }
    )


class AskRequest(BaseModel):
    """Payload para POST /ai-agent/ask."""

    question: str = Field(
        ...,
        description=(
            "Pergunta do usuário em linguagem natural (PT-BR). Não há limite "
            "de tamanho aplicado pelo FastAPI; perguntas muito longas retornam "
            "status=error."
        ),
        examples=["Quais os 10 produtos mais vendidos no último mês?"],
    )
    session_id: str = Field(
        ...,
        description=(
            "Identificador da conversa. Use o mesmo valor entre requisições "
            "para encadear follow-ups (o backend recupera o histórico salvo). "
            "Requisições simultâneas na mesma `session_id` são processadas "
            "em ordem."
        ),
        examples=["sessao-usuario-123"],
    )
    page_context: Optional[
        Literal[
            "dashboard",
            "clientes",
            "pedidos",
            "produtos",
            "suporte",
            "categorias",
            "relatorios",
        ]
    ] = Field(
        None,
        description=(
            "Chave opcional da tela que abriu o drawer. O backend usa apenas "
            "valores permitidos para escolher um contexto interno de prompt "
            "na primeira pergunta de uma sessão nova. Sessões com histórico "
            "ignoram este campo."
        ),
        examples=["dashboard"],
    )


class SuggestionsRequest(BaseModel):
    """Payload para POST /ai-agent/suggestions."""

    session_id: str = Field(
        default="",
        description=(
            "Identificador da conversa. Quando informado, o backend recupera "
            "o histórico da sessão e gera sugestões contextuais de follow-up. "
            "Quando vazio ou ausente, retorna a lista fixa inicial."
        ),
        examples=["sessao-usuario-123"],
    )


class SuggestionsResponse(BaseModel):
    """Resposta de POST /ai-agent/suggestions."""

    suggestions: list[str] = Field(
        ...,
        description="Lista de 5 perguntas sugeridas em PT-BR, baseadas no schema real do banco.",
    )


class SessionSummary(BaseModel):
    """Resumo de uma sessão do agente para listagem na sidebar do frontend."""

    session_id: str = Field(..., description="Identificador da sessão.")
    title: str = Field(
        ...,
        description=(
            "Título derivado da primeira pergunta do usuário no histórico, "
            "truncado em 60 caracteres. Fallback para 'Sessão sem título' "
            "quando o histórico está vazio ou corrompido."
        ),
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp da última atualização da sessão (ISO 8601).",
    )


class SessionsListResponse(BaseModel):
    """Resposta de GET /ai-agent/sessions."""

    sessions: list[SessionSummary] = Field(
        ...,
        description="Sessões do usuário autenticado, ordenadas por updated_at decrescente.",
    )


class SessionHistoryEntry(BaseModel):
    """Entrada do histórico de uma sessão.

    Os campos data e chart são preenchidos apenas em turnos com role
    assistant quando a resposta do agente envolve dados tabulares
    e/ou sugestão de gráfico. Sessões antigas anteriores à introdução
    desses campos os trazem como None.
    """

    role: Literal["user", "assistant"] = Field(..., description="Papel da mensagem.")
    content: str = Field(..., description="Texto da mensagem.")
    sql: Optional[str] = Field(
        None,
        description=(
            "Sempre null na API pública. O SQL técnico é mantido apenas no "
            "backend para memória, auditoria e debugging interno."
        ),
    )
    sources_text: Optional[str] = Field(
        None,
        description="Descrição das fontes consultadas (apenas em turnos assistant).",
    )
    data: Optional[list[dict[str, Any]]] = Field(
        None,
        description=(
            "Linhas tabulares retornadas pela query, idênticas ao "
            "user_response.data do turno original. Apenas em turnos assistant."
        ),
    )
    chart: Optional[ChartSuggestionSchema] = Field(
        None,
        description=(
            "Sugestão de gráfico associada ao turno, idêntica ao "
            "user_response.chart do turno original. Apenas em turnos assistant."
        ),
    )


class SessionDetailResponse(BaseModel):
    """Resposta de GET /ai-agent/sessions/{session_id}."""

    session_id: str = Field(..., description="Identificador da sessão.")
    history: list[SessionHistoryEntry] = Field(
        ...,
        description=(
            "Histórico alternado user/assistant. Cada entrada traz role, "
            "content, sources_text e, quando aplicável, data e chart "
            "para restauração de visualizações no frontend. O campo sql "
            "é sempre null na resposta pública."
        ),
    )
