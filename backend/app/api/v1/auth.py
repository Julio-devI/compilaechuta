from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.security import (
    verify_password, create_access_token, create_reset_token, decode_reset_token,
    get_password_hash, generate_2fa_code, verify_2fa_code,
    create_2fa_pending_token, decode_2fa_pending_token,
)
from app.core.email import send_reset_password_email, send_2fa_code_email
from app.crud import operator as crud_operator
from app.crud.operator import get_operator_by_email_or_username, get_operator_by_email, update_operator_password
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserInfo,
    ForgotPasswordRequest, ResetPasswordRequest,
    UpdateMeRequest, TwoFARequiredResponse, TwoFAVerifyRequest, Toggle2FARequest,
)
from app.schemas.operator import OperatorUpdate

router = APIRouter()


def _build_user_info(operator) -> UserInfo:
    return UserInfo(
        id_operador=operator.id_operador,
        nome=operator.nome,
        username=operator.username,
        email=operator.email,
        telefone=operator.telefone,
        role=operator.role,
        two_fa_enabled=operator.two_fa_enabled,
    )


@router.post("/login", response_model=Union[TokenResponse, TwoFARequiredResponse])
async def login(request: LoginRequest, db: AsyncSession = Depends(deps.get_db)):
    operator = await get_operator_by_email_or_username(db, request.username)

    if not operator or not operator.senha_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    if not verify_password(request.password, operator.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    if not operator.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta desativada. Contate o administrador.")

    if operator.two_fa_enabled:
        code = generate_2fa_code(operator.id_operador)
        await send_2fa_code_email(operator.email, operator.nome, code)
        temp_token = create_2fa_pending_token(operator.id_operador)
        return TwoFARequiredResponse(temp_token=temp_token)

    access_token = create_access_token(data={"sub": operator.id_operador, "role": operator.role})
    return TokenResponse(access_token=access_token, user=_build_user_info(operator))


@router.post("/verify-2fa", response_model=TokenResponse)
async def verify_2fa(request: TwoFAVerifyRequest, db: AsyncSession = Depends(deps.get_db)):
    user_id = decode_2fa_pending_token(request.temp_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado. Faça login novamente.")

    if not verify_2fa_code(user_id, request.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código inválido ou expirado.")

    operator = await crud_operator.get_operator(db, user_id)
    if not operator or not operator.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Operador não encontrado.")

    access_token = create_access_token(data={"sub": operator.id_operador, "role": operator.role})
    return TokenResponse(access_token=access_token, user=_build_user_info(operator))


@router.post("/esqueci-senha", status_code=status.HTTP_200_OK)
async def esqueci_senha(request: ForgotPasswordRequest, db: AsyncSession = Depends(deps.get_db)):
    operador = await get_operator_by_email(db, request.email)

    if not operador or not operador.active:
        return {"message": "Se este email estiver cadastrado, você receberá as instruções em breve."}

    token = create_reset_token(operador.email)
    await send_reset_password_email(operador.email, operador.nome, token)

    return {"message": "Se este email estiver cadastrado, você receberá as instruções em breve."}


@router.post("/redefinir-senha", status_code=status.HTTP_200_OK)
async def redefinir_senha(request: ResetPasswordRequest, db: AsyncSession = Depends(deps.get_db)):
    email = decode_reset_token(request.token)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado.",
        )

    operador = await get_operator_by_email(db, email)
    if not operador or not operador.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado.",
        )

    await update_operator_password(db, operador, get_password_hash(request.new_password))

    return {"message": "Senha redefinida com sucesso."}


@router.get("/me", response_model=UserInfo)
async def get_me(
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.get_current_user),
):
    operator = await crud_operator.get_operator(db, current_user["sub"])
    if not operator:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    return _build_user_info(operator)


@router.patch("/me", response_model=UserInfo)
async def update_me(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.get_current_user),
    payload: UpdateMeRequest,
):
    operator = await crud_operator.get_operator(db, current_user["sub"])
    if not operator:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    updated = await crud_operator.update_operator(
        db=db,
        db_obj=operator,
        obj_in=OperatorUpdate(nome=payload.nome, email=payload.email, telefone=payload.telefone),
    )
    return _build_user_info(updated)


@router.post("/me/toggle-2fa", response_model=UserInfo)
async def toggle_2fa(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: dict = Depends(deps.get_current_user),
    payload: Toggle2FARequest,
):
    operator = await crud_operator.get_operator(db, current_user["sub"])
    if not operator:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    updated = await crud_operator.update_operator(
        db=db,
        db_obj=operator,
        obj_in=OperatorUpdate(two_fa_enabled=payload.enabled),
    )
    return _build_user_info(updated)
