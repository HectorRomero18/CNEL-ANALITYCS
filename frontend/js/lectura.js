/* ==========================================================================
   MÓDULO DE LECTURAS (lectura.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Obtener cliente almacenado globalmente
    const clienteActual = localStorage.getItem('clienteActual');

    // Actualizar la etiqueta del código en la cabecera
    const lblCodigo = document.getElementById("lbl-codigo-lectura");
    if (lblCodigo) {
        lblCodigo.innerText = clienteActual || '-';
    }

    // Actualizar el campo de búsqueda si existe en el DOM
    const inputCodigo = document.getElementById("codigoUsuario");
    if (inputCodigo && clienteActual) {
        inputCodigo.value = clienteActual;
    }

    // 2. Cargar datos de la sesión guardada
    const datosGuardados = sessionStorage.getItem('datosCliente');
    if (datosGuardados) {
        try {
            const data = JSON.parse(datosGuardados);
            renderLectura(data);
        } catch (error) {
            console.error("Error al parsear los datos guardados en sesión:", error);
        }
    }
});

/**
 * Renderiza la tabla de lecturas registradas.
 * @param {Object} data Objeto JSON devuelto por la API del backend.
 */
function renderLectura(data) {
    const tbody = document.getElementById("tbody-lectura");
    if (!tbody) return;

    const lecturasList = data.lecturas || data.lectura || [];

    // Si no se registran datos
    if (lecturasList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fa-solid fa-folder-open"></i>
                    No se encontraron registros de lecturas para este cliente.
                </td>
            </tr>`;
        return;
    }

    let htmlRows = '';

    lecturasList.forEach((item, index) => {
        const mecNumero = item.medidor || item.num_medidor || '-';
        const lecAnterior = item.lectura_anterior !== undefined ? item.lectura_anterior : '-';
        const lecActual = item.lectura_actual !== undefined ? item.lectura_actual : '-';
        const consumoKwh = item.consumo_kwh !== undefined ? item.consumo_kwh : (item.kwh || '-');
        const tipoLectura = item.tipo_lectura || item.tipo || 'REAL';

        // Badge para clase CSS segun el tipo (REAL / ESTIMADA)
        const tipoClass = tipoLectura.toUpperCase().includes('ESTIM') ? 'pendiente' : 'pagado';

        htmlRows += `
            <tr>
                <td>${String(index + 1).padStart(2, '0')}</td>
                <td>${item.fecha || item.fecha_lectura || '-'}</td>
                <td><strong>${mecNumero}</strong></td>
                <td>${lecAnterior}</td>
                <td><strong>${lecActual}</strong></td>
                <td><span class="badge-kwh">${consumoKwh} kWh</span></td>
                <td><span class="badge-estado ${tipoClass}">${tipoLectura.toUpperCase()}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = htmlRows;
}