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

    Os dados técnicos do agente (SQL gerado, tempos de execução, tokens,
    detalhes de erro) ficam restritos ao backend e são registrados nos logs
    do logger `vcommerce_ai_agent`. Eles não trafegam para o frontend.
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
            "Requisições simultâneas na mesma `session_id` são serializadas "
            "por lock em memória."
        ),
        examples=["sessao-usuario-123"],
    )


class SuggestionsRequest(BaseModel):
    """Payload para POST /ai-agent/suggestions."""

    session_id: str = Field(
        default="",
        description=(
            "Identificador da conversa. Quando informado, o backend recupera "
            "o histórico da sessão e gera sugestões contextuais de follow-up "
            "via LLM. Quando vazio ou ausente, retorna a lista fixa inicial."
        ),
        examples=["sessao-usuario-123"],
    )


class SuggestionsResponse(BaseModel):
    """Resposta de POST /ai-agent/suggestions."""

    suggestions: list[str] = Field(
        ...,
        description="Lista de 5 perguntas sugeridas em PT-BR, baseadas no schema real do banco.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "suggestions": [
                        "Qual é a receita total agrupada por região do país?",
                        "Quais são os principais clientes do segmento 'Campeões' que mais gastaram na loja?",
                        "Qual é o tempo médio de resolução de tickets por tipo de problema?",
                        "Quais são os 10 produtos com a melhor média de avaliação dos clientes?",
                        "Quais canais de aquisição geram o maior número de compras e adições ao carrinho?",
                    ]
                },
                {
                    "suggestions": [
                        "Qual região teve o maior crescimento de receita no último trimestre?",
                        "Quais produtos da região Sudeste têm a maior margem de lucro?",
                        "Como a receita por região se compara ao mesmo período do ano anterior?",
                        "Quais são os 5 estados com maior ticket médio de compra?",
                        "Existe correlação entre a região do cliente e o canal de aquisição preferido?",
                    ]
                },
            ]
        }
    )
