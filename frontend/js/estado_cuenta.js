function renderEstadoCuenta(data) {
    const tbody = document.getElementById('tbody-estado-cuenta');
    const saldoLabel = document.getElementById('lbl-saldo-total');
    if (!tbody) return;

    const movimientos = data.estado_cuenta || [];
    if (!movimientos.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron movimientos para este cliente.</td></tr>';
        if (saldoLabel) saldoLabel.textContent = '$0.00';
        return;
    }

    tbody.innerHTML = movimientos.map((item, index) => `
        <tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
            <td>${escapeHtml(displayDate(item.fecha))}</td>
            <td>${escapeHtml(displayValue(item.tipo_evento))}</td>
            <td>${escapeHtml(displayValue(item.codigo_evento))}</td>
            <td>${escapeHtml(displayValue(item.factura))}</td>
            <td>${escapeHtml(displayValue(item.valor))}</td>
            <td>${escapeHtml(displayValue(item.saldo))}</td>
        </tr>`).join('');

    if (saldoLabel) {
        const saldo = movimientos[movimientos.length - 1].saldo;
        saldoLabel.textContent = `$${displayValue(saldo, '0.00')}`;
    }
}
