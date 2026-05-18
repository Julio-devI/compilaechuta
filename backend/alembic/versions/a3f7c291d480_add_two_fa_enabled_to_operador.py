"""add two_fa_enabled to operador

Revision ID: a3f7c291d480
Revises: 94c520ebfa91
Create Date: 2026-05-18 19:53:05.134593

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f7c291d480'
down_revision: Union[str, None] = '94c520ebfa91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('gold_operador', schema=None) as batch_op:
        batch_op.add_column(sa.Column('two_fa_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table('gold_operador', schema=None) as batch_op:
        batch_op.drop_column('two_fa_enabled')
