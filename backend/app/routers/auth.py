from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import get_local_db

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Configuración de OAuth2 para FastAPI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# Configuración de bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt", "bcrypt_sha256"], 
    deprecated="auto"
)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ==========================================================================
# FUNCIÓN GET_CURRENT_USER (Para APIs y Vistas Jinja2)
# ==========================================================================
def get_current_user(
    request: Request,
    token_header: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_local_db)
) -> dict:
    """
    Obtiene los datos del usuario autenticado desencriptando el JWT.
    Busca el token primero en los Encabezados (Authorization: Bearer) 
    y como alternativa en las Cookies (access_token).
    """
    token = token_header
    
    # 1. Si no viene en el Header Authorization, buscar en Cookies
    if not token:
        token = request.cookies.get("access_token")
        if token and token.startswith("Bearer "):
            token = token.replace("Bearer ", "")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Token de acceso no proporcionado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # 2. Decodificar token JWT
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Consultar usuario en base de datos
    user_query = text("""
        SELECT u.id, u.username, u.email, u.nombre_completo, u.is_active, r.nombre AS rol_nombre
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.id = :id
    """)
    user = db.execute(user_query, {"id": user_id}).fetchone()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo."
        )

    # Obtener primer nombre para mostrar en el saludo "Hola, Marlene"
    nombre_partes = (user.nombre_completo or user.username).split()
    primer_nombre = nombre_partes[0] if nombre_partes else user.username

    return {
        "id": user.id,
        "username": user.username,
        "nombre_completo": user.nombre_completo,
        "primer_nombre": primer_nombre,
        "email": user.email,
        "rol": user.rol_nombre,
        "permisos": payload.get("permisos", [])
    }


def get_current_user_optional(
    request: Request,
    token_header: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_local_db)
) -> Optional[dict]:
    """
    Intenta obtener el usuario actual. 
    Si no viene token o es inválido, retorna None en lugar de lanzar un error 401.
    """
    try:
        return get_current_user(request=request, token_header=token_header, db=db)
    except HTTPException:
        return None

# ==========================================================================
# LOGIN Y LOGOUT CORREGIDOS
# ==========================================================================

@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_local_db)
):
    try:
        # 1. Buscar usuario y rol
        user_query = text("""
            SELECT u.id, u.username, u.email, u.password AS hashed_password, u.nombre_completo, u.is_active,
                   r.nombre AS rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.username = :username OR u.email = :username
        """)
        user = db.execute(user_query, {"username": form_data.username}).fetchone()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario o contraseña incorrectos"
            )

        # 2. Verificar contraseña
        password_valida = False
        try:
            password_valida = pwd_context.verify(form_data.password, user.hashed_password)
        except Exception as e:
            print(f"Error al verificar la contraseña: {e}")
            password_valida = False

        if not password_valida:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario o contraseña incorrectos"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario se encuentra desactivado"
            )

        # 3. Consultar permisos
        permisos_query = text("""
            SELECT p.codigo 
            FROM permisos p
            JOIN roles_permisos rp ON p.id = rp.permiso_id
            JOIN roles r ON rp.rol_id = r.id
            WHERE r.nombre = :rol
        """)
        permisos_result = db.execute(permisos_query, {"rol": user.rol_nombre}).fetchall()
        permisos_list = [row.codigo for row in permisos_result]

        # 4. Registrar log
        db.execute(
            text("INSERT INTO logs_acceso (usuario_id, accion, detalles) VALUES (:id, 'LOGIN', 'Inicio de sesión exitoso')"),
            {"id": user.id}
        )
        db.commit()

        # 5. Generar token
        token_payload = {
            "sub": str(user.id),
            "username": user.username,
            "rol": user.rol_nombre,
            "permisos": permisos_list
        }
        access_token = create_access_token(data=token_payload)

        # ==================================================================
        # 🟢 GUARDAR EN COOKIE CON path="/" OBLIGATORIO
        # ==================================================================
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            samesite="lax",
            path="/",  # <-- AGREGADO: Garantiza que la cookie sea accesible y borrable globalmente
            max_age=28800  # 8 horas
        )

        nombre_partes = (user.nombre_completo or user.username).split()
        primer_nombre = nombre_partes[0] if nombre_partes else user.username

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "nombre": user.nombre_completo,
                "primer_nombre": primer_nombre,
                "rol": user.rol_nombre,
                "permisos": permisos_list
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ ERROR CRÍTICO EN LOGIN: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el servidor: {str(e)}"
        )


@router.post("/logout")
def logout(response: Response):
    response = JSONResponse(content={"message": "Sesión cerrada correctamente"})

    # Borrar la cookie desde el punto más general del sitio para que no quede viva
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    response.delete_cookie(
        key="access_token",
        path="/auth",
        httponly=True,
        samesite="lax"
    )

    # Forzar eliminación inmediata por si acaso quedó en el navegador
    response.set_cookie(
        key="access_token",
        value="",
        expires=0,
        max_age=0,
        path="/",
        httponly=True,
        samesite="lax"
    )

    return response