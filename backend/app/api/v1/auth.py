from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.security import verify_password, create_access_token
from app.crud.operator import get_operator_by_email_or_username
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo

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
