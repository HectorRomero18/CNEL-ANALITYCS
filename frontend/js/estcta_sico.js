/**
 * Renderiza los registros de la hoja ESTCTA SICO.
 * @param {Object} data Objeto de respuesta del backend FastAPI.
 */
function renderEstctaSico(data) {
    const tbody = document.getElementById("tbody-estcta-sico");
    const lblCodigo = document.getElementById("lbl-codigo-sico");
    const lblSaldoSico = document.getElementById("lbl-saldo-sico");

    if (!tbody) return;

    if (lblCodigo) {
        lblCodigo.innerText = clienteActual || '-';
    }

    const sicoList = data.estcta_sico || [];

    if (sicoList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    No se encontraron registros en SICO para este cliente.
                </td>
            </tr>`;
        if (lblSaldoSico) lblSaldoSico.innerText = "$0.00";
        return;
    }

    let htmlRows = '';
    let ultimoSaldo = 0;

    sicoList.forEach((item, index) => {
        const tipoText = (item.tipo || '').toUpperCase() === 'P' ? 'PAGO (P)' : 'FACTURA (F)';
        const tipoClass = (item.tipo || '').toUpperCase() === 'P' ? 'pago' : 'factura';

        const valorVal = parseFloat(item.valor || 0);
        const saldoVal = parseFloat(item.saldo || 0);
        
        ultimoSaldo = saldoVal;

        htmlRows += `
            <tr>
                <td>${String(index + 1).padStart(2, '0')}</td>
                <td>${item.fecha || '-'}</td>
                <td><span class="badge-tipo ${tipoClass}">${tipoText}</span></td>
                <td>$${valorVal.toFixed(2)}</td>
                <td><strong>$${saldoVal.toFixed(2)}</strong></td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlRows;

    if (lblSaldoSico) {
        lblSaldoSico.innerText = `$${ultimoSaldo.toFixed(2)}`;
    }
}