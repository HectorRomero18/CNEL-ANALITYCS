let clienteActual = null;
let chartConsumosInstance = null;

// Cambiar de sección al hacer clic en los botones laterales
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));

    const activeSec = document.getElementById(`sec-${sectionName}`);
    if(activeSec) activeSec.classList.add('active');

    event.currentTarget.classList.add('active');
}

// Búsqueda al presionar ENTER
function handleSearch(event) {
    if (event.key === 'Enter') {
        buscarCliente();
    }
}

async function buscarCliente() {
    const codigoInput = document.getElementById("codigoUsuario").value.trim();
    if (!codigoInput) {
        alert("Por favor, ingrese un código de usuario/cliente.");
        return;
    }

    try {
        const response = await fetch(`/api/clientes/${codigoInput}`);
        if (!response.ok) {
            const err = await response.json();
            alert(err.detail || "Cliente no encontrado.");
            return;
        }

        const data = await response.json();
        clienteActual = codigoInput;

        // Actualizar etiquetas de código
        document.getElementById("lbl-codigo-1").innerText = codigoInput;
        document.getElementById("lbl-codigo-2").innerText = codigoInput;

        // Cargar Datos Personales
        const dp = data.datos_personales || {};
        document.getElementById("val-nombre").innerText = dp.nombre || '-';
        document.getElementById("val-cedula").innerText = dp.cedula || '-';
        document.getElementById("val-fecha-inst").innerText = dp.fecha_instalacion || '-';
        document.getElementById("val-direccion").innerText = dp.direccion || '-';
        document.getElementById("val-deuda-sico").innerText = dp.deuda_sico || '-';

        document.getElementById("val-medidor").innerText = dp.medidor || '-';
        document.getElementById("val-marca").innerText = dp.marca || '-';
        document.getElementById("val-serie").innerText = dp.serie || '-';
        document.getElementById("val-meses-deuda").innerText = dp.meses_deuda || '-';
        document.getElementById("val-deuda-sap").innerText = dp.deuda_sap || '-';

        // Cargar Gráfico de Consumos
        if (data.consumos && data.consumos.length > 0) {
            renderConsumoChart(data.consumos);
        }

    } catch (error) {
        console.error(error);
        alert("Error de conexión con el servidor.");
    }
}

function renderConsumoChart(consumos) {
    const ctx = document.getElementById('chartConsumo').getContext('2d');
    if (chartConsumosInstance) chartConsumosInstance.destroy();

    const labels = consumos.map(c => c.periodo).reverse();
    const values = consumos.map(c => c.kwh).reverse();

    chartConsumosInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consumo (kWh)',
                data: values,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.3
            }]
        }
    });
}

function exportarExcel() {
    if (!clienteActual) {
        alert("Primero debe buscar un cliente.");
        return;
    }
    window.location.href = `/api/export/excel/${clienteActual}`;
}

function cerrarSesion() {
    alert("Sesión cerrada.");
    window.location.reload();
}