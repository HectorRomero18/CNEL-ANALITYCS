from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])

@router.get("/{codigo_cliente}")
def obtener_cliente_completo(codigo_cliente: str, db: Session = Depends(get_db)):
    """
    Ejecuta consultas parametrizadas y seguras hacia SQL Server.
    """
    try:
        # 1. Datos Personales (RF-04)
        query_cliente = text("SELECT codigo, nombre, cedula, direccion FROM Clientes WHERE codigo = :codigo")
        cliente = db.execute(query_cliente, {"codigo": codigo_cliente}).mappings().first()
        
        if not cliente:
            raise HTTPException(status_code=404, detail="El código de cliente no fue encontrado.")
            
        # 2. Estado de Cuenta (RF-05)
        query_estado = text("SELECT id_factura, fecha_emision, valor, estado FROM EstadoCuenta WHERE codigo_cliente = :codigo")
        estado_cuenta = db.execute(query_estado, {"codigo": codigo_cliente}).mappings().all()

        # 3. Estado SICO (RF-06)
        query_sico = text("SELECT fecha, estado_sico, observacion FROM EstadoSICO WHERE codigo_cliente = :codigo")
        estado_sico = db.execute(query_sico, {"codigo": codigo_cliente}).mappings().all()

        # 4. Consumos Históricos (RF-07)
        query_consumos = text("SELECT periodo, kwh FROM Consumos WHERE codigo_cliente = :codigo ORDER BY periodo DESC")
        consumos = db.execute(query_consumos, {"codigo": codigo_cliente}).mappings().all()

        # 5. Lecturas Históricas (RF-08)
        query_lecturas = text("SELECT fecha_lectura, lectura_actual, tipo FROM Lecturas WHERE codigo_cliente = :codigo ORDER BY fecha_lectura DESC")
        lecturas = db.execute(query_lecturas, {"codigo": codigo_cliente}).mappings().all()

        return {
            "datos_personales": dict(cliente),
            "estado_cuenta": [dict(r) for r in estado_cuenta],
            "estado_sico": [dict(r) for r in estado_sico],
            "consumos": [dict(r) for r in consumos],
            "lecturas": [dict(r) for r in lecturas]
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error de comunicación con la base de datos de CNEL EP.")