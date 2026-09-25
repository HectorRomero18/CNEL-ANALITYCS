let clienteActual = null;
let chartConsumosInstance = null;

// Control del menú de navegación lateral
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));

    const activeSec = document.getElementById(`sec-${sectionName}`);
    if (activeSec) activeSec.classList.add('active');

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// Búsqueda al pulsar Enter
function handleSearch(event) {
    if (event.key === 'Enter') {
        buscarCliente();
    }
}

// Búsqueda interactiva con SweetAlert2
async function buscarCliente() {
    const codigoInput = document.getElementById("codigoUsuario").value.trim();
    
    if (!codigoInput) {
        Swal.fire({
            icon: 'warning',
            title: 'Campo vacío',
            text: 'Por favor, ingrese un código de usuario o cliente.',
            confirmColor: '#6366F1'
        });
        return;
    }

    Swal.fire({
        title: 'Buscando cliente...',
        text: 'Consultando la base de datos',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch(`/api/clientes/${codigoInput}`);
        
        if (!response.ok) {
            const err = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'No encontrado',
                text: err.detail || 'No se encontraron registros para el código ingresado.',
                confirmColor: '#6366F1'
            });
            return;
        }

        const data = await response.json();
        clienteActual = codigoInput;

        // Rellenar etiquetas de código
        document.getElementById("lbl-codigo-1").innerText = codigoInput;
        document.getElementById("lbl-codigo-2").innerText = codigoInput;

        // Rellenar tablas con datos devueltos por la API
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

        // Renderizar gráfico si hay datos de consumo
        if (data.consumos && data.consumos.length > 0) {
            renderConsumoChart(data.consumos);
        }

        // Notificación Toast
        Swal.fire({
            icon: 'success',
            title: 'Cliente cargado',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error de comunicación',
            text: 'No se pudo conectar con el servidor backend.',
            confirmColor: '#6366F1'
        });
    }
}

// Render del gráfico
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

// Confirmación para exportar reporte
function exportarExcel() {
    if (!clienteActual) {
        Swal.fire({
            icon: 'info',
            title: 'Atención',
            text: 'Primero debe realizar la búsqueda de un cliente para exportar sus datos.',
            confirmColor: '#6366F1'
        });
        return;
    }

    Swal.fire({
        title: '¿Exportar información?',
        text: `Se descargará un reporte en Excel con los datos del cliente ${clienteActual}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#6366F1',
        cancelButtonColor: '#94A3B8',
        confirmButtonText: 'Sí, descargar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/api/export/excel/${clienteActual}`;
            
            Swal.fire({
                icon: 'success',
                title: 'Generando archivo',
                text: 'Su descarga comenzará en breve.',
                timer: 2000,
                showConfirmButton: false
            });
        }
    });
}

// Confirmación para cerrar sesión
function cerrarSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: '¿Está seguro de que desea salir del sistema CNEL Analytics?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#94A3B8',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Permanecer'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Sesión finalizada',
                text: 'Redirigiendo...',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.reload();
            });
        }
    });
}