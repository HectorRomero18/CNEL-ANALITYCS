function renderInfoCliente(data) {
    const creditosBody = document.getElementById('tbody-creditos-debitos');
    const conveniosBody = document.getElementById('tbody-convenios');
    const creditos = data.creditos_debitos || [];
    const convenios = data.convenios || [];

    if (creditosBody) {
        creditosBody.innerHTML = creditos.length
            ? creditos.map(item => `
                <tr>
                    <td>${escapeHtml(displayDate(item.fecha))}</td>
                    <td>${escapeHtml(displayValue(item.numero_nota))}</td>
                    <td>${escapeHtml(displayValue(item.kwh))}</td>
                    <td>${escapeHtml(displayValue(item.valor))}</td>
                    <td>${escapeHtml(displayValue(item.tipo_cargo))}</td>
                </tr>`).join('')
            : '<tr><td colspan="5" class="empty-state">No hay notas de crédito o débito registradas.</td></tr>';
    }

    if (conveniosBody) {
        conveniosBody.innerHTML = convenios.length
            ? convenios.map(item => `
                <tr>
                    <td>${escapeHtml(displayDate(item.fecha))}</td>
                    <td>${escapeHtml(displayValue(item.deuda))}</td>
                    <td>${escapeHtml(displayValue(item.saldo_pendiente))}</td>
                    <td>${escapeHtml(displayValue(item.numero_partes))}</td>
                    <td>${escapeHtml(displayValue(item.estado))}</td>
                    <td>${escapeHtml(displayValue(item.observacion, 'Sin observacion'))}</td>
                </tr>`).join('')
            : '<tr><td colspan="6" class="empty-state">No hay convenios registrados.</td></tr>';
    }
}
