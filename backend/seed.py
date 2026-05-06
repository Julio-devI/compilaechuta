# backend/seed.py
#
# Popula o banco local com dados dos CSVs brutos simulando o que viria da camada Gold.
# As métricas calculadas (qtd_pedidos, total_gasto, etc.) são derivadas aqui da mesma
# forma que o pipeline Databricks fará na produção.
#
# Uso:
#   python seed.py                  → insere todos os clientes
#   python seed.py --limit 500      → insere apenas os primeiros 500 (mais rápido para dev)
#
# Configuração:
#   Defina CSV_DIR no .env apontando para a pasta com os CSVs brutos.
#   Ex: CSV_DIR=/home/usuario/downloads/vcommerce-data

import asyncio
import argparse
import csv
import os
import random
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.clientes import Cliente
from app.models.tickets import Ticket

load_dotenv()

DATA_DIR       = Path(os.getenv("CSV_DIR", "./data"))
CSV_CLIENTES   = DATA_DIR / "clientes.csv"
CSV_PEDIDOS    = DATA_DIR / "pedidos.csv"
CSV_TICKETS    = DATA_DIR / "suporte_tickets.csv"
CSV_AVALIACOES = DATA_DIR / "avaliacoes.csv"


def parse_date(value: str) -> datetime | None:
    if not value or value.strip() == "":
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue
    return None


def calcular_segmento_rfm(qtd_pedidos: int, total_gasto: float) -> str:
    """Segmentação RFM simplificada — será refinada pelo pipeline Gold."""
    if qtd_pedidos >= 10 and total_gasto >= 3000:
        return "champion"
    elif qtd_pedidos >= 5 and total_gasto >= 1000:
        return "loyal"
    elif qtd_pedidos >= 2:
        return "potential"
    elif qtd_pedidos == 1:
        return "new"
    else:
        return "inactive"


def _inferir_regiao(estado: str) -> str | None:
    """Mapeia estado brasileiro para região geográfica."""
    regioes = {
        "Norte":        {"AM", "RR", "AP", "PA", "TO", "RO", "AC"},
        "Nordeste":     {"MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA"},
        "Centro-Oeste": {"MT", "MS", "GO", "DF"},
        "Sudeste":      {"SP", "RJ", "MG", "ES"},
        "Sul":          {"PR", "SC", "RS"},
    }
    for regiao, estados in regioes.items():
        if estado.strip().upper() in estados or any(estado.strip().lower() in e.lower() for e in estados):
            return regiao
    return None


def carregar_metricas_pedidos() -> dict:
    """Retorna por id_cliente: qtd_pedidos, total_gasto, data_ultima_compra."""
    metricas = defaultdict(lambda: {"qtd": 0, "total": 0.0, "ultima_compra": None})
    try:
        with open(CSV_PEDIDOS, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                cid = row["id_cliente"]
                metricas[cid]["qtd"] += 1
                try:
                    metricas[cid]["total"] += float(row["valor_pedido"])
                except (ValueError, KeyError):
                    pass
                data = parse_date(row.get("data_pedido", ""))
                if data:
                    atual = metricas[cid]["ultima_compra"]
                    if atual is None or data > atual:
                        metricas[cid]["ultima_compra"] = data
    except FileNotFoundError:
        print(f"⚠️  {CSV_PEDIDOS} não encontrado — métricas de pedidos serão zeradas.")
    return metricas


def carregar_metricas_tickets() -> dict:
    """Retorna por id_cliente: qtd_tickets."""
    contagem = defaultdict(int)
    try:
        with open(CSV_TICKETS, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                contagem[row["id_cliente"]] += 1
    except FileNotFoundError:
        print(f"⚠️  {CSV_TICKETS} não encontrado — qtd_tickets será zerada.")
    return contagem


def carregar_metricas_avaliacoes() -> dict:
    """Retorna por id_cliente: media de estrelas."""
    notas = defaultdict(list)
    try:
        with open(CSV_AVALIACOES, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    notas[row["id_cliente"]].append(float(row["nota_produto"]))
                except (ValueError, KeyError):
                    pass
    except FileNotFoundError:
        print(f"⚠️  {CSV_AVALIACOES} não encontrado — media_estrelas será nula.")
    return {cid: round(sum(ns) / len(ns), 2) for cid, ns in notas.items() if ns}


def gerar_tickets_ficticicios(clientes: list[Cliente]) -> list[Ticket]:
    """Gera tickets fictícios para clientes com qtd_tickets_suporte > 0."""
    tickets = []
    tipos = ["Dúvida", "Reclamação", "Sugestão", "Problema técnico", "Pedido de informação"]
    sentimentos = ["positivo", "neutro", "negativo"]
    
    for cliente in clientes:
        qtd = cliente.qtd_tickets_suporte
        if qtd == 0:
            continue
        
        # Distribui entre aberto e fechado: ~30% aberto, ~70% fechado
        qtd_aberto = max(1, int(qtd * 0.3)) if qtd > 0 else 0
        
        for i in range(qtd):
            status = "aberto" if i < qtd_aberto else "fechado"
            data_abertura = cliente.data_ultima_compra - timedelta(days=random.randint(1, 60)) if cliente.data_ultima_compra else datetime.utcnow() - timedelta(days=random.randint(1, 60))
            
            ticket = Ticket(
                cliente_id=cliente.id_cliente,
                tipo=random.choice(tipos),
                status=status,
                descricao=f"Ticket de suporte para {cliente.nome_cliente}",
                sentimento=random.choice(sentimentos),
                tempo_resolucao=random.randint(15, 480) if status == "fechado" else None,
                data_abertura=data_abertura,
                data_fechamento=data_abertura + timedelta(hours=random.randint(1, 24)) if status == "fechado" else None,
            )
            tickets.append(ticket)
    
    return tickets


async def seed(limit: int | None = None):
    print("🔧 Criando tabelas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("📊 Calculando métricas dos CSVs...")
    metricas_pedidos    = carregar_metricas_pedidos()
    metricas_tickets    = carregar_metricas_tickets()
    metricas_avaliacoes = carregar_metricas_avaliacoes()

    print("👤 Lendo clientes.csv...")
    clientes = []
    ids_vistos = set()
    with open(CSV_CLIENTES, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if limit and len(clientes) >= limit:
                break

            cid = row["id_cliente"]
            if cid in ids_vistos:
                continue
            ids_vistos.add(cid)
            mp          = metricas_pedidos.get(cid, {})
            qtd_pedidos = mp.get("qtd", 0)
            total_gasto = round(mp.get("total", 0.0), 2)

            clientes.append(Cliente(
                id_cliente             = cid,
                nome_cliente           = f"{row['nome']} {row['sobrenome']}".strip(),
                cidade                 = row.get("cidade") or None,
                estado                 = row.get("estado") or None,
                regiao                 = _inferir_regiao(row.get("estado", "")),
                qtd_pedidos_realizados = qtd_pedidos,
                total_gasto_brl        = total_gasto,
                qtd_tickets_suporte    = metricas_tickets.get(cid, 0),
                data_ultima_compra     = mp.get("ultima_compra"),
                media_estrelas_dadas   = metricas_avaliacoes.get(cid),
                segmento_rfm           = calcular_segmento_rfm(qtd_pedidos, total_gasto),
            ))

    print(f"💾 Inserindo {len(clientes)} clientes no banco...")
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM clientes"))
        await session.commit()

        batch_size = 1000
        for i in range(0, len(clientes), batch_size):
            session.add_all(clientes[i:i + batch_size])
            await session.commit()
            print(f"   ✅ {min(i + batch_size, len(clientes))}/{len(clientes)}")

    print("� Gerando tickets fictícios...")
    tickets = gerar_tickets_ficticicios(clientes)
    
    print(f"💾 Inserindo {len(tickets)} tickets no banco...")
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM tickets"))
        await session.commit()

        batch_size = 1000
        for i in range(0, len(tickets), batch_size):
            session.add_all(tickets[i:i + batch_size])
            await session.commit()
            print(f"   ✅ {min(i + batch_size, len(tickets))}/{len(tickets)}")

    print("�🎉 Seed concluído!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limita o número de clientes inseridos")
    args = parser.parse_args()

    asyncio.run(seed(limit=args.limit))