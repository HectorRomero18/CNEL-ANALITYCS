from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_local_db

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Configuración de bcrypt con esquemas de respaldo para evitar incompatibilidad de prefijos
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

@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
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

        # 2. Verificar contraseña evitando que colapse el servidor
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

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "nombre": user.nombre_completo,
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