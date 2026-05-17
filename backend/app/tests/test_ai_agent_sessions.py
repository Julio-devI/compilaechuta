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
    assert len(persisted_calls) == 1
    assert persisted_calls[0][:3] == (fake_db, "user-1", "session-1")
    assert json.loads(persisted_calls[0][3]) == exported_history


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
            saved_history[1],
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
