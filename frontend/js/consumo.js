/* ==========================================================================
   MÓDULO DE CONSUMO (consumo.js)
   ========================================================================== */

let consumoChartInstance = null;
let consumosActuales = [];
let consumoAnioFiltrado = '';

/**
 * Renderiza la tabla de consumos y genera el gráfico dinámico con Chart.js.
 * @param {Object} data Objeto JSON retornado por la API del backend.
 */
function renderConsumo(data) {
    consumosActuales = data.consumos || [];
    const filtrosGuardados = leerFiltrosModulo('consumo');
    consumoAnioFiltrado = filtrosGuardados.anio || '';
    const filtroAnio = document.getElementById("filtro-anio-consumo");
    if (filtroAnio) {
        const anios = [...new Set(consumosActuales
            .map(item => obtenerAnioConsumo(item.periodo))
            .filter(Boolean))].sort((a, b) => b - a);
        filtroAnio.innerHTML = '<option value="">Todos los años</option>' +
            anios.map(anio => `<option value="${anio}">${anio}</option>`).join('');
        if (![...filtroAnio.options].some(option => option.value === consumoAnioFiltrado)) {
            consumoAnioFiltrado = '';
            guardarFiltrosModulo('consumo', { anio: '' });
        }
        filtroAnio.value = consumoAnioFiltrado;
    }
    actualizarBotonLimpiarConsumo();
    mostrarConsumoFiltrado(consumoAnioFiltrado);
}

function filtrarConsumoPorAnio(anio) {
    consumoAnioFiltrado = anio || '';
    guardarFiltrosModulo('consumo', { anio: consumoAnioFiltrado });
    actualizarBotonLimpiarConsumo();
    mostrarConsumoFiltrado(anio);
}

function actualizarBotonLimpiarConsumo() {
    const btn = document.getElementById('btn-limpiar-filtro-consumo');
    if (btn) btn.hidden = !consumoAnioFiltrado;
}

function limpiarFiltroConsumo() {
    consumoAnioFiltrado = '';
    const filtroAnio = document.getElementById('filtro-anio-consumo');
    if (filtroAnio) filtroAnio.value = '';
    guardarFiltrosModulo('consumo', { anio: '' });
    actualizarBotonLimpiarConsumo();
    mostrarConsumoFiltrado('');
}

function obtenerAnioConsumo(periodo) {
    const valor = displayValue(periodo, '');
    const anioInicial = valor.match(/^((?:19|20)\d{2})(?:\d{2}|[-/]|$)/);
    const anioSeparado = valor.match(/(?:^|[^\d])((?:19|20)\d{2})(?=$|[^\d])/);
    return anioInicial ? anioInicial[1] : (anioSeparado ? anioSeparado[1] : '');
}

function mostrarConsumoFiltrado(anio) {
    const tbody = document.getElementById("tbody-consumo");
    const canvasChart = document.getElementById("chartConsumo");

    const consumos = anio
        ? consumosActuales.filter(item => obtenerAnioConsumo(item.periodo) === anio)
        : consumosActuales;

    if (consumoChartInstance) {
        consumoChartInstance.destroy();
        consumoChartInstance = null;
    }

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