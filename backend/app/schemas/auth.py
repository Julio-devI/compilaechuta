from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str  # aceita email ou username
    password: str


class UserInfo(BaseModel):
    id_operador: str
    nome: str
    username: str
    email: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo
