# app/core/decorators.py
from functools import wraps
from fastapi import Request
from fastapi.responses import RedirectResponse
from app.routers.auth import get_current_user_optional
from app.db.session import get_local_db

def login_required(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Request | None = kwargs.get("request")
        if not request:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

        if not request:
            raise ValueError("La función decorada debe recibir 'request: Request'")

        db = next(get_local_db())
        try:
            user = get_current_user_optional(request=request, token_header=None, db=db)
        finally:
            db.close()

        # Si no hay usuario activo, redirigir al Login y borrar cualquier cookie remanente
        if not user:
            response = RedirectResponse(url="/", status_code=303)
            response.delete_cookie("access_token", path="/")
            return response

        # Obtener la respuesta de la plantilla HTML
        response = await func(*args, **kwargs)

        # 🟢 EVITA QUE CHROME GUARDE LA VISTA EN CACHÉ DE MEMORIA
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response

    return wrapper