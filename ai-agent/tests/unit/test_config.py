"""Testes unitários para carregamento de configuração do agente."""

import os

from vcommerce_ai_agent.core import config


def test_candidate_env_paths_prefers_backend_before_ai_agent() -> None:
    """Garante que backend/.env seja padrão e ai-agent/.env seja fallback."""
    paths = config._candidate_env_paths()

    assert paths == (
        config._BACKEND_ENV_PATH,
        config._AI_AGENT_ENV_PATH,
    )


def test_load_env_files_uses_backend_before_ai_agent_fallback(
    tmp_path,
    monkeypatch,
) -> None:
    """Garante que o fallback do ai-agent nao sobrescreva o backend."""
    backend_env = tmp_path / "backend.env"
    ai_agent_env = tmp_path / "ai-agent.env"
    backend_env.write_text(
        "\n".join(
            [
                "TEST_VCOMMERCE_CONFIG_SHARED=backend",
                "TEST_VCOMMERCE_CONFIG_BACKEND_ONLY=backend",
            ]
        ),
        encoding="utf-8",
    )
    ai_agent_env.write_text(
        "\n".join(
            [
                "TEST_VCOMMERCE_CONFIG_SHARED=ai-agent",
                "TEST_VCOMMERCE_CONFIG_AI_ONLY=ai-agent",
            ]
        ),
        encoding="utf-8",
    )
    for key in (
        "TEST_VCOMMERCE_CONFIG_SHARED",
        "TEST_VCOMMERCE_CONFIG_BACKEND_ONLY",
        "TEST_VCOMMERCE_CONFIG_AI_ONLY",
    ):
        monkeypatch.delenv(key, raising=False)

    loaded_paths = config._load_env_files((backend_env, ai_agent_env))

    assert loaded_paths == (backend_env, ai_agent_env)
    assert os.getenv("TEST_VCOMMERCE_CONFIG_SHARED") == "backend"
    assert os.getenv("TEST_VCOMMERCE_CONFIG_BACKEND_ONLY") == "backend"
    assert os.getenv("TEST_VCOMMERCE_CONFIG_AI_ONLY") == "ai-agent"


def test_load_env_files_does_not_override_process_environment(
    tmp_path,
    monkeypatch,
) -> None:
    """Garante que variáveis do processo tenham maior precedência."""
    backend_env = tmp_path / "backend.env"
    ai_agent_env = tmp_path / "ai-agent.env"
    backend_env.write_text(
        "TEST_VCOMMERCE_CONFIG_PROCESS=backend\n",
        encoding="utf-8",
    )
    ai_agent_env.write_text(
        "TEST_VCOMMERCE_CONFIG_PROCESS=ai-agent\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("TEST_VCOMMERCE_CONFIG_PROCESS", "process")

    config._load_env_files((backend_env, ai_agent_env))

    assert os.getenv("TEST_VCOMMERCE_CONFIG_PROCESS") == "process"
