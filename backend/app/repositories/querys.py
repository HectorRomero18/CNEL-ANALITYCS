from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any


def obtener_cliente(db: Session, codigo_cliente: str) -> Optional[Dict[str, Any]]:
    """Obtiene datos personales del cliente (RF-04)"""

    query = text("""
        SELECT
            a.cx_cliente as codigo_cliente,
            a.no_cliente as nombre,
            a.ci_cliente as cedula,
            b.fx_instala as fecha_instalacion,
            a.no_dirprinc as direccion,
            a.tx_fono as telefono,
            m.cx_nummed as medidor,
            m.cx_marca as marca,
            m.cx_serie as serie,
            m.cx_modelo as modelo_medidor,
            a.qn_promedio as consumo_promedio,
            a.qn_antdeuda as meses_deuda,
            a.vx_saldo as deuda_sap,
            c.vt_deuda as deuda_convenio,
            c.qn_partes as num_partes_convenio,
            c.fi_convenio as fecha_convenio,
            c.tx_observ as obs_convenio
        FROM cmclient a
        OUTER APPLY (
            SELECT TOP 1 fx_instala
            FROM cmdattec
            WHERE cx_cliente = a.cx_cliente
            ORDER BY fx_instala DESC
        ) b
        OUTER APPLY (
            SELECT TOP 1 cx_nummed, cx_marca, cx_serie, cx_modelo
            FROM CMDATMED
            WHERE cx_cliente = a.cx_cliente
            ORDER BY fx_instini DESC
        ) m
        OUTER APPLY (
            SELECT TOP 1 vt_deuda, qn_partes, fi_convenio, tx_observ
            FROM CMCONVEN
            WHERE cx_cliente = a.cx_cliente
            ORDER BY fi_convenio DESC
        ) c
        WHERE a.cx_cliente = :codigo
    """)

    result = db.execute(
        query,
        {"codigo": codigo_cliente}
    ).mappings().first()

    return dict(result) if result else None


def obtener_creditos_debitos(
    db: Session,
    codigo_cliente: str
) -> List[Dict[str, Any]]:
    """Obtiene notas de crédito y débito históricas (FAHISCRE)."""
    query = text("""
        SELECT
            fx_calculo as fecha,
            qs_notadc as numero_nota,
            qn_consumo as kwh,
            vx_ndctotal as valor,
            tp_cargo as tipo_cargo,
            cx_indndc as codigo_nota,
            qn_orden as orden
        FROM FAHISCRE
        WHERE cx_cliente = :codigo
        ORDER BY fx_calculo DESC, qn_orden DESC
    """)
    return [
        dict(row)
        for row in db.execute(query, {"codigo": codigo_cliente}).mappings().all()
    ]


def obtener_convenios(
    db: Session,
    codigo_cliente: str
) -> List[Dict[str, Any]]:
    """Obtiene todos los convenios registrados (CMCONVEN)."""
    query = text("""
        SELECT
            fi_convenio as fecha,
            vt_deuda as deuda,
            qn_partes as numero_partes,
            vx_porpagar as saldo_pendiente,
            ce_convenio as estado,
            tx_observ as observacion
        FROM CMCONVEN
        WHERE cx_cliente = :codigo
        ORDER BY fi_convenio DESC
    """)
    return [
        dict(row)
        for row in db.execute(query, {"codigo": codigo_cliente}).mappings().all()
    ]


def obtener_estado_cuenta(
    db: Session,
    codigo_cliente: str
) -> List[Dict[str, Any]]:
    """Obtiene estado de cuenta (RF-05)"""

    query = text("""
        SELECT
            fi_evento as fecha,
            tp_evento as tipo_evento,
            cx_indevento as codigo_evento,
            qs_factura as factura,
            vx_evento as valor,
            vx_saldo as saldo
        FROM fahisdeu
        WHERE cx_cliente = :codigo
        ORDER BY fi_evento
    """)

    return [
        dict(r)
        for r in db.execute(
            query,
            {"codigo": codigo_cliente}
        ).mappings().all()
    ]


def obtener_estado_sico(
    db: Session,
    codigo_cliente: str
) -> List[Dict[str, Any]]:
    """Obtiene estado SICO (RF-06)"""

    query = text("""
        SELECT
            fi_evento as fecha,
            tp_evento as estado_sico,
            cx_indevento as codigo_evento,
            qs_factura as factura,
            vx_evento as valor,
            vx_saldo as saldo
        FROM fahisdeu
        WHERE cx_cliente = :codigo
          AND tp_evento = 'S'
        ORDER BY fi_evento
    """)
    return [
        dict(r)
        for r in db.execute(
            query,
            {"codigo": codigo_cliente}
        ).mappings().all()
    ]


def obtener_consumos(
    db: Session,
    codigo_cliente: str
) -> List[Dict[str, Any]]:
    """Obtiene consumos históricos (RF-07)"""

    query = text("""
        SELECT
            fx_factura AS periodo,
            qx_conact AS kwh,
            qx_conreac AS kwh_reactiva,
            qn_diascons AS dias_facturados
        FROM fahiscon
        WHERE cx_cliente = :codigo
        ORDER BY fx_factura DESC
    """)

    return [
        dict(r)
        for r in db.execute(
            query,
            {"codigo": codigo_cliente}
        ).mappings().all()
    ]


def obtener_lecturas(
    db: Session,
    codigo_cliente: str
) -> List[Dict[str, Any]]:
    """Obtiene lecturas históricas (RF-08)"""

    query = text("""
        SELECT
            f.cx_cliente,
            f.cx_nummed,
            f.fx_tomalec,
            f.qx_ultlec,
            f.qx_tomalec,
            f.qx_factlec,
            CASE
                WHEN f.qx_ultlec IS NOT NULL
                THEN f.qx_tomalec - f.qx_ultlec
                ELSE NULL
            END as consumo_kwh,
            f.tp_lectura,
            t.tx_tplectura as tipo_lectura_desc,
            f.cx_observa,
            CASE
                WHEN f.cx_observa = '00' THEN N'Sin observacion'
                ELSE o.tx_descobs
            END as observacion_desc,
            f.cx_tipo

        FROM faHISLEC f

        LEFT JOIN CTTPLECT t
            ON t.tp_lectura = f.tp_lectura

        LEFT JOIN CTOBSERV o
            ON f.cx_observa = o.cx_observa

        WHERE f.cx_cliente = :codigo
        ORDER BY f.fx_tomalec DESC
    """)

    return [
        dict(r)
        for r in db.execute(
            query,
            {"codigo": codigo_cliente}
        ).mappings().all()
    ]