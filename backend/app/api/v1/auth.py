from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.security import verify_password, create_access_token, create_reset_token, decode_reset_token, get_password_hash
from app.core.email import send_reset_password_email
from app.crud.operator import get_operator_by_email_or_username, get_operator_by_email, update_operator_password
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo, ForgotPasswordRequest, ResetPasswordRequest

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(deps.get_db)):
    operator = await get_operator_by_email_or_username(db, request.username)

    if not operator or not operator.senha_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    if not verify_password(request.password, operator.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    if not operator.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta desativada. Contate o administrador.")

    access_token = create_access_token(data={"sub": operator.id_operador, "role": operator.role})

    return TokenResponse(
        access_token=access_token,
        user=UserInfo(
            id_operador=operator.id_operador,
            nome=operator.nome,
            username=operator.username,
            email=operator.email,
            role=operator.role,
        ),
    )


@router.post("/esqueci-senha", status_code=status.HTTP_200_OK)
async def esqueci_senha(request: ForgotPasswordRequest, db: AsyncSession = Depends(deps.get_db)):
    operador = await get_operator_by_email(db, request.email)

    # Resposta genérica para não revelar se o email existe ou não
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
