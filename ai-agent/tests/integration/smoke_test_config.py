"""
Configuracoes centralizadas para os smoke tests do ai-agent.

Este modulo contem parametros compartilhados entre todos os smoke tests
para garantir consistencia nas restricoes da API Gemini free tier.
"""

# Limite de requisicoes da API Gemini (free tier)
MAX_API_CALLS_PER_DAY = 20

# Rate limit: 5 requisicoes por minuto
# Cada pergunta consome ate 2 chamadas (SQL + insight).
# BATCH_SIZE=2 garante max 4 chamadas por lote, respeitando o limite.
BATCH_SIZE = 2
DELAY_BETWEEN_BATCHES_SECONDS = 75  # 1min 15s para respeitar 5 req/min

# Timeout global do smoke test
MAX_DURATION_SECONDS = 600  # 10 minutos
