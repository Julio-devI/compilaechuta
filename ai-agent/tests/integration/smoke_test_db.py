"""
Utilitário para criação do banco de dados temporário utilizado nos smoke tests.
"""
import sqlite3

def create_test_db(path: str) -> None:
    """Popula banco SQLite temporario com schema minimo e dados sinteticos."""
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS dim_cliente (
            id_cliente INTEGER PRIMARY KEY,
            nome_cliente TEXT,
            regiao TEXT,
            segmento_rfm TEXT
        );
        CREATE TABLE IF NOT EXISTS dim_produto (
            id_produto INTEGER PRIMARY KEY,
            nome_produto TEXT,
            categoria TEXT,
            preco REAL
        );
        CREATE TABLE IF NOT EXISTS fato_vendas (
            id_pedido INTEGER PRIMARY KEY,
            id_cliente INTEGER,
            id_produto INTEGER,
            valor_total_venda REAL,
            id_data TEXT,
            status TEXT,
            quantidade_vendas INTEGER
        );
        CREATE TABLE IF NOT EXISTS fato_suporte_ticket (
            id_ticket INTEGER PRIMARY KEY,
            id_produto INTEGER,
            id_cliente INTEGER,
            status TEXT,
            tempo_resolucao_horas INTEGER
        );
        CREATE TABLE IF NOT EXISTS fato_avaliacoes_pedido (
            id_avaliacao INTEGER PRIMARY KEY,
            id_produto INTEGER,
            id_cliente INTEGER,
            nota_produto INTEGER,
            nota_nps INTEGER,
            data_avaliacao TEXT
        );
        CREATE TABLE IF NOT EXISTS dim_tempo (
            id_data TEXT PRIMARY KEY,
            data_completa TEXT,
            mes INTEGER,
            ano INTEGER,
            trimestre INTEGER
        );
        """
    )

    # Dados sinteticos minimos
    cur.executemany(
        "INSERT INTO dim_cliente (id_cliente, nome_cliente, regiao, segmento_rfm) VALUES (?, ?, ?, ?)",
        [
            (1, "Ana Silva", "Sudeste", "Campeões"),
            (2, "Bruno Costa", "Nordeste", "Regulares"),
            (3, "Carla Dias", "Sul", "Campeões"),
            (4, "Daniel Lima", "Sudeste", "Regulares"),
            (5, "Elisa Mendes", "Centro-Oeste", "Campeões"),
        ],
    )

    cur.executemany(
        "INSERT INTO dim_produto (id_produto, nome_produto, categoria, preco) VALUES (?, ?, ?, ?)",
        [
            (1, "Notebook X1", "Eletrônicos", 4500.00),
            (2, "Mouse Sem Fio", "Eletrônicos", 120.00),
            (3, "Cadeira Ergonômica", "Móveis", 850.00),
            (4, "Monitor 27\"", "Eletrônicos", 1400.00),
            (5, "Mesa Escritório", "Móveis", 600.00),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_vendas (id_pedido, id_cliente, id_produto, valor_total_venda, id_data, status, quantidade_vendas) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            (1, 1, 1, 4500.00, "20240115", "Entregue", 1),
            (2, 1, 2, 120.00, "20240120", "Entregue", 1),
            (3, 2, 1, 4500.00, "20240210", "Entregue", 1),
            (4, 3, 3, 850.00, "20240212", "Entregue", 1),
            (5, 4, 4, 1400.00, "20240305", "Entregue", 1),
            (6, 5, 2, 120.00, "20240308", "Entregue", 1),
            (7, 2, 2, 120.00, "20240315", "Entregue", 1),
            (8, 1, 4, 1400.00, "20240401", "Entregue", 1),
            (9, 3, 1, 4500.00, "20240410", "Entregue", 1),
            (10, 4, 2, 120.00, "20240412", "Entregue", 1),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_suporte_ticket (id_ticket, id_produto, id_cliente, status, tempo_resolucao_horas) VALUES (?, ?, ?, ?, ?)",
        [
            (1, 1, 2, "Fechado", 24),
            (2, 2, 1, "Fechado", 4),
            (3, 1, 3, "Aberto", 72),
            (4, 3, 4, "Fechado", 12),
            (5, 2, 5, "Fechado", 8),
            (6, 1, 1, "Aberto", 1),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_avaliacoes_pedido (id_avaliacao, id_produto, id_cliente, nota_produto, nota_nps, data_avaliacao) VALUES (?, ?, ?, ?, ?, ?)",
        [
            (1, 1, 1, 5, 9, "2024-01-20"),
            (2, 2, 2, 4, 7, "2024-01-25"),
            (3, 1, 3, 5, 10, "2024-02-15"),
            (4, 3, 4, 3, 5, "2024-02-20"),
            (5, 4, 1, 4, 8, "2024-03-10"),
            (6, 2, 5, 4, 7, "2024-03-12"),
            (7, 1, 2, 4, 8, "2024-04-05"),
            (8, 4, 3, 5, 9, "2024-04-15"),
        ],
    )

    cur.executemany(
        "INSERT INTO dim_tempo (id_data, data_completa, mes, ano, trimestre) VALUES (?, ?, ?, ?, ?)",
        [
            ("20240115", "2024-01-15", 1, 2024, 1),
            ("20240120", "2024-01-20", 1, 2024, 1),
            ("20240210", "2024-02-10", 2, 2024, 1),
            ("20240212", "2024-02-12", 2, 2024, 1),
            ("20240305", "2024-03-05", 3, 2024, 1),
            ("20240308", "2024-03-08", 3, 2024, 1),
            ("20240315", "2024-03-15", 3, 2024, 1),
            ("20240401", "2024-04-01", 4, 2024, 2),
            ("20240410", "2024-04-10", 4, 2024, 2),
            ("20240412", "2024-04-12", 4, 2024, 2),
        ],
    )

    conn.commit()
    conn.close()
