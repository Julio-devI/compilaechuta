"""
Logger de pacote para o modulo ai-agent.

O pacote configura um handler de console próprio quando nenhum handler foi
registrado para o logger `vcommerce_ai_agent`, sem chamar logging.basicConfig.
"""

import json
import logging

logger = logging.getLogger("vcommerce_ai_agent")

_STANDARD_LOG_RECORD_KEYS = set(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__
) | {"message", "asctime"}


class _AgentFormatter(logging.Formatter):
    """Formatter que preserva campos extras em JSON no console."""

    def format(self, record: logging.LogRecord) -> str:
        message = super().format(record)
        extra = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _STANDARD_LOG_RECORD_KEYS and not key.startswith("_")
        }
        if record.__dict__.get("event") == "agent_response_debug":
            extra.pop("response", None)
        if extra:
            message += f" | {json.dumps(extra, default=str, ensure_ascii=False)}"
        return message


if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(
        _AgentFormatter("%(name)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(handler)

logger.setLevel(logging.INFO)
logger.propagate = False
