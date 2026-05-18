from typing import Optional
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
    id_operador:    str
    nome:           str
    username:       str
    email:          str
    telefone:       Optional[str] = None
    role:           str
    two_fa_enabled: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserInfo


class TwoFARequiredResponse(BaseModel):
    requires_2fa: bool = True
    temp_token:   str


class TwoFAVerifyRequest(BaseModel):
    temp_token: str
    code:       str


class Toggle2FARequest(BaseModel):
    enabled: bool


class UpdateMeRequest(BaseModel):
    nome:     Optional[str] = None
    email:    Optional[str] = None
    telefone: Optional[str] = None
