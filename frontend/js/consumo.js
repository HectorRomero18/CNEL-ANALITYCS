/* ==========================================================================
   MÓDULO DE CONSUMO (consumo.js)
   ========================================================================== */

let consumoChartInstance = null;

/**
 * Renderiza la tabla de consumos y genera el gráfico dinámico con Chart.js.
 * @param {Object} data Objeto JSON retornado por la API del backend.
 */
function renderConsumo(data) {
    const tbody = document.getElementById("tbody-consumo");
    const canvasChart = document.getElementById("chartConsumo");

    const consumos = data.consumos || [];

    // 1. Renderizado de la Tabla
    if (tbody) {
        if (consumos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No se encontraron consumos para este cliente.</td></tr>';
        } else {
            tbody.innerHTML = consumos.map((item, index) => `
                    <tr>
                        <td>${String(index + 1).padStart(2, '0')}</td>
                        <td>${escapeHtml(displayValue(item.periodo))}</td>
                        <td><strong>${escapeHtml(displayValue(item.kwh))}</strong></td>
                        <td>${escapeHtml(displayValue(item.kwh_reactiva))}</td>
                        <td>${escapeHtml(displayValue(item.dias_facturados))}</td>
                    </tr>
                `).join('');
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
        const labels = consumos.map(c => c.periodo || '-').reverse();
        const values = consumos.map(c => Number(c.kwh ?? 0)).reverse();

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