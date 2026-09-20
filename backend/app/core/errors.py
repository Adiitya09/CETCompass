from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.app.core.logging import logger

class AppException(Exception):
    """Base application exception with structured error representation."""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        detail: Optional[Any] = None,
        code: str = "BAD_REQUEST"
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail or message
        self.code = code
        super().__init__(message)

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            code="NOT_FOUND"
        )

class AuthenticationError(AppException):
    def __init__(self, message: str = "Authentication required", detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            code="UNAUTHORIZED"
        )

class ForbiddenError(AppException):
    def __init__(self, message: str = "Access forbidden", detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code="FORBIDDEN"
        )

class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict", detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            code="CONFLICT"
        )

class ValidationError(AppException):
    def __init__(self, message: str = "Validation failed", detail: Optional[Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            code="VALIDATION_ERROR"
        )

def register_exception_handlers(app: FastAPI) -> None:
    """Registers global exception handlers for structured error responses."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(f"AppException on {request.method} {request.url.path}: {exc.message} (code={exc.code})")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "code": exc.code,
                "message": exc.message,
                "detail": exc.detail
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(f"HTTPException {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "detail": exc.detail
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"RequestValidationError on {request.method} {request.url.path}: {exc.errors()}")
        formatted_errors = []
        for err in exc.errors():
            loc = " -> ".join([str(l) for l in err.get("loc", [])])
            formatted_errors.append(f"{loc}: {err.get('msg')}")
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "status": "error",
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload or query parameters.",
                "detail": formatted_errors
            }
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "detail": str(exc)
            }
        )
