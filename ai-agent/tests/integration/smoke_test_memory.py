"""
Smoke test de memória do agente V-Commerce.

Executa fluxos de conversa encadeados (follow-up) contra a API Gemini real,
validando se o agente mantém e utiliza corretamente o histórico (DA-22, DA-23).

As configuracoes compartilhadas (limites, timeouts, delays) estao em
smoke_test_config.py para garantir consistencia entre todos os smoke tests.
"""

import asyncio
import sqlite3
import sys
import tempfile
from pathlib import Path

# Adiciona ai-agent/ ao PYTHONPATH para permitir imports do pacote src
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))
from tests.integration.smoke_test_db import create_test_db




# ---------------------------------------------------------------------------
# 2. Execucao do smoke test de memoria
# ---------------------------------------------------------------------------

async def _run_smoke_test(db_path: str) -> None:
    from src.agent import VCommerceAgent
    from tests.integration.smoke_test_config import DELAY_BETWEEN_BATCHES_SECONDS, BATCH_SIZE

    agent = VCommerceAgent(db_path=db_path)
    
    print("\n" + "="*60)
    print("INICIANDO SMOKE TEST DE MEMÓRIA (7 TURNOS = 14 CALLS API)")
    print("="*60)

    questions_part_1 = [
        "Qual a receita total por regiao?",
        "E qual regiao vendeu mais?",
        "Quantos pedidos essa regiao teve?",
        "Quais foram os 3 produtos mais vendidos nessa regiao?",
        "Qual deles teve a maior avaliacao media?"
    ]

    print("\n--- BLOCO 1: Cadeia Extensa de Follow-up (5 Turnos) ---")
    
    for i, q in enumerate(questions_part_1):
        print(f"\nS{i+1}: {q}")
        try:
            resp = await agent.ask(q)
            print(f" SQL: {resp.sql}")
            print(f" Resposta: {resp.text}")
        except Exception as e:
            print(f" [ERRO] {e}")
        
        # Batching: Sleep every BATCH_SIZE queries to avoid rate limit
        if (i + 1) % BATCH_SIZE == 0 and (i + 1) < len(questions_part_1):
            print(f"\n[AGUARDANDO] {DELAY_BETWEEN_BATCHES_SECONDS}s para respeitar o rate limit...")
            await asyncio.sleep(DELAY_BETWEEN_BATCHES_SECONDS)

    print(f"\n[AGUARDANDO] {DELAY_BETWEEN_BATCHES_SECONDS}s antes do Export/Import...")
    await asyncio.sleep(DELAY_BETWEEN_BATCHES_SECONDS)

    # ---------------------------------------------------------
    # BLOCO 2 - Export / Import (S9, S10)
    # ---------------------------------------------------------
    print("\n--- BLOCO 2: Export / Import ---")
    
    exported = agent.export_history()
    print(f"\n[Ação] Histórico exportado: {len(exported)} mensagens ({(len(exported))//2} turnos).")
    
    del agent
    print("[Ação] Agente destruído (simulando nova requisição HTTP).")
    
    agent = VCommerceAgent(db_path=db_path)
    agent.import_history(exported)
    print(f"[Ação] Novo agente criado. Histórico importado com sucesso.")

    questions_part_2 = [
        "Voltando a regiao que mais vendeu, quantos clientes moram la?",
        "E quantos desses clientes sao do segmento Campeões?"
    ]

    for i, q in enumerate(questions_part_2):
        print(f"\nS{9+i}: {q}")
        try:
            resp = await agent.ask(q)
            print(f" SQL: {resp.sql}")
            print(f" Resposta: {resp.text}")
        except Exception as e:
            print(f" [ERRO] {e}")

        if i == 0:
            print(f"\n[AGUARDANDO] {DELAY_BETWEEN_BATCHES_SECONDS}s para respeitar o rate limit...")
            await asyncio.sleep(DELAY_BETWEEN_BATCHES_SECONDS)

    print("\n" + "="*60)
    print("TESTE DE MEMÓRIA DE 7 TURNOS CONCLUÍDO COM SUCESSO")
    print("="*60)


def main() -> None:
    from src.core import config

    if not config.GEMINI_API_KEY:
        print("Erro: GEMINI_API_KEY nao esta definida no .env.")
        raise SystemExit(1)

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        print("Criando banco de teste temporario...")
        create_test_db(db_path)
        print(f"Banco criado em: {db_path}\n")

        asyncio.run(_run_smoke_test(db_path))
    finally:
        Path(db_path).unlink(missing_ok=True)
        print(f"\nBanco temporario removido.")


if __name__ == "__main__":
    main()
