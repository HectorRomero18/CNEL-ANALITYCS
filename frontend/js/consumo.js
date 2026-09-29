/* ==========================================================================
   MÓDULO DE CONSUMO (consumo.js)
   ========================================================================== */

let consumoChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Obtener cliente almacenado globalmente
    const clienteActual = localStorage.getItem('clienteActual');

    // Actualizar la etiqueta del código en la cabecera
    const lblCodigo = document.getElementById("lbl-codigo-consumo");
    if (lblCodigo) {
        lblCodigo.innerText = clienteActual || '-';
    }

    // Actualizar el campo de búsqueda principal si existe en el DOM
    const inputCodigo = document.getElementById("codigoUsuario");
    if (inputCodigo && clienteActual) {
        inputCodigo.value = clienteActual;
    }

    // 2. Cargar datos de la sesión guardada
    const datosGuardados = sessionStorage.getItem('datosCliente');
    if (datosGuardados) {
        try {
            const data = JSON.parse(datosGuardados);
            renderConsumo(data);
        } catch (error) {
            console.error("Error al parsear los datos guardados en sesión:", error);
        }
    }
});

/**
 * Renderiza la tabla de consumos y genera el gráfico dinámico con Chart.js.
 * @param {Object} data Objeto JSON retornado por la API del backend.
 */
function renderConsumo(data) {
    const tbody = document.getElementById("tbody-consumo");
    const canvasChart = document.getElementById("chartConsumo");

    const consumos = data.consumos || data.consumo || [];

    // 1. Renderizado de la Tabla
    if (tbody) {
        if (consumos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fa-solid fa-folder-open"></i>
                        No se encontraron registros de consumo para este cliente.
                    </td>
                </tr>`;
        } else {
            let htmlRows = '';
            consumos.forEach((item, index) => {
                const kwhVal = parseFloat(item.kwh || item.consumo || 0);
                const valorVal = parseFloat(item.valor || 0);

                htmlRows += `
                    <tr>
                        <td>${String(index + 1).padStart(2, '0')}</td>
                        <td>${item.fecha || item.periodo || '-'}</td>
                        <td><strong>${kwhVal.toLocaleString('es-EC')} kWh</strong></td>
                        <td>$${valorVal.toFixed(2)}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = htmlRows;
        }
    }

    // 2. Renderizado del Gráfico (Chart.js)
    if (canvasChart && consumos.length > 0) {
        const ctx = canvasChart.getContext('2d');

        // Destruir la instancia previa para evitar duplicación al recargar datos
        if (consumoChartInstance) {
            consumoChartInstance.destroy();
        }

        // Invertimos los datos para mostrarlos cronológicamente (pasado -> presente)
        const labels = consumos.map(c => c.periodo || c.fecha || '-').reverse();
        const values = consumos.map(c => parseFloat(c.kwh || c.consumo || 0)).reverse();

        consumoChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Consumo (kWh)',
                    data: values,
                    borderColor: '#6366F1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366F1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kWh'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Período'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
}