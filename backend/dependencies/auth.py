from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models.user import User

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

optional_security = HTTPBearer(auto_error=False)

def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(optional_security),
    db: Session = Depends(get_db)
):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email:
            return db.query(User).filter(User.email == email).first()
    except Exception:
        return None
    return None

ROLE_ALIASES = {
    "OPERATIONS_MANAGER": {"OPERATIONS_MANAGER", "MANAGER"},
    "MANAGER": {"OPERATIONS_MANAGER", "MANAGER"},
    "EMERGENCY_OFFICER": {"EMERGENCY_OFFICER", "SECURITY"},
    "SECURITY": {"EMERGENCY_OFFICER", "SECURITY"},
    "VIEWER": {"VIEWER", "VOLUNTEER"},
    "VOLUNTEER": {"VIEWER", "VOLUNTEER"},
    "DATA_ANALYST": {"DATA_ANALYST", "ANALYST"},
    "SUPER_ADMIN": {"SUPER_ADMIN"},
    "TEMPLE_ADMIN": {"TEMPLE_ADMIN"},
    "MEDICAL": {"MEDICAL"},
    "RECEPTIONIST": {"RECEPTIONIST"}
}

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = (current_user.role or "").strip().upper()
        if user_role == "SUPER_ADMIN":
            return current_user

        # Expand allowed roles with aliases
        expanded_allowed = set()
        for r in allowed_roles:
            r_norm = r.strip().upper()
            expanded_allowed.add(r_norm)
            if r_norm in ROLE_ALIASES:
                expanded_allowed.update(ROLE_ALIASES[r_norm])

        # Check if user's role or its aliases match
        user_roles = {user_role}
        if user_role in ROLE_ALIASES:
            user_roles.update(ROLE_ALIASES[user_role])

        if not user_roles.intersection(expanded_allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )
        return current_user
    return role_checker
