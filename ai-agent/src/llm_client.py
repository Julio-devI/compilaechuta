"""
Cliente reutilizável para chamadas ao LLM via PydanticAI + Gemini.

Encapsula a criação do modelo e do agente, permitindo que diferentes
módulos (sql_generator, insight_generator) reutilizem a infraestrutura
com configurações distintas.
"""

from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.settings import ModelSettings

from src import config


class LLMAgent:
    """Wrapper reutilizável para execução de prompts via Gemini."""

    def __init__(
        self,
        system_prompt: str,
        temperature: float,
        max_tokens: int | None = None,
    ) -> None:
        """
        Inicializa o agente com o system prompt e parâmetros do modelo.

        Args:
            system_prompt: Instruções de sistema a serem injetadas no prompt.
            temperature: Temperatura do modelo (0.0 para determinístico).
            max_tokens: Limite máximo de tokens na resposta (None = padrão do modelo).
        """
        config.assert_gemini_key()

        model = GeminiModel(
            config.LLM_MODEL,
            api_key=config.GEMINI_API_KEY,
        )

        settings = ModelSettings(temperature=temperature)
        if max_tokens is not None:
            settings.max_tokens = max_tokens

        self._agent = Agent(
            model,
            system_prompt=system_prompt,
            model_settings=settings,
        )

    async def run(self, question: str) -> str:
        """
        Executa o prompt contra o LLM e retorna o texto da resposta.

        Args:
            question: Pergunta ou instrução do usuário.

        Returns:
            Texto bruto retornado pelo modelo.

        Raises:
            RuntimeError: Se a comunicação com a API falhar.
        """
        try:
            result = await self._agent.run(question)
            return result.data
        except Exception as exc:
            raise RuntimeError(
                f"Falha na comunicação com o modelo Gemini: {exc}"
            ) from exc
