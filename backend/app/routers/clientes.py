import logging

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db.session import get_db
from app.routers.auth import get_current_user
from app.repositories.querys import (
    obtener_cliente,
    obtener_creditos_debitos,
    obtener_convenios,
    obtener_estado_cuenta,
    obtener_consumos,
    obtener_lecturas
)
from app.schemas.cliente import ClienteCompletoResponse

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])
logger = logging.getLogger(__name__)

@router.get(
    "/{codigo_cliente}",
    response_model=ClienteCompletoResponse,
    dependencies=[Depends(get_current_user)],
)
def obtener_cliente_completo(
    codigo_cliente: str = Path(
        ...,
        pattern=r"^[0-9]+$",
        description="Código numérico del cliente.",
    ),
    db: Session = Depends(get_db)
):
    """
    Obtiene información completa del cliente:
    - Datos personales (RF-04)
    - Notas de crédito/débito y convenios
    - Estado de cuenta (RF-05)
    - Consumos históricos (RF-07)
    - Lecturas históricas (RF-08)
    """
    try:
        cliente = obtener_cliente(db, codigo_cliente)
    except SQLAlchemyError:
        logger.exception("Error de base de datos al buscar cliente")
        raise HTTPException(
            status_code=503,
            detail="No se pudo consultar la base de datos. Inténtelo nuevamente más tarde.",
        )

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="El código de cliente no fue encontrado."
        )

    try:
        return {
            "datos_personales": cliente,
            "creditos_debitos": obtener_creditos_debitos(db, codigo_cliente),
            "convenios": obtener_convenios(db, codigo_cliente),
            "estado_cuenta": obtener_estado_cuenta(db, codigo_cliente),
            "estado_sico": [],
            "consumos": obtener_consumos(db, codigo_cliente),
            "lecturas": obtener_lecturas(db, codigo_cliente)
        }
    except SQLAlchemyError:
        logger.exception("Error de base de datos al obtener datos del cliente")
        raise HTTPException(
            status_code=503,
            detail="No se pudieron obtener los datos del cliente. Inténtelo nuevamente más tarde.",
        )