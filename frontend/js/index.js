
/* ==========================================================================
   2. LÓGICA DEL DASHBOARD DE CONSULTAS (main.js / index.js)
   ========================================================================== */
let clienteActual = null;

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function displayValue(value, fallback = '-') {
    if (value === null || value === undefined || String(value).trim() === '') {
        return fallback;
    }
    return String(value).trim();
}

function displayDate(value) {
    const date = displayValue(value, '');
    return date ? date.split('T')[0] : '-';
}

function setText(id, value, fallback = '-') {
    const element = document.getElementById(id);
    if (element) element.textContent = displayValue(value, fallback);
}

function applyClientData(data, codigo) {
    clienteActual = codigo;
    localStorage.setItem('clienteActual', codigo);
    sessionStorage.setItem('datosCliente', JSON.stringify(data));
    const searchInput = document.getElementById('codigoUsuario');
    if (searchInput) searchInput.value = codigo;

    ['lbl-codigo-1', 'lbl-codigo-2', 'lbl-codigo-3', 'lbl-codigo-4',
        'lbl-codigo-estcta', 'lbl-codigo-sico', 'lbl-codigo-consumo',
        'lbl-codigo-lectura'].forEach(id => setText(id, codigo));

    const cliente = data.datos_personales || {};
    setText('val-nombre', cliente.nombre);
    setText('val-cedula', cliente.cedula);
    setText('val-fecha-inst', displayDate(cliente.fecha_instalacion));
    setText('val-direccion', cliente.direccion);
    setText('val-telefono', cliente.telefono);
    setText('val-consumo-promedio', cliente.consumo_promedio);
    setText('val-deuda-sico', cliente.deuda_sico, 'Sin campo confirmado en la BD externa');
    setText('val-medidor', cliente.medidor);
    setText('val-marca', cliente.marca);
    setText('val-serie', cliente.serie);
    setText('val-modelo-medidor', cliente.modelo_medidor);
    setText('val-meses-deuda', cliente.meses_deuda);
    setText('val-deuda-sap', cliente.deuda_sap);

    if (typeof renderInfoCliente === 'function') renderInfoCliente(data);
    if (typeof renderEstadoCuenta === 'function') renderEstadoCuenta(data);
    if (typeof renderEstctaSico === 'function') renderEstctaSico(data);
    if (typeof renderConsumo === 'function') renderConsumo(data);
    if (typeof renderLectura === 'function') renderLectura(data);
}

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

// Búsqueda al pulsar la tecla Enter
function handleSearch(event) {
    if (event.key === 'Enter') {
        buscarCliente();
    }
}

// Búsqueda interactiva con SweetAlert2 y Bearer Token
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
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/clientes/${codigoInput}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Si la sesión expiró o el token no es válido, expulsar al login
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/';
                return;
            }

            const responseText = await response.text();
            let errorDetail = `Error HTTP ${response.status}`;
            try {
                const errorData = JSON.parse(responseText);
                errorDetail = errorData.detail || errorDetail;
            } catch {
                if (responseText) errorDetail = responseText;
            }
            Swal.fire({
                icon: 'error',
                title: 'No encontrado',
                text: errorDetail,
                confirmColor: '#6366F1'
            });
            return;
        }

        const data = await response.json();
        applyClientData(data, codigoInput);

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
        let errorMessage = 'No se pudo conectar con el servidor backend.';

        if (error instanceof TypeError && error.message.includes('fetch')) {
            errorMessage = 'Error de red: Verifique que el backend esté ejecutándose y la VPN/conexión a la base de datos esté activa.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        Swal.fire({
            icon: 'error',
            title: 'Error de comunicación',
            text: errorMessage,
            confirmColor: '#6366F1'
        });
    }
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

async function cerrarSesion(event) {
    if (event) event.preventDefault();

    const confirmar = await Swal.fire({
        title: '¿Cerrar sesión?',
        text: '¿Está seguro de que desea salir del sistema CNEL Analytics?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#94A3B8',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Permanecer'
    });

    if (!confirmar.isConfirmed) {
        return;
    }

    try {
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax';
        window.location.replace('/');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Obtener los datos del usuario guardados en localStorage
    const userStr = localStorage.getItem("user") || localStorage.getItem("usuario");
    const userNameElement = document.getElementById("userName");

    if (userNameElement) {
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                userNameElement.innerText = userObj.username || userObj.primer_nombre || userObj.nombre || 'Usuario';
            } catch (e) {
                userNameElement.innerText = userStr; // Si solo se guardó un string directo
            }
        }
    }

    const storedData = sessionStorage.getItem('datosCliente');
    const storedCode = localStorage.getItem('clienteActual');
    const initialData = window.initialClienteData;
    if (initialData) {
        applyClientData(initialData, initialData.datos_personales.codigo_cliente);
    } else if (storedData && storedCode) {
        try {
            applyClientData(JSON.parse(storedData), storedCode);
            const input = document.getElementById('codigoUsuario');
            if (input) input.value = storedCode;
        } catch (error) {
            console.error('No se pudieron restaurar los datos del cliente:', error);
        }
    }
});