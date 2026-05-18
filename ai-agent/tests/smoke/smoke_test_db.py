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
            email_cliente TEXT,
            documento_cliente TEXT,
            telefone_cliente TEXT,
            cidade TEXT,
            estado TEXT,
            regiao TEXT,
            segmento_rfm TEXT,
            qtd_pedidos_realizados INTEGER,
            total_gasto_brl REAL,
            qtd_tickets_suporte INTEGER
        );
        CREATE TABLE IF NOT EXISTS dim_produto (
            id_produto INTEGER PRIMARY KEY,
            nome_produto TEXT,
            id_categoria TEXT,
            preco REAL
        );
        CREATE TABLE IF NOT EXISTS fato_vendas (
            id_pedido INTEGER PRIMARY KEY,
            id_pedido_display TEXT,
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
        """
        INSERT INTO dim_cliente (
            id_cliente,
            nome_cliente,
            email_cliente,
            documento_cliente,
            telefone_cliente,
            cidade,
            estado,
            regiao,
            segmento_rfm,
            qtd_pedidos_realizados,
            total_gasto_brl,
            qtd_tickets_suporte
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                1,
                "Ana Silva",
                "ana.silva@example.com",
                "123.456.789-01",
                "(11) 90000-0001",
                "São Paulo",
                "SP",
                "Sudeste",
                "Campeão",
                3,
                6020.00,
                2,
            ),
            (
                2,
                "Bruno Costa",
                "bruno.costa@example.com",
                "234.567.890-12",
                "(81) 90000-0002",
                "Recife",
                "PE",
                "Nordeste",
                "Cliente regular",
                2,
                4620.00,
                1,
            ),
            (
                3,
                "Carla Dias",
                "carla.dias@example.com",
                "345.678.901-23",
                "(51) 90000-0003",
                "Porto Alegre",
                "RS",
                "Sul",
                "Campeão",
                2,
                5350.00,
                1,
            ),
            (
                4,
                "Daniel Lima",
                "daniel.lima@example.com",
                "456.789.012-34",
                "(21) 90000-0004",
                "Rio de Janeiro",
                "RJ",
                "Sudeste",
                "Cliente regular",
                2,
                1520.00,
                1,
            ),
            (
                5,
                "Elisa Mendes",
                "elisa.mendes@example.com",
                "567.890.123-45",
                "(62) 90000-0005",
                "Goiânia",
                "GO",
                "Centro-Oeste",
                "Campeão",
                1,
                120.00,
                1,
            ),
        ],
    )

    cur.executemany(
        "INSERT INTO dim_produto (id_produto, nome_produto, id_categoria, preco) VALUES (?, ?, ?, ?)",
        [
            (1, "Notebook X1", "ELEC", 4500.00),
            (2, "Mouse Sem Fio", "ELEC", 120.00),
            (3, "Cadeira Ergonômica", "MOVE", 850.00),
            (4, "Monitor 27\"", "ELEC", 1400.00),
            (5, "Mesa Escritório", "MOVE", 600.00),
        ],
    )

    cur.executemany(
        "INSERT INTO fato_vendas (id_pedido, id_pedido_display, id_cliente, id_produto, valor_total_venda, id_data, status, quantidade_vendas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (1, "PED-2024-0001", 1, 1, 4500.00, "2024-01-15", "Aprovado", 1),
            (2, "PED-2024-0002", 1, 2, 120.00, "2024-01-20", "Aprovado", 1),
            (3, "PED-2024-0003", 2, 1, 4500.00, "2024-02-10", "Aprovado", 1),
            (4, "PED-2024-0004", 3, 3, 850.00, "2024-02-12", "Aprovado", 1),
            (5, "PED-2024-0005", 4, 4, 1400.00, "2024-03-05", "Aprovado", 1),
            (6, "PED-2024-0006", 5, 2, 120.00, "2024-03-08", "Aprovado", 1),
            (7, "PED-2024-0007", 2, 2, 120.00, "2024-03-15", "Aprovado", 1),
            (8, "PED-2024-0008", 1, 4, 1400.00, "2024-04-01", "Aprovado", 1),
            (9, "PED-2024-0009", 3, 1, 4500.00, "2024-04-10", "Aprovado", 1),
            (10, "PED-2024-0010", 4, 2, 120.00, "2024-04-12", "Aprovado", 1),
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
            ("2024-01-15", "2024-01-15", 1, 2024, 1),
            ("2024-01-20", "2024-01-20", 1, 2024, 1),
            ("2024-02-10", "2024-02-10", 2, 2024, 1),
            ("2024-02-12", "2024-02-12", 2, 2024, 1),
            ("2024-03-05", "2024-03-05", 3, 2024, 1),
            ("2024-03-08", "2024-03-08", 3, 2024, 1),
            ("2024-03-15", "2024-03-15", 3, 2024, 1),
            ("2024-04-01", "2024-04-01", 4, 2024, 2),
            ("2024-04-10", "2024-04-10", 4, 2024, 2),
            ("2024-04-12", "2024-04-12", 4, 2024, 2),
        ],
    )

    conn.commit()
    conn.close()
