from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from app.db.session import get_local_db
from app.routers.auth import get_current_user_optional

router = APIRouter(prefix="/admin", tags=["Administración"])
templates = Jinja2Templates(directory="app/templates")
pwd_context = CryptContext(schemes=["bcrypt", "bcrypt_sha256"], deprecated="auto")

# 🔒 DECORADOR EXCLUSIVO PARA ROL ADMIN
def admin_required(func):
    async def wrapper(*args, **kwargs):
        request: Request = kwargs.get("request")
        if not request:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

        db = next(get_local_db())
        try:
            user = get_current_user_optional(request=request, token_header=None, db=db)
        finally:
            db.close()

        # Validar si existe sesión y si el rol es Admin
        if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
            return RedirectResponse(url="/", status_code=303)

        response = await func(*args, **kwargs)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        return response
    return wrapper

# --------------------------------------------------------------------------
# VISTA PRINCIPAL
# --------------------------------------------------------------------------
@router.get("/usuarios", response_class=HTMLResponse)
@admin_required
async def admin_usuarios_page(request: Request, db: Session = Depends(get_local_db)):
    user = get_current_user_optional(request=request, token_header=None, db=db)
    
    # Obtener roles para los select del modal
    roles = db.execute(text("SELECT id, nombre FROM roles ORDER BY nombre")).fetchall()
    
    return templates.TemplateResponse("admin_usuarios.html", {
        "request": request,
        "user": user,
        "roles": roles
    })

# --------------------------------------------------------------------------
# ENDPOINTS API (CRUD)
# --------------------------------------------------------------------------

@router.get("/api/usuarios")
async def listar_usuarios(request: Request, db: Session = Depends(get_local_db)):
    user = get_current_user_optional(request=request, token_header=None, db=db)
    if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    query = text("""
        SELECT u.id, u.username, u.email, u.nombre_completo, u.cedula_identidad, u.is_active, 
               u.rol_id, r.nombre AS rol_nombre
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        ORDER BY u.id DESC
    """)
    result = db.execute(query).fetchall()
    
    usuarios = [
        {
            "id": row.id,
            "username": row.username,
            "email": row.email,
            "nombre_completo": row.nombre_completo,
            "cedula_identidad": row.cedula_identidad,
            "is_active": row.is_active,
            "rol_id": row.rol_id,
            "rol_nombre": row.rol_nombre
        }
        for row in result
    ]
    return JSONResponse(content=usuarios)

@router.post("/api/usuarios")
async def crear_usuario(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    nombre_completo: str = Form(...),
    cedula_identidad: str = Form(...),
    password: str = Form(...),
    rol_id: int = Form(...),
    db: Session = Depends(get_local_db)
):
    user = get_current_user_optional(request=request, token_header=None, db=db)
    if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    hashed_pw = pwd_context.hash(password)
    
    query = text("""
        INSERT INTO usuarios (username, email, nombre_completo, cedula_identidad, password, rol_id, is_active)
        VALUES (:username, :email, :nombre_completo, :cedula, :password, :rol_id, true)
    """)
    try:
        db.execute(query, {
            "username": username,
            "email": email,
            "nombre_completo": nombre_completo,
            "cedula": cedula_identidad,
            "password": hashed_pw,
            "rol_id": rol_id
        })
        db.commit()
        return JSONResponse(content={"message": "Usuario creado con éxito"})
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="El usuario, cédula o email ya existe.")

@router.put("/api/usuarios/{usuario_id}")
async def actualizar_usuario(
    usuario_id: int,
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    nombre_completo: str = Form(...),
    cedula_identidad: str = Form(...),
    password: Optional[str] = Form(None),
    rol_id: int = Form(...),
    db: Session = Depends(get_local_db)
):
    user = get_current_user_optional(request=request, token_header=None, db=db)
    if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    existe = db.execute(text("SELECT id FROM usuarios WHERE id = :id"), {"id": usuario_id}).first()
    if not existe:
        raise HTTPException(status_code=404, detail="El usuario no existe.")

    params = {
        "id": usuario_id,
        "username": username,
        "email": email,
        "nombre_completo": nombre_completo,
        "cedula": cedula_identidad,
        "rol_id": rol_id,
    }

    campos = [
        "username = :username",
        "email = :email",
        "nombre_completo = :nombre_completo",
        "cedula_identidad = :cedula",
        "rol_id = :rol_id",
    ]

    if password:
        params["password"] = pwd_context.hash(password)
        campos.append("password = :password")

    query = f"UPDATE usuarios SET {', '.join(campos)} WHERE id = :id"

    try:
        db.execute(text(query), params)
        db.commit()
        return JSONResponse(content={"message": "Usuario actualizado con éxito"})
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="El usuario, cédula o email ya existe.")

@router.put("/api/usuarios/{usuario_id}/estado")
async def cambiar_estado_usuario(usuario_id: int, request: Request, db: Session = Depends(get_local_db)):
    user = get_current_user_optional(request=request, token_header=None, db=db)
    if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # Cambiar estado
    db.execute(text("UPDATE usuarios SET is_active = NOT is_active WHERE id = :id"), {"id": usuario_id})
    db.commit()
    return JSONResponse(content={"message": "Estado actualizado"})

@router.delete("/api/usuarios/{usuario_id}")
async def eliminar_usuario(usuario_id: int, request: Request, db: Session = Depends(get_local_db)):
    user = get_current_user_optional(request=request, token_header=None, db=db)
    if not user or user.get("rol", "").upper() not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    db.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": usuario_id})
    db.commit()
    return JSONResponse(content={"message": "Usuario eliminado"})