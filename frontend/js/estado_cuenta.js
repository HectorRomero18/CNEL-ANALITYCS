/**
 * Renderiza los datos de la sección Estado de Cuenta.
 * @param {Object} data Objeto JSON enviado por el backend FastAPI.
 */
function renderEstadoCuenta(data) {
    const tbody = document.getElementById("tbody-estado-cuenta");
    const lblCodigo = document.getElementById("lbl-codigo-estcta");
    const lblSaldoTotal = document.getElementById("lbl-saldo-total");

    if (!tbody) return;

    // Actualizar código de cliente en la cabecera
    if (lblCodigo) {
        lblCodigo.innerText = clienteActual || '-';
    }

    const estadoCuentaList = data.estado_cuenta || [];

    // Si no hay datos registrados
    if (estadoCuentaList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    No se encontraron registros de estado de cuenta para este cliente.
                </td>
            </tr>`;
        if (lblSaldoTotal) lblSaldoTotal.innerText = "$0.00";
        return;
    }

    let htmlRows = '';
    let ultimoSaldo = 0;

    estadoCuentaList.forEach((item, index) => {
        // Formato de Tipo y Estado
        const tipoText = (item.tipo || '').toUpperCase() === 'P' ? 'PAGO (P)' : 'FACTURA (F)';
        const tipoClass = (item.tipo || '').toUpperCase() === 'P' ? 'pago' : 'factura';
        
        const estadoVal = (item.estado || 'PENDIENTE').toUpperCase();
        const estadoClass = estadoVal === 'PAGADO' ? 'pagado' : 'pendiente';

        const valorVal = parseFloat(item.valor || 0);
        const saldoVal = parseFloat(item.saldo !== undefined ? item.saldo : valorVal);
        
        // El último saldo registrado será el saldo acumulado actual
        ultimoSaldo = saldoVal;

        htmlRows += `
            <tr>
                <td>${String(index + 1).padStart(2, '0')}</td>
                <td>${item.fecha || '-'}</td>
                <td><span class="badge-tipo ${tipoClass}">${tipoText}</span></td>
                <td>$${valorVal.toFixed(2)}</td>
                <td><strong>$${saldoVal.toFixed(2)}</strong></td>
                <td><span class="badge-estado ${estadoClass}">${estadoVal}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlRows;

    // Actualizar el saldo total en la esquina superior
    if (lblSaldoTotal) {
        lblSaldoTotal.innerText = `$${ultimoSaldo.toFixed(2)}`;
    }
}