# app/core/context_processors.py
from fastapi import Request
from app.routers.auth import get_current_user_optional
from app.db.session import get_local_db

def inject_user(request: Request) -> dict:
    """
    Inyecta el usuario autenticado de forma global en todas las plantillas Jinja2.
    """
    user = None
    try:
        # Abre una sesión temporal con la base de datos para validar la cookie/token
        db = next(get_local_db())
        user = get_current_user_optional(request=request, token_header=None, db=db)
    except Exception as e:
        print(f"Error cargando usuario global Jinja2: {e}")
    
    return {"user": user}