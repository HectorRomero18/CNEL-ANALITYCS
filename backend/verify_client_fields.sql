DECLARE @codigo_cliente INT = 1313;

-- Datos del cliente, instalacion, medidor y convenio mas reciente.
SELECT
    c.cx_cliente AS codigo_cliente,
    c.no_cliente AS nombre,
    c.ci_cliente AS cedula,
    c.no_dirprinc AS direccion,
    c.tx_fono AS telefono,
    c.qn_promedio AS consumo_promedio_kwh,
    c.qn_antdeuda AS meses_deuda,
    c.vx_saldo AS deuda_sap,
    i.fx_instala AS fecha_instalacion,
    m.cx_nummed AS medidor,
    m.cx_marca AS marca,
    m.cx_serie AS serie,
    m.cx_modelo AS modelo_medidor,
    cv.fi_convenio AS fecha_convenio_mas_reciente,
    cv.vt_deuda AS deuda_convenio_mas_reciente,
    cv.qn_partes AS partes_convenio_mas_reciente,
    cv.tx_observ AS observacion_convenio_mas_reciente
FROM CMCLIENT AS c
OUTER APPLY (
    SELECT TOP (1) fx_instala
    FROM CMDATTEC
    WHERE cx_cliente = c.cx_cliente
    ORDER BY fx_instala DESC
) AS i
OUTER APPLY (
    SELECT TOP (1) cx_nummed, cx_marca, cx_serie, cx_modelo
    FROM CMDATMED
    WHERE cx_cliente = c.cx_cliente
    ORDER BY fx_instini DESC
) AS m
OUTER APPLY (
    SELECT TOP (1) fi_convenio, vt_deuda, qn_partes, tx_observ
    FROM CMCONVEN
    WHERE cx_cliente = c.cx_cliente
    ORDER BY fi_convenio DESC
) AS cv
WHERE c.cx_cliente = @codigo_cliente;

-- Notas de credito/debito: un resultado vacio significa que no hay filas en FAHISCRE.
SELECT
    fx_calculo AS fecha,
    qs_notadc AS numero_nota,
    qn_consumo AS kwh,
    vx_ndctotal AS valor,
    tp_cargo AS tipo_cargo,
    cx_indndc AS codigo_nota,
    qn_orden AS orden
FROM FAHISCRE
WHERE cx_cliente = @codigo_cliente
ORDER BY fx_calculo DESC, qn_orden DESC;

-- Todos los convenios registrados para el cliente.
SELECT
    fi_convenio AS fecha,
    vt_deuda AS deuda,
    qn_partes AS numero_partes,
    vx_porpagar AS saldo_pendiente,
    ce_convenio AS estado,
    tx_observ AS observacion
FROM CMCONVEN
WHERE cx_cliente = @codigo_cliente
ORDER BY fi_convenio DESC;

-- Movimientos de cuenta. tp_evento devuelve los codigos originales (F/P).
SELECT
    fi_evento AS fecha,
    tp_evento AS tipo_evento,
    cx_indevento AS codigo_evento,
    qs_factura AS factura,
    vx_evento AS valor,
    vx_saldo AS saldo
FROM FAHISDEU
WHERE cx_cliente = @codigo_cliente
ORDER BY fi_evento;

-- Comprobar si hay movimientos marcados como SICO en FAHISDEU.
SELECT
    tp_evento,
    COUNT(*) AS cantidad
FROM FAHISDEU
WHERE cx_cliente = @codigo_cliente
GROUP BY tp_evento
ORDER BY tp_evento;

-- Consumo facturado (no incluye un importe monetario en FAHISCON).
SELECT
    fx_factura AS periodo,
    qx_conact AS kwh_activos,
    qx_conreac AS kwh_reactivos,
    qn_diascons AS dias_facturados
FROM FAHISCON
WHERE cx_cliente = @codigo_cliente
ORDER BY fx_factura DESC;

-- Lecturas y descripciones de tipo/observacion.
SELECT
    f.cx_nummed AS medidor,
    f.fx_tomalec AS fecha_lectura,
    f.qx_ultlec AS lectura_anterior,
    f.qx_tomalec AS lectura_tomada,
    f.qx_factlec AS lectura_facturada,
    CASE
        WHEN f.qx_ultlec IS NOT NULL THEN f.qx_tomalec - f.qx_ultlec
        ELSE NULL
    END AS consumo_calculado_kwh,
    f.tp_lectura AS codigo_tipo_lectura,
    t.tx_tplectura AS tipo_lectura,
    f.cx_observa AS codigo_observacion,
    o.tx_descobs AS observacion,
    f.cx_tipo AS tipo_registro
FROM FAHISLEC AS f
LEFT JOIN CTTPLECT AS t ON t.tp_lectura = f.tp_lectura
LEFT JOIN CTOBSERV AS o ON o.cx_observa = f.cx_observa
WHERE f.cx_cliente = @codigo_cliente
ORDER BY f.fx_tomalec DESC;
