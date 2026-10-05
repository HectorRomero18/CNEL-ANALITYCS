from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any


def obtener_cliente(db: Session, codigo_cliente: str) -> Optional[Dict[str, Any]]:
    """Obtiene datos personales del cliente (RF-04)"""
    query = text("""
        SELECT 
            a.cx_cliente, no_cliente, CI_CLIENTE, fx_instala, no_dirprinc
        FROM cmclient a, cmdattec b
        WHERE a.cx_cliente=b.cx_cliente AND a.cx_cliente = :codigo
    """)
    result = db.execute(query, {"codigo": codigo_cliente}).mappings().first()
    return dict(result) if result else None


def obtener_estado_cuenta(db: Session, codigo_cliente: str) -> List[Dict[str, Any]]:
    """Obtiene estado de cuenta (RF-05)"""
    query = text("SELECT id_factura, fecha_emision, valor, estado FROM EstadoCuenta WHERE codigo_cliente = :codigo")
    return [dict(r) for r in db.execute(query, {"codigo": codigo_cliente}).mappings().all()]


def obtener_estado_sico(db: Session, codigo_cliente: str) -> List[Dict[str, Any]]:
    """Obtiene estado SICO (RF-06)"""
    query = text("SELECT fecha, estado_sico, observacion FROM EstadoSICO WHERE codigo_cliente = :codigo")
    return [dict(r) for r in db.execute(query, {"codigo": codigo_cliente}).mappings().all()]


def obtener_consumos(db: Session, codigo_cliente: str) -> List[Dict[str, Any]]:
    """Obtiene consumos históricos (RF-07)"""
    query = text("SELECT periodo, kwh FROM Consumos WHERE codigo_cliente = :codigo ORDER BY periodo DESC")
    return [dict(r) for r in db.execute(query, {"codigo": codigo_cliente}).mappings().all()]


def obtener_lecturas(db: Session, codigo_cliente: str) -> List[Dict[str, Any]]:
    """Obtiene lecturas históricas (RF-08)"""
    query = text("SELECT fecha_lectura, lectura_actual, tipo FROM Lecturas WHERE codigo_cliente = :codigo ORDER BY fecha_lectura DESC")
    return [dict(r) for r in db.execute(query, {"codigo": codigo_cliente}).mappings().all()]