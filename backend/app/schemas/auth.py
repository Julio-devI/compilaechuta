from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username: str  # aceita email ou username
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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
