import json
from collections.abc import AsyncGenerator, Generator
from dataclasses import dataclass
from datetime import datetime
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, get_db
from app.api.v1 import ai_agent
from app.main import app


@dataclass
class FakeUserResponse:
    answer_text: str
    sources_text: str | None
    data: list[dict[str, Any]] | None
    chart: dict[str, Any] | None
    truncated: bool


@dataclass
class FakeDeveloperDebug:
    error: object | None = None


@pytest.fixture(autouse=True)
def clear_dependency_overrides() -> Generator[None, None, None]:
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def override_dependencies(user_id: str = "user-1") -> object:
    fake_db = object()

    async def override_get_current_user() -> dict[str, str]:
        return {"sub": user_id}

    async def override_get_db() -> AsyncGenerator[object, None]:
        yield fake_db

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    return fake_db


def build_agent_response(
    answer_text: str = "Resposta gerada pelo agente.",
    data: list[dict[str, Any]] | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        status="success",
        user_response=FakeUserResponse(
            answer_text=answer_text,
            sources_text="Fonte: base Gold.",
            data=data,
            chart=None,
            truncated=False,
        ),
        developer_debug=FakeDeveloperDebug(),
    )


def test_ask_agent_uses_history_and_persists_success(monkeypatch) -> None:
    fake_db = override_dependencies()
    saved_history = [
        {"role": "user", "content": "Pergunta anterior", "sql": None},
        {"role": "assistant", "content": "Resposta anterior", "sql": "SELECT 1"},
    ]
    exported_history = [
        *saved_history,
        {"role": "user", "content": "Qual foi a receita?", "sql": None},
        {"role": "assistant", "content": "A receita foi R$ 10.", "sql": "SELECT 10"},
    ]
    persisted_calls: list[tuple[object, str, str, str]] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        assert db is fake_db
        assert user_id == "user-1"
        assert session_id == "session-1"
        return SimpleNamespace(history_json=json.dumps(saved_history))

    async def fake_create_or_update_session(
        db,
        user_id: str,
        session_id: str,
        history_json: str,
    ) -> None:
        persisted_calls.append((db, user_id, session_id, history_json))

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            self.imported_history: list[dict[str, Any]] | None = None

        def import_history(self, history: list[dict[str, Any]]) -> None:
            self.imported_history = history

        def clear_history(self) -> None:
            self.imported_history = []

        async def ask(self, question: str) -> SimpleNamespace:
            assert question == "Qual foi a receita?"
            assert self.imported_history == saved_history
            return build_agent_response(data=[{"receita": 10}])

        def export_history(self) -> list[dict[str, Any]]:
            return exported_history

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent,
        "create_or_update_session",
        fake_create_or_update_session,
    )
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual foi a receita?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["session_id"] == "session-1"
    assert response.json()["user_response"]["data"] == [{"receita": 10}]
    assert len(persisted_calls) == 2
    assert persisted_calls[0][:3] == (fake_db, "user-1", "session-1")
    assert json.loads(persisted_calls[0][3]) == [
        *saved_history,
        {
            "role": "user",
            "content": "Qual foi a receita?",
            "sql": None,
            "sources_text": None,
            "data": None,
            "chart": None,
        },
    ]
    assert persisted_calls[1][:3] == (fake_db, "user-1", "session-1")
    assert json.loads(persisted_calls[1][3]) == exported_history


def test_suggestions_without_session_returns_initial_list(monkeypatch) -> None:
    override_dependencies()
    agents: list[Any] = []

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            self.history_arg: list[dict[str, Any]] | None = None
            agents.append(self)

        async def initial_suggestions(
            self,
            history: list[dict[str, Any]] | None = None,
        ) -> list[str]:
            self.history_arg = history
            return [
                "Pergunta 1?",
                "Pergunta 2?",
                "Pergunta 3?",
                "Pergunta 4?",
                "Pergunta 5?",
            ]

    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post("/api/v1/ai-agent/suggestions", json={})

    assert response.status_code == 200
    assert response.json()["suggestions"] == [
        "Pergunta 1?",
        "Pergunta 2?",
        "Pergunta 3?",
        "Pergunta 4?",
        "Pergunta 5?",
    ]
    assert agents[0].history_arg is None


def test_suggestions_with_session_uses_saved_history(monkeypatch) -> None:
    override_dependencies()
    saved_history = [
        {"role": "user", "content": "Pergunta anterior", "sql": None},
        {"role": "assistant", "content": "Resposta anterior", "sql": "SELECT 1"},
    ]
    agents: list[Any] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        assert user_id == "user-1"
        assert session_id == "session-1"
        return SimpleNamespace(history_json=json.dumps(saved_history))

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            self.history_arg: list[dict[str, Any]] | None = None
            agents.append(self)

        async def initial_suggestions(
            self,
            history: list[dict[str, Any]] | None = None,
        ) -> list[str]:
            self.history_arg = history
            return ["Follow-up 1?", "Follow-up 2?"]

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/suggestions",
            json={"session_id": "session-1"},
        )

    assert response.status_code == 200
    assert response.json() == {"suggestions": ["Follow-up 1?", "Follow-up 2?"]}
    assert agents[0].history_arg == saved_history


def test_list_sessions_returns_authenticated_user_sessions(monkeypatch) -> None:
    fake_db = override_dependencies()
    rows = [
        SimpleNamespace(
            session_id="session-1",
            history_json=json.dumps(
                [{"role": "user", "content": "Qual foi a receita?", "sql": None}]
            ),
            updated_at=datetime(2026, 5, 17, 12, 30, 0),
        )
    ]

    async def fake_list_sessions_by_user(db, user_id: str):
        assert db is fake_db
        assert user_id == "user-1"
        return rows

    monkeypatch.setattr(ai_agent, "list_sessions_by_user", fake_list_sessions_by_user)

    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions")

    assert response.status_code == 200
    assert response.json()["sessions"][0]["session_id"] == "session-1"
    assert response.json()["sessions"][0]["title"] == "Qual foi a receita?"
    assert response.json()["sessions"][0]["updated_at"].startswith(
        "2026-05-17T12:30:00"
    )


def test_get_session_detail_returns_saved_history(monkeypatch) -> None:
    override_dependencies()
    saved_history = [
        {"role": "user", "content": "Qual foi a receita?", "sql": None},
        {
            "role": "assistant",
            "content": "A receita foi R$ 10.",
            "sql": "SELECT 10",
            "sources_text": "Fonte: base Gold.",
            "data": [{"receita": 10}],
            "chart": None,
        },
    ]

    async def fake_get_session(db, user_id: str, session_id: str):
        assert user_id == "user-1"
        assert session_id == "session-1"
        return SimpleNamespace(history_json=json.dumps(saved_history))

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)

    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions/session-1")

    assert response.status_code == 200
    assert response.json() == {
        "session_id": "session-1",
        "history": [
            {
                "role": "user",
                "content": "Qual foi a receita?",
                "sql": None,
                "sources_text": None,
                "data": None,
                "chart": None,
            },
            {
                "role": "assistant",
                "content": "A receita foi R$ 10.",
                "sql": None,
                "sources_text": "Fonte: base Gold.",
                "data": [{"receita": 10}],
                "chart": None,
            },
        ],
    }


def test_get_session_detail_returns_404_for_missing_session(monkeypatch) -> None:
    override_dependencies()

    async def fake_get_session(db, user_id: str, session_id: str):
        assert user_id == "user-1"
        assert session_id == "missing-session"
        return None

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)

    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions/missing-session")

    assert response.status_code == 404
    assert response.json() == {"detail": "Sessão não encontrada."}


def test_delete_session_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.delete("/api/v1/ai-agent/sessions/session-1")

    assert response.status_code == 401


def test_delete_session_removes_authenticated_user_session(monkeypatch) -> None:
    fake_db = override_dependencies()
    calls: list[tuple[object, str, str]] = []

    async def fake_delete_session(db, user_id: str, session_id: str) -> bool:
        calls.append((db, user_id, session_id))
        return True

    monkeypatch.setattr(ai_agent, "delete_session", fake_delete_session)

    with TestClient(app) as client:
        response = client.delete("/api/v1/ai-agent/sessions/session-1")

    assert response.status_code == 204
    assert response.content == b""
    assert calls == [(fake_db, "user-1", "session-1")]


def test_delete_session_returns_404_for_another_user_session(monkeypatch) -> None:
    override_dependencies(user_id="user-1")

    async def fake_delete_session(db, user_id: str, session_id: str) -> bool:
        assert user_id == "user-1"
        assert session_id == "session-from-user-2"
        return False

    monkeypatch.setattr(ai_agent, "delete_session", fake_delete_session)

    with TestClient(app) as client:
        response = client.delete("/api/v1/ai-agent/sessions/session-from-user-2")

    assert response.status_code == 404
    assert response.json() == {"detail": "Sessão não encontrada."}


# ---------------------------------------------------------------------
# Autenticacao: sem token JWT, os endpoints devem retornar 401.
# ---------------------------------------------------------------------


def test_ask_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 401


def test_suggestions_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/suggestions",
            json={"session_id": "session-1"},
        )

    assert response.status_code == 401


def test_list_sessions_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions")

    assert response.status_code == 401


def test_get_session_detail_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions/session-1")

    assert response.status_code == 401


# ---------------------------------------------------------------------
# Validacao Pydantic: payloads malformados retornam 422.
# ---------------------------------------------------------------------


def test_ask_rejects_missing_question() -> None:
    override_dependencies()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"session_id": "session-1"},
        )

    assert response.status_code == 422


def test_ask_rejects_non_string_question() -> None:
    override_dependencies()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": 123, "session_id": "session-1"},
        )

    assert response.status_code == 422


def test_suggestions_rejects_non_string_session_id() -> None:
    override_dependencies()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/suggestions",
            json={"session_id": 42},
        )

    assert response.status_code == 422


# ---------------------------------------------------------------------
# /ask: ramos nao cobertos (sem historico, historico corrompido, erros do
# agente, out_of_scope, chart serializado).
# ---------------------------------------------------------------------


def test_ask_without_previous_history_skips_import(monkeypatch) -> None:
    """Quando nao existe sessao salva, import_history nao deve ser chamado."""
    override_dependencies()
    persisted: list[str] = []
    imported_history: list[Any] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return None

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        persisted.append(history_json)

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            imported_history.append(history)

        def clear_history(self) -> None:
            pass

        async def ask(self, question: str) -> SimpleNamespace:
            return build_agent_response()

        def export_history(self) -> list[dict[str, Any]]:
            return [{"role": "user", "content": "Qual?", "sql": None}]

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert imported_history == []
    assert len(persisted) == 2
    assert json.loads(persisted[0]) == [
        {
            "role": "user",
            "content": "Qual?",
            "sql": None,
            "sources_text": None,
            "data": None,
            "chart": None,
        }
    ]


def test_ask_with_corrupted_history_treats_as_empty(monkeypatch) -> None:
    """history_json invalido como JSON deve ser tratado como historico vazio."""
    override_dependencies()
    imported_history: list[Any] = []
    clear_called: list[bool] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return SimpleNamespace(history_json="{not json")

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        return None

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            imported_history.append(history)

        def clear_history(self) -> None:
            clear_called.append(True)

        async def ask(self, question: str) -> SimpleNamespace:
            return build_agent_response()

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert imported_history == []
    assert clear_called == []


def test_ask_with_non_list_history_treats_as_empty(monkeypatch) -> None:
    """history_json contendo dict (nao-lista) e tratado como historico vazio."""
    override_dependencies()
    imported_history: list[Any] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return SimpleNamespace(history_json='{"foo": 1}')

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        return None

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            imported_history.append(history)

        def clear_history(self) -> None:
            pass

        async def ask(self, question: str) -> SimpleNamespace:
            return build_agent_response()

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert imported_history == []


def test_ask_clears_history_when_import_raises_value_error(monkeypatch) -> None:
    """Quando import_history lanca ValueError, clear_history e chamado e o fluxo segue."""
    override_dependencies()
    saved_history = [
        {"role": "user", "content": "Pergunta anterior", "sql": None},
        {"role": "assistant", "content": "Resposta anterior", "sql": "SELECT 1"},
    ]
    persisted: list[str] = []
    clear_called: list[bool] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return SimpleNamespace(history_json=json.dumps(saved_history))

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        persisted.append(history_json)

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            raise ValueError("historico invalido")

        def clear_history(self) -> None:
            clear_called.append(True)

        async def ask(self, question: str) -> SimpleNamespace:
            return build_agent_response()

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert clear_called == [True]
    assert len(persisted) == 2
    assert json.loads(persisted[0]) == [
        {
            "role": "user",
            "content": "Qual?",
            "sql": None,
            "sources_text": None,
            "data": None,
            "chart": None,
        }
    ]


def test_ask_error_status_replaces_answer_text_and_removes_pending_question(
    monkeypatch,
) -> None:
    """status='error' sobrescreve answer_text e remove pergunta pendente."""
    override_dependencies()
    persisted: list[str] = []
    deleted_sessions: list[str] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return None

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        persisted.append(history_json)

    async def fake_delete_session(db, user_id: str, session_id: str) -> bool:
        deleted_sessions.append(session_id)
        return True

    @dataclass
    class FakeError:
        code: str = "LLM_RATE_LIMIT_ERROR"
        message: str = "rate limit"
        stage: str = "llm"
        retryable: bool = True

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            pass

        def clear_history(self) -> None:
            pass

        async def ask(self, question: str) -> SimpleNamespace:
            return SimpleNamespace(
                status="error",
                user_response=FakeUserResponse(
                    answer_text="texto original",
                    sources_text=None,
                    data=None,
                    chart=None,
                    truncated=False,
                ),
                developer_debug=FakeDeveloperDebug(error=FakeError()),
            )

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "delete_session", fake_delete_session)
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "error"
    assert body["user_response"]["answer_text"] == (
        "Muitas requisições no momento. Aguarde um instante e tente novamente."
    )
    assert json.loads(persisted[0]) == [
        {
            "role": "user",
            "content": "Qual?",
            "sql": None,
            "sources_text": None,
            "data": None,
            "chart": None,
        }
    ]
    assert deleted_sessions == ["session-1"]


def test_ask_error_unknown_code_uses_fallback_message(monkeypatch) -> None:
    """Code de erro nao mapeado em _ERROR_MESSAGES cai no fallback generico."""
    override_dependencies()
    persisted: list[str] = []
    deleted_sessions: list[str] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return None

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        persisted.append(history_json)

    async def fake_delete_session(db, user_id: str, session_id: str) -> bool:
        deleted_sessions.append(session_id)
        return True

    @dataclass
    class FakeError:
        code: str = "CODIGO_INEXISTENTE"
        message: str = "x"
        stage: str = "llm"
        retryable: bool = False

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            pass

        def clear_history(self) -> None:
            pass

        async def ask(self, question: str) -> SimpleNamespace:
            return SimpleNamespace(
                status="error",
                user_response=FakeUserResponse(
                    answer_text="original",
                    sources_text=None,
                    data=None,
                    chart=None,
                    truncated=False,
                ),
                developer_debug=FakeDeveloperDebug(error=FakeError()),
            )

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "delete_session", fake_delete_session)
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert response.json()["user_response"]["answer_text"] == (
        "Ocorreu uma falha no processamento. Tente novamente ou contate o suporte."
    )
    assert len(persisted) == 1
    assert deleted_sessions == ["session-1"]


def test_ask_error_with_previous_history_restores_saved_history(monkeypatch) -> None:
    """Erro em follow-up remove apenas a pergunta pendente."""
    override_dependencies()
    saved_history = [
        {"role": "user", "content": "Pergunta anterior", "sql": None},
        {"role": "assistant", "content": "Resposta anterior", "sql": "SELECT 1"},
    ]
    persisted: list[str] = []
    deleted_sessions: list[str] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return SimpleNamespace(history_json=json.dumps(saved_history))

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        persisted.append(history_json)

    async def fake_delete_session(db, user_id: str, session_id: str) -> bool:
        deleted_sessions.append(session_id)
        return True

    @dataclass
    class FakeError:
        code: str = "LLM_TIMEOUT"
        message: str = "timeout"
        stage: str = "llm"
        retryable: bool = True

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            self.imported_history: list[dict[str, Any]] | None = None

        def import_history(self, history: list[dict[str, Any]]) -> None:
            self.imported_history = history

        def clear_history(self) -> None:
            self.imported_history = []

        async def ask(self, question: str) -> SimpleNamespace:
            assert question == "Pergunta com erro"
            assert self.imported_history == saved_history
            return SimpleNamespace(
                status="error",
                user_response=FakeUserResponse(
                    answer_text="original",
                    sources_text=None,
                    data=None,
                    chart=None,
                    truncated=False,
                ),
                developer_debug=FakeDeveloperDebug(error=FakeError()),
            )

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "delete_session", fake_delete_session)
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Pergunta com erro", "session_id": "session-1"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "error"
    assert len(persisted) == 2
    assert json.loads(persisted[0]) == [
        *saved_history,
        {
            "role": "user",
            "content": "Pergunta com erro",
            "sql": None,
            "sources_text": None,
            "data": None,
            "chart": None,
        },
    ]
    assert json.loads(persisted[1]) == saved_history
    assert deleted_sessions == []


def test_ask_out_of_scope_replaces_answer_text_and_removes_pending_question(
    monkeypatch,
) -> None:
    """status='out_of_scope' usa mensagem padrao e remove pergunta pendente."""
    override_dependencies()
    persisted: list[str] = []
    deleted_sessions: list[str] = []

    async def fake_get_session(db, user_id: str, session_id: str):
        return None

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        persisted.append(history_json)

    async def fake_delete_session(db, user_id: str, session_id: str) -> bool:
        deleted_sessions.append(session_id)
        return True

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            pass

        def clear_history(self) -> None:
            pass

        async def ask(self, question: str) -> SimpleNamespace:
            return SimpleNamespace(
                status="out_of_scope",
                user_response=FakeUserResponse(
                    answer_text="texto original",
                    sources_text=None,
                    data=None,
                    chart=None,
                    truncated=False,
                ),
                developer_debug=FakeDeveloperDebug(error=None),
            )

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "delete_session", fake_delete_session)
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={"question": "Qual?", "session_id": "session-1"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "out_of_scope"
    assert body["user_response"]["answer_text"].startswith("Desculpe, meu escopo é")
    assert json.loads(persisted[0]) == [
        {
            "role": "user",
            "content": "Qual?",
            "sql": None,
            "sources_text": None,
            "data": None,
            "chart": None,
        }
    ]
    assert deleted_sessions == ["session-1"]


def test_ask_serializes_chart_in_response(monkeypatch) -> None:
    """O campo chart e propagado para o JSON tal como retornado pelo agente."""
    override_dependencies()

    async def fake_get_session(db, user_id: str, session_id: str):
        return None

    async def fake_create_or_update_session(
        db, user_id: str, session_id: str, history_json: str
    ) -> None:
        return None

    chart_payload = {
        "type": "bar",
        "x_axis": "produto",
        "y_axis": "quantidade",
        "title": "Top produtos",
        "y_axis_format": "number",
    }

    class FakeAgent:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def import_history(self, history: list[dict[str, Any]]) -> None:
            pass

        def clear_history(self) -> None:
            pass

        async def ask(self, question: str) -> SimpleNamespace:
            return SimpleNamespace(
                status="success",
                user_response=FakeUserResponse(
                    answer_text="Top produtos vendidos.",
                    sources_text="Fonte: base Gold.",
                    data=[{"produto": "X", "quantidade": 10}],
                    chart=chart_payload,
                    truncated=False,
                ),
                developer_debug=FakeDeveloperDebug(),
            )

        def export_history(self) -> list[dict[str, Any]]:
            return []

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)
    monkeypatch.setattr(
        ai_agent, "create_or_update_session", fake_create_or_update_session
    )
    monkeypatch.setattr(ai_agent, "VCommerceAgent", FakeAgent)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/ai-agent/ask",
            json={
                "question": "Quais os produtos mais vendidos?",
                "session_id": "session-1",
            },
        )

    assert response.status_code == 200
    assert response.json()["user_response"]["chart"] == chart_payload


# ---------------------------------------------------------------------
# Helper _derive_title: cobertura parametrizada de casos extremos.
# ---------------------------------------------------------------------


@pytest.mark.parametrize(
    "history_json, expected",
    [
        (None, "Sessão sem título"),
        ("", "Sessão sem título"),
        ("{not json", "Sessão sem título"),
        ('"oi"', "Sessão sem título"),
        ("[]", "Sessão sem título"),
        (
            json.dumps([{"role": "assistant", "content": "resposta"}]),
            "Sessão sem título",
        ),
        (json.dumps([{"role": "user", "content": ""}]), "Sessão sem título"),
        (json.dumps([{"role": "user", "content": "   "}]), "Sessão sem título"),
        (
            json.dumps([{"role": "user", "content": "Qual a receita?"}]),
            "Qual a receita?",
        ),
        (
            json.dumps([{"role": "user", "content": "a" * 100}]),
            "a" * 60 + "…",
        ),
    ],
)
def test_derive_title_parametrized(history_json: str | None, expected: str) -> None:
    assert ai_agent._derive_title(history_json) == expected


# ---------------------------------------------------------------------
# GET /sessions e GET /sessions/{id}: tolerancia a historicos corrompidos.
# ---------------------------------------------------------------------


def test_list_sessions_uses_default_title_for_corrupted_history(monkeypatch) -> None:
    override_dependencies()
    rows = [
        SimpleNamespace(
            session_id="session-1",
            history_json="{not json",
            updated_at=datetime(2026, 5, 17, 12, 0, 0),
        )
    ]

    async def fake_list_sessions_by_user(db, user_id: str):
        return rows

    monkeypatch.setattr(ai_agent, "list_sessions_by_user", fake_list_sessions_by_user)

    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions")

    assert response.status_code == 200
    assert response.json()["sessions"][0]["title"] == "Sessão sem título"


def test_get_session_detail_with_corrupted_history_returns_empty_history(monkeypatch) -> None:
    override_dependencies()

    async def fake_get_session(db, user_id: str, session_id: str):
        return SimpleNamespace(history_json="{not json")

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)

    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions/session-1")

    assert response.status_code == 200
    assert response.json() == {"session_id": "session-1", "history": []}


def test_get_session_detail_with_non_list_history_returns_empty(monkeypatch) -> None:
    override_dependencies()

    async def fake_get_session(db, user_id: str, session_id: str):
        return SimpleNamespace(history_json='"oi"')

    monkeypatch.setattr(ai_agent, "get_session", fake_get_session)

    with TestClient(app) as client:
        response = client.get("/api/v1/ai-agent/sessions/session-1")

    assert response.status_code == 200
    assert response.json() == {"session_id": "session-1", "history": []}
