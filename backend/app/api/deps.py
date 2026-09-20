from typing import Optional
from fastapi import Depends, Header, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.services.auth_service import AuthService
from backend.app.core.errors import AuthenticationError, ForbiddenError

def get_current_user(
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None)
) -> User:
    """
    Resolves the current user. Allows guest fallback for public/semi-public routes.
    """
    return AuthService.resolve_user(
        db=db,
        x_user_id=x_user_id,
        x_admin_key=x_admin_key,
        authorization=authorization,
        require_auth=False
    )

def get_authenticated_user(
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None)
) -> User:
    """
    Strictly requires authentication. Raises 401 if credentials are missing.
    """
    if not x_user_id and not x_admin_key and not authorization:
        raise AuthenticationError("Authentication credentials (Bearer token or X-User-Id) required.")

    return AuthService.resolve_user(
        db=db,
        x_user_id=x_user_id,
        x_admin_key=x_admin_key,
        authorization=authorization,
        require_auth=True
    )

def require_admin_user(
    user: User = Depends(get_authenticated_user)
) -> User:
    """
    Enforces that the authenticated user possesses administrator privileges.
    Raises 403 if user is not an admin.
    """
    return AuthService.require_admin(user)
