from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db.session import get_db
from app.repositories.querys import (
    obtener_cliente,
    obtener_creditos_debitos,
    obtener_convenios,
    obtener_estado_cuenta,
    obtener_estado_sico,
    obtener_consumos,
    obtener_lecturas
)
from app.schemas.cliente import ClienteCompletoResponse

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])


@router.get("/{codigo_cliente}", response_model=ClienteCompletoResponse)
def obtener_cliente_completo(
    codigo_cliente: str,
    db: Session = Depends(get_db)
):
    """
    Obtiene información completa del cliente:
    - Datos personales (RF-04)
    - Notas de crédito/débito y convenios
    - Estado de cuenta (RF-05)
    - Estado SICO (RF-06)
    - Consumos históricos (RF-07)
    - Lecturas históricas (RF-08)
    """
    try:
        cliente = obtener_cliente(db, codigo_cliente)
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de base de datos al buscar cliente: {str(e)}"
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
            "estado_sico": obtener_estado_sico(db, codigo_cliente),
            "consumos": obtener_consumos(db, codigo_cliente),
            "lecturas": obtener_lecturas(db, codigo_cliente)
        }
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de base de datos al obtener datos: {str(e)}"
        )