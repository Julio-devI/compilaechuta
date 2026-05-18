from typing import Optional, Literal, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


OperatorRole = Literal["super_admin", "admin", "user"]


class OperatorBase(BaseModel):
    nome:           str = Field(..., max_length=100)
    username:       str = Field(..., max_length=50)
    email:          str = Field(..., max_length=150)
    telefone:       Optional[str] = None
    role:           OperatorRole = "user"
    active:         bool = True
    two_fa_enabled: bool = False


class OperatorCreate(OperatorBase):
    password: str = Field(..., min_length=6)


class OperatorUpdate(BaseModel):
    nome:           Optional[str] = Field(None, max_length=100)
    username:       Optional[str] = Field(None, max_length=50)
    email:          Optional[str] = Field(None, max_length=150)
    telefone:       Optional[str] = None
    role:           Optional[OperatorRole] = None
    active:         Optional[bool] = None
    two_fa_enabled: Optional[bool] = None
    password:       Optional[str] = Field(None, min_length=6)


class OperatorResponse(OperatorBase):
    id_operador: str
    created_at:  Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OperatorListResponse(BaseModel):
    total: int
    items: List[OperatorResponse]
