"""create_ai_agent_sessions

Revision ID: 6aac301783b4
Revises: 659790997f80
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6aac301783b4'
down_revision: Union[str, None] = '278c651643bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_agent_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('history_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['gold_operador.id_operador'],
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'user_id',
            'session_id',
            name='uq_ai_agent_sessions_user_session',
        ),
    )
    op.create_index(
        'ix_ai_agent_sessions_user_id',
        'ai_agent_sessions',
        ['user_id'],
    )
    op.create_index(
        'ix_ai_agent_sessions_session_id',
        'ai_agent_sessions',
        ['session_id'],
    )


def downgrade() -> None:
    op.drop_index(
        'ix_ai_agent_sessions_session_id',
        table_name='ai_agent_sessions',
    )
    op.drop_index(
        'ix_ai_agent_sessions_user_id',
        table_name='ai_agent_sessions',
    )
    op.drop_table('ai_agent_sessions')
