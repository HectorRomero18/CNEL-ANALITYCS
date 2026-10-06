/* ==========================================================================
   MÓDULO DE LECTURAS (lectura.js)
   ========================================================================== */

/**
 * Renderiza la tabla de lecturas registradas.
 * @param {Object} data Objeto JSON devuelto por la API del backend.
 */
function renderLectura(data) {
    const tbody = document.getElementById("tbody-lectura");
    if (!tbody) return;

    const lecturasList = data.lecturas || [];

    // Si no se registran datos
    if (lecturasList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    No se encontraron registros de lecturas para este cliente.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = lecturasList.map((item, index) => {
        const tipoLectura = displayValue(item.tipo_lectura_desc, item.tp_lectura || 'Sin tipo');
        const observacion = item.cx_observa === '00'
            ? 'Sin observacion'
            : displayValue(item.observacion_desc, item.cx_observa ? `Observacion ${item.cx_observa}` : 'Sin observacion');
        return `
            <tr>
                <td>${String(index + 1).padStart(2, '0')}</td>
                <td>${escapeHtml(displayDate(item.fx_tomalec))}</td>
                <td><strong>${escapeHtml(displayValue(item.cx_nummed))}</strong></td>
                <td>${escapeHtml(displayValue(item.qx_ultlec))}</td>
                <td><strong>${escapeHtml(displayValue(item.qx_tomalec))}</strong></td>
                <td>${escapeHtml(displayValue(item.qx_factlec))}</td>
                <td><span class="badge-kwh">${escapeHtml(displayValue(item.consumo_kwh))}</span></td>
                <td>${escapeHtml(tipoLectura)}</td>
                <td>${escapeHtml(observacion)}</td>
            </tr>
        `;
    }).join('');
}