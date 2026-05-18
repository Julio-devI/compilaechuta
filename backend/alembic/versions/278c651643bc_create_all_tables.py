"""create_all_tables

Revision ID: 278c651643bc
Revises:
Create Date: 2026-05-13 20:47:04.058975

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "278c651643bc"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dim_cliente",
        sa.Column("id_cliente", sa.String(), nullable=False),
        sa.Column("nome_cliente", sa.String(), nullable=False),
        sa.Column("cidade", sa.String(), nullable=True),
        sa.Column("estado", sa.String(), nullable=True),
        sa.Column("regiao", sa.String(), nullable=True),
        sa.Column("qtd_pedidos_realizados", sa.Integer(), nullable=True),
        sa.Column("total_gasto_brl", sa.Float(), nullable=True),
        sa.Column("qtd_tickets_suporte", sa.Integer(), nullable=True),
        sa.Column("data_ultima_compra", sa.DateTime(), nullable=True),
        sa.Column("media_estrelas_dadas", sa.Float(), nullable=True),
        sa.Column("segmento_rfm", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id_cliente"),
    )
    op.create_index(
        op.f("ix_dim_cliente_id_cliente"),
        "dim_cliente",
        ["id_cliente"],
        unique=False,
    )
    op.create_index(
        "ix_dim_cliente_segmento_rfm",
        "dim_cliente",
        ["segmento_rfm"],
        unique=False,
    )

    op.create_table(
        "gold_categoria",
        sa.Column("id_categoria", sa.String(), nullable=False),
        sa.Column("nome_categoria", sa.String(), nullable=False),
        sa.Column("slug_categoria", sa.String(), nullable=True),
        sa.Column("imagem_url", sa.String(), nullable=True),
        sa.Column("total_estoque_disponivel", sa.Integer(), nullable=True),
        sa.Column("total_produtos_ativos", sa.Integer(), nullable=True),
        sa.Column("total_com_estoque", sa.Integer(), nullable=True),
        sa.Column("preco_medio", sa.Float(), nullable=True),
        sa.Column("preco_minimo", sa.Float(), nullable=True),
        sa.Column("preco_maximo", sa.Float(), nullable=True),
        sa.Column("peso_medio_kg", sa.Float(), nullable=True),
        sa.Column("total_precisa_revisao", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id_categoria"),
    )
    op.create_index(
        op.f("ix_gold_categoria_id_categoria"),
        "gold_categoria",
        ["id_categoria"],
        unique=False,
    )

    op.create_table(
        "dim_produto",
        sa.Column("id_produto", sa.String(), nullable=False),
        sa.Column("nome_produto", sa.String(), nullable=False),
        sa.Column("sku", sa.String(), nullable=True),
        sa.Column("id_categoria", sa.String(), nullable=True),
        sa.Column("fornecedor", sa.String(), nullable=True),
        sa.Column("preco", sa.Float(), nullable=True),
        sa.Column("peso_kg", sa.Float(), nullable=True),
        sa.Column("estoque_disponivel", sa.Integer(), nullable=True),
        sa.Column("ativo", sa.String(), nullable=True),
        sa.Column("precisa_revisao", sa.String(), nullable=True),
        sa.Column("data_cadastro_produto", sa.DateTime(), nullable=True),
        sa.Column("total_pedidos", sa.Integer(), nullable=True),
        sa.Column("receita_total", sa.Float(), nullable=True),
        sa.Column("ticket_medio", sa.Float(), nullable=True),
        sa.Column("total_unidades_vendidas", sa.Integer(), nullable=True),
        sa.Column("total_avaliacoes", sa.Integer(), nullable=True),
        sa.Column("media_nota_produto", sa.Float(), nullable=True),
        sa.Column("media_nota_nps", sa.Float(), nullable=True),
        sa.Column("pct_recomendacoes_sim", sa.Float(), nullable=True),
        sa.Column("total_tickets", sa.Integer(), nullable=True),
        sa.Column("media_tempo_resolucao_horas", sa.Float(), nullable=True),
        sa.Column("media_nota_suporte", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["id_categoria"], ["gold_categoria.id_categoria"]),
        sa.PrimaryKeyConstraint("id_produto"),
    )
    op.create_index(
        op.f("ix_dim_produto_id_produto"),
        "dim_produto",
        ["id_produto"],
        unique=False,
    )
    op.create_index("ix_dim_produto_sku", "dim_produto", ["sku"], unique=False)
    op.create_index(
        "ix_dim_produto_id_categoria",
        "dim_produto",
        ["id_categoria"],
        unique=False,
    )

    op.create_table(
        "dim_tempo",
        sa.Column("id_data", sa.String(), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=True),
        sa.Column("mes", sa.Integer(), nullable=True),
        sa.Column("dia", sa.Integer(), nullable=True),
        sa.Column("trimestre", sa.Integer(), nullable=True),
        sa.Column("dia_semana_num", sa.Integer(), nullable=True),
        sa.Column("dia_do_ano", sa.Integer(), nullable=True),
        sa.Column("semana_do_ano", sa.Integer(), nullable=True),
        sa.Column("nome_mes", sa.String(), nullable=True),
        sa.Column("nome_dia_semana", sa.String(), nullable=True),
        sa.Column("ano_mes", sa.String(), nullable=True),
        sa.Column("trimestre_label", sa.String(), nullable=True),
        sa.Column("fim_de_semana", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id_data"),
    )
    op.create_index("ix_dim_tempo_id_data", "dim_tempo", ["id_data"], unique=False)

    op.create_table(
        "gold_operador",
        sa.Column("id_operador", sa.String(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("telefone", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("senha_hash", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id_operador"),
    )
    op.create_index(
        op.f("ix_gold_operador_email"),
        "gold_operador",
        ["email"],
        unique=True,
    )
    op.create_index(
        op.f("ix_gold_operador_id_operador"),
        "gold_operador",
        ["id_operador"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gold_operador_username"),
        "gold_operador",
        ["username"],
        unique=True,
    )

    op.create_table(
        "fato_vendas",
        sa.Column("id_pedido", sa.String(), nullable=False),
        sa.Column("id_pedido_display", sa.String(), nullable=False),
        sa.Column("id_cliente", sa.String(), nullable=False),
        sa.Column("id_produto", sa.String(), nullable=False),
        sa.Column("id_data", sa.String(), nullable=True),
        sa.Column("quantidade_vendas", sa.Integer(), nullable=True),
        sa.Column("valor_unitario", sa.Float(), nullable=True),
        sa.Column("valor_total_venda", sa.Float(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("metodo_pagamento", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["id_cliente"], ["dim_cliente.id_cliente"]),
        sa.ForeignKeyConstraint(["id_produto"], ["dim_produto.id_produto"]),
        sa.PrimaryKeyConstraint("id_pedido"),
        sa.UniqueConstraint("id_pedido_display"),
    )
    op.create_index(
        op.f("ix_fato_vendas_id_cliente"),
        "fato_vendas",
        ["id_cliente"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fato_vendas_id_pedido"),
        "fato_vendas",
        ["id_pedido"],
        unique=False,
    )
    op.create_index(
        "ix_fato_vendas_id_pedido_display",
        "fato_vendas",
        ["id_pedido_display"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fato_vendas_id_produto"),
        "fato_vendas",
        ["id_produto"],
        unique=False,
    )
    op.create_index(
        "ix_fato_vendas_id_data",
        "fato_vendas",
        ["id_data"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fato_vendas_status"),
        "fato_vendas",
        ["status"],
        unique=False,
    )

    op.create_table(
        "fato_avaliacoes_pedido",
        sa.Column("id_avaliacao", sa.String(), nullable=False),
        sa.Column("id_pedido", sa.String(), nullable=False),
        sa.Column("id_cliente", sa.String(), nullable=False),
        sa.Column("id_produto", sa.String(), nullable=False),
        sa.Column("id_categoria", sa.String(), nullable=True),
        sa.Column("nome_produto", sa.String(), nullable=True),
        sa.Column("preco", sa.Float(), nullable=True),
        sa.Column("valor_pedido", sa.Float(), nullable=True),
        sa.Column("quantidade", sa.Float(), nullable=True),
        sa.Column("metodo_pagamento", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("data_pedido", sa.DateTime(), nullable=True),
        sa.Column("nota_produto", sa.Float(), nullable=True),
        sa.Column("nota_nps", sa.Float(), nullable=True),
        sa.Column("recomenda", sa.Boolean(), nullable=True),
        sa.Column("comentario", sa.String(), nullable=True),
        sa.Column("data_avaliacao", sa.DateTime(), nullable=True),
        sa.Column("categoria_nps", sa.String(), nullable=True),
        sa.Column("pct_recomendacoes_sim", sa.Float(), nullable=True),
        sa.Column("comentario_consistente", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["id_cliente"], ["dim_cliente.id_cliente"]),
        sa.ForeignKeyConstraint(["id_pedido"], ["fato_vendas.id_pedido"]),
        sa.PrimaryKeyConstraint("id_avaliacao"),
    )
    op.create_index(
        "ix_fato_avaliacoes_pedido_id_avaliacao",
        "fato_avaliacoes_pedido",
        ["id_avaliacao"],
        unique=False,
    )
    op.create_index(
        "ix_fato_avaliacoes_pedido_id_cliente",
        "fato_avaliacoes_pedido",
        ["id_cliente"],
        unique=False,
    )
    op.create_index(
        "ix_fato_avaliacoes_pedido_id_pedido",
        "fato_avaliacoes_pedido",
        ["id_pedido"],
        unique=False,
    )
    op.create_index(
        "ix_fato_avaliacoes_pedido_id_produto",
        "fato_avaliacoes_pedido",
        ["id_produto"],
        unique=False,
    )

    op.create_table(
        "fato_clickstream_navegacao",
        sa.Column("id_cliente", sa.String(), nullable=False),
        sa.Column("total_sessoes", sa.Integer(), nullable=True),
        sa.Column("total_eventos", sa.Integer(), nullable=True),
        sa.Column("data_ultima_sessao", sa.DateTime(), nullable=True),
        sa.Column("qtd_visualizacao_produto", sa.Integer(), nullable=True),
        sa.Column("qtd_adicoes_carrinho", sa.Integer(), nullable=True),
        sa.Column("qtd_abandonos_carrinho", sa.Integer(), nullable=True),
        sa.Column("qtd_compras", sa.Integer(), nullable=True),
        sa.Column("canal_mais_usado", sa.String(), nullable=True),
        sa.Column("dispositivo_mais_usado", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["id_cliente"], ["dim_cliente.id_cliente"]),
        sa.PrimaryKeyConstraint("id_cliente"),
    )

    op.create_table(
        "fato_suporte_ticket",
        sa.Column("id_ticket", sa.String(), nullable=False),
        sa.Column("id_cliente", sa.String(), nullable=False),
        sa.Column("id_pedido", sa.String(), nullable=True),
        sa.Column("id_produto", sa.String(), nullable=True),
        sa.Column("data_abertura", sa.DateTime(), nullable=True),
        sa.Column("data_resolucao", sa.DateTime(), nullable=True),
        sa.Column("tempo_resolucao_horas", sa.Float(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("tipo_problema", sa.String(), nullable=True),
        sa.Column("agente_suporte", sa.String(), nullable=True),
        sa.Column("nota_avaliacao", sa.Float(), nullable=True),
        sa.Column("registro_consistente", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["id_cliente"], ["dim_cliente.id_cliente"]),
        sa.ForeignKeyConstraint(["id_pedido"], ["fato_vendas.id_pedido"]),
        sa.ForeignKeyConstraint(["id_produto"], ["dim_produto.id_produto"]),
        sa.PrimaryKeyConstraint("id_ticket"),
    )
    op.create_index(
        op.f("ix_fato_suporte_ticket_id_cliente"),
        "fato_suporte_ticket",
        ["id_cliente"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fato_suporte_ticket_id_ticket"),
        "fato_suporte_ticket",
        ["id_ticket"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fato_suporte_ticket_id_pedido"),
        "fato_suporte_ticket",
        ["id_pedido"],
        unique=False,
    )
    op.create_index(
        "ix_fato_suporte_ticket_id_produto",
        "fato_suporte_ticket",
        ["id_produto"],
        unique=False,
    )
    op.create_index(
        op.f("ix_fato_suporte_ticket_status"),
        "fato_suporte_ticket",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_fato_suporte_ticket_id_pedido_status",
        "fato_suporte_ticket",
        ["id_pedido", "status"],
        unique=False,
    )

    op.create_table(
        "gold_satisfacao_agente",
        sa.Column("agente_suporte", sa.String(), nullable=False),
        sa.Column("qtd_tickets_resolvidos", sa.Integer(), nullable=True),
        sa.Column("nota_media_satisfacao", sa.Float(), nullable=True),
        sa.Column("tempo_medio_resolucao", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("agente_suporte"),
    )

    op.create_table(
        "gold_satisfacao_problema",
        sa.Column("tipo_problema", sa.String(), nullable=False),
        sa.Column("volume_tickets", sa.Integer(), nullable=True),
        sa.Column("nota_media_satisfacao", sa.Float(), nullable=True),
        sa.Column("tempo_medio_resolucao_horas", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("tipo_problema"),
    )


def downgrade() -> None:
    op.drop_table("gold_satisfacao_problema")
    op.drop_table("gold_satisfacao_agente")
    op.drop_index(
        "ix_fato_suporte_ticket_id_pedido_status",
        table_name="fato_suporte_ticket",
    )
    op.drop_index(
        op.f("ix_fato_suporte_ticket_status"),
        table_name="fato_suporte_ticket",
    )
    op.drop_index(
        "ix_fato_suporte_ticket_id_produto",
        table_name="fato_suporte_ticket",
    )
    op.drop_index(
        op.f("ix_fato_suporte_ticket_id_pedido"),
        table_name="fato_suporte_ticket",
    )
    op.drop_index(
        op.f("ix_fato_suporte_ticket_id_ticket"),
        table_name="fato_suporte_ticket",
    )
    op.drop_index(
        op.f("ix_fato_suporte_ticket_id_cliente"),
        table_name="fato_suporte_ticket",
    )
    op.drop_table("fato_suporte_ticket")
    op.drop_table("fato_clickstream_navegacao")
    op.drop_index(
        "ix_fato_avaliacoes_pedido_id_produto",
        table_name="fato_avaliacoes_pedido",
    )
    op.drop_index(
        "ix_fato_avaliacoes_pedido_id_pedido",
        table_name="fato_avaliacoes_pedido",
    )
    op.drop_index(
        "ix_fato_avaliacoes_pedido_id_cliente",
        table_name="fato_avaliacoes_pedido",
    )
    op.drop_index(
        "ix_fato_avaliacoes_pedido_id_avaliacao",
        table_name="fato_avaliacoes_pedido",
    )
    op.drop_table("fato_avaliacoes_pedido")
    op.drop_index(op.f("ix_fato_vendas_status"), table_name="fato_vendas")
    op.drop_index("ix_fato_vendas_id_data", table_name="fato_vendas")
    op.drop_index(op.f("ix_fato_vendas_id_produto"), table_name="fato_vendas")
    op.drop_index("ix_fato_vendas_id_pedido_display", table_name="fato_vendas")
    op.drop_index(op.f("ix_fato_vendas_id_pedido"), table_name="fato_vendas")
    op.drop_index(op.f("ix_fato_vendas_id_cliente"), table_name="fato_vendas")
    op.drop_table("fato_vendas")
    op.drop_index(op.f("ix_gold_operador_username"), table_name="gold_operador")
    op.drop_index(op.f("ix_gold_operador_id_operador"), table_name="gold_operador")
    op.drop_index(op.f("ix_gold_operador_email"), table_name="gold_operador")
    op.drop_table("gold_operador")
    op.drop_index("ix_dim_tempo_id_data", table_name="dim_tempo")
    op.drop_table("dim_tempo")
    op.drop_index("ix_dim_produto_id_categoria", table_name="dim_produto")
    op.drop_index("ix_dim_produto_sku", table_name="dim_produto")
    op.drop_index(op.f("ix_dim_produto_id_produto"), table_name="dim_produto")
    op.drop_table("dim_produto")
    op.drop_index(op.f("ix_gold_categoria_id_categoria"), table_name="gold_categoria")
    op.drop_table("gold_categoria")
    op.drop_index("ix_dim_cliente_segmento_rfm", table_name="dim_cliente")
    op.drop_index(op.f("ix_dim_cliente_id_cliente"), table_name="dim_cliente")
    op.drop_table("dim_cliente")
