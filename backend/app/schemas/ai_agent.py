from pydantic import BaseModel, Field
from typing import Literal, Optional, Any


class ChartSuggestionSchema(BaseModel):
    type: Literal["bar", "line", "pie", "area"]
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    title: str


class ResponseErrorSchema(BaseModel):
    code: str
    message: str
    stage: Literal[
        "input",
        "schema",
        "sql_generation",
        "sql_validation",
        "database",
        "insight_generation",
        "llm",
    ]
    retryable: bool


class UserResponseSchema(BaseModel):
    answer_text: str
    sources_text: Optional[str] = None
    data: Optional[list[dict[str, Any]]] = None
    chart: Optional[ChartSuggestionSchema] = None
    truncated: bool


class DeveloperDebugSchema(BaseModel):
    sql: str
    error: Optional[ResponseErrorSchema] = None
    total_time_ms: Optional[float] = None
    sql_generation_time_ms: Optional[float] = None
    query_execution_time_ms: Optional[float] = None
    insight_generation_time_ms: Optional[float] = None
    tokens_used: Optional[int] = None


class AgentResponseSchema(BaseModel):
    status: Literal["success", "error", "out_of_scope"]
    user_response: UserResponseSchema
    developer_debug: DeveloperDebugSchema


class AskRequest(BaseModel):
    question: str
    session_id: str


class SuggestionsRequest(BaseModel):
    previous_suggestions: list[str] = Field(default_factory=list)


class SuggestionsResponse(BaseModel):
    suggestions: list[str]
