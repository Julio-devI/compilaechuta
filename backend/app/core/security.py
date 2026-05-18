import random
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ── 2FA in-memory store: user_id → (code, expires_at) ──
_2fa_store: dict[str, tuple[str, datetime]] = {}


def generate_2fa_code(user_id: str) -> str:
    code = f"{random.randint(0, 999999):06d}"
    _2fa_store[user_id] = (code, datetime.now(timezone.utc) + timedelta(minutes=2))
    return code


def verify_2fa_code(user_id: str, code: str) -> bool:
    entry = _2fa_store.get(user_id)
    if not entry:
        return False
    stored_code, expires_at = entry
    if datetime.now(timezone.utc) > expires_at:
        _2fa_store.pop(user_id, None)
        return False
    if stored_code != code:
        return False
    _2fa_store.pop(user_id, None)
    return True


def create_2fa_pending_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=3)
    return jwt.encode(
        {"sub": user_id, "type": "2fa_pending", "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_2fa_pending_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "2fa_pending":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def create_reset_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    data = {"sub": email, "type": "password_reset", "exp": expire}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_reset_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None
