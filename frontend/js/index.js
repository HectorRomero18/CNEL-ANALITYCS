
/* ==========================================================================
   2. LÓGICA DEL DASHBOARD DE CONSULTAS (main.js / index.js)
   ========================================================================== */
let clienteActual = null;
const CLAVES_FILTROS_MODULOS = [
    'filtrosModulo_estado_cuenta',
    'filtrosModulo_lectura',
    'filtrosModulo_consumo'
];

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

function leerFiltrosModulo(modulo) {
    const clave = `filtrosModulo_${modulo}`;
    const guardados = sessionStorage.getItem(clave);
    if (!guardados) return {};

    try {
        const datos = JSON.parse(guardados);
        return datos.cliente === localStorage.getItem('clienteActual')
            ? datos.filtros || {}
            : {};
    } catch (error) {
        console.error(`No se pudieron restaurar los filtros de ${modulo}:`, error);
        sessionStorage.removeItem(clave);
        return {};
    }
}

function guardarFiltrosModulo(modulo, filtros) {
    sessionStorage.setItem(`filtrosModulo_${modulo}`, JSON.stringify({
        cliente: localStorage.getItem('clienteActual'),
        filtros
    }));
}

function applyClientData(data, codigo) {
    const clienteAnterior = localStorage.getItem('clienteActual');
    if (clienteAnterior && clienteAnterior !== codigo) {
        CLAVES_FILTROS_MODULOS.forEach(clave => sessionStorage.removeItem(clave));
    }
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

function obtenerModuloExportable() {
    const modulos = {
        '/estado-cuenta': 'estado_cuenta',
        '/lectura': 'lectura',
        '/consumo': 'consumo'
    };
    return modulos[window.location.pathname.replace(/\/$/, '')] || '';
}

function obtenerFiltrosPersistidosExportacion() {
    return {
        estado_cuenta: leerFiltrosModulo('estado_cuenta'),
        lectura: leerFiltrosModulo('lectura'),
        consumo: leerFiltrosModulo('consumo')
    };
}

function existenFiltrosExportacion(filtros) {
    return Object.values(filtros).some(modulo =>
        Object.values(modulo).some(valor => Boolean(valor))
    );
}

async function seleccionarFormatoExportacion() {
    const resultado = await Swal.fire({
        title: '¿Cómo desea descargar los datos?',
        text: 'Seleccione el formato del archivo.',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: '#6366F1',
        denyButtonColor: '#DC2626',
        cancelButtonColor: '#94A3B8',
        confirmButtonText: 'Excel',
        denyButtonText: 'PDF',
        cancelButtonText: 'Cancelar'
    });

    if (resultado.isConfirmed) return 'excel';
    if (resultado.isDenied) return 'pdf';
    return '';
}

function descargarExcelCompleto(filtros, incluirFiltrados) {
    if (typeof XLSX === 'undefined') {
        throw new Error('No se pudo cargar el generador de archivos Excel.');
    }
    const storedData = sessionStorage.getItem('datosCliente');
    if (!storedData) {
        throw new Error('No hay información de cliente disponible para generar el Excel.');
    }

    const data = JSON.parse(storedData);
    const secciones = obtenerSeccionesReporte(data, filtros, incluirFiltrados);
    const nombres = {
        'INFORMACIÓN GENERAL DEL CLIENTE': 'Datos Personales',
        'ESTADO DE CUENTA': 'Estado de Cuenta',
        'ESTADO SICO': 'Estado SICO',
        'CONSUMOS': 'Consumos',
        'LECTURAS': 'Lecturas'
    };
    const workbook = XLSX.utils.book_new();
    secciones.forEach(seccion => {
        const cantidadColumnas = seccion.headers.length;
        const ultimaColumna = XLSX.utils.encode_col(cantidadColumnas - 1);
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['CORPORACION NACIONAL DE ELECTRICIDAD CNEL EP'],
            [`Código del cliente: ${clienteActual}`],
            [],
            [seccion.title],
            seccion.headers,
            ...seccion.rows
        ]);
        const celdasTitulo = `A1:${ultimaColumna}1`;
        const celdasCodigo = `A2:${ultimaColumna}2`;
        const celdasSeccion = `A4:${ultimaColumna}4`;
        worksheet['!merges'] = [
            XLSX.utils.decode_range(celdasTitulo),
            XLSX.utils.decode_range(celdasCodigo),
            XLSX.utils.decode_range(celdasSeccion)
        ];
        worksheet['!autofilter'] = {
            ref: `A5:${ultimaColumna}${Math.max(5, seccion.rows.length + 5)}`
        };
        worksheet['!rows'] = [
            { hpt: 27 },
            { hpt: 21 },
            { hpt: 8 },
            { hpt: 23 },
            { hpt: 32 }
        ];
        worksheet['!cols'] = seccion.headers.map((header, columnIndex) => {
            const anchoDatos = seccion.rows.reduce((ancho, row) =>
                Math.max(ancho, String(row[columnIndex] ?? '').length), 0);
            return { wch: Math.min(38, Math.max(14, String(header).length + 3, anchoDatos + 2)) };
        });
        worksheet['!pageSetup'] = {
            orientation: 'landscape',
            fitToWidth: 1,
            fitToHeight: 0
        };

        const estiloTitulo = {
            font: { name: 'Arial', sz: 15, bold: true, color: { rgb: '243B64' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        const estiloCodigo = {
            font: { name: 'Arial', sz: 10, color: { rgb: '505A69' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        const estiloSeccion = {
            font: { name: 'Arial', sz: 12, bold: true, color: { rgb: '243B64' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'E8EEF7' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        const estiloCelda = {
            top: { style: 'thin', color: { rgb: 'D8E0EC' } },
            bottom: { style: 'thin', color: { rgb: 'D8E0EC' } },
            left: { style: 'thin', color: { rgb: 'D8E0EC' } },
            right: { style: 'thin', color: { rgb: 'D8E0EC' } }
        };

        worksheet.A1.s = estiloTitulo;
        worksheet.A2.s = estiloCodigo;
        worksheet.A4.s = estiloSeccion;
        seccion.headers.forEach((_, columnIndex) => {
            const direccion = `${XLSX.utils.encode_col(columnIndex)}5`;
            worksheet[direccion].s = {
                font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
                fill: { patternType: 'solid', fgColor: { rgb: '243B64' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: estiloCelda
            };
        });
        seccion.rows.forEach((row, rowIndex) => {
            row.forEach((_, columnIndex) => {
                const direccion = `${XLSX.utils.encode_col(columnIndex)}${rowIndex + 6}`;
                worksheet[direccion].s = {
                    font: { name: 'Arial', sz: 10, color: { rgb: '243B64' } },
                    fill: {
                        patternType: 'solid',
                        fgColor: { rgb: rowIndex % 2 === 0 ? 'F1F5FB' : 'FFFFFF' }
                    },
                    alignment: { vertical: 'center', wrapText: true },
                    border: estiloCelda
                };
            });
            worksheet['!rows'][rowIndex + 5] = { hpt: 20 };
        });
        XLSX.utils.book_append_sheet(workbook, worksheet, nombres[seccion.title]);
    });
    const codigoArchivo = String(clienteActual).replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `CNEL_Analytics_${codigoArchivo}.xlsx`);
}

function cargarLogoPdf() {
    return new Promise((resolve, reject) => {
        const imagen = new Image();
        imagen.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = imagen.naturalWidth;
            canvas.height = imagen.naturalHeight;
            const contexto = canvas.getContext('2d');
            contexto.drawImage(imagen, 0, 0);
            resolve({
                data: canvas.toDataURL('image/png'),
                width: imagen.naturalWidth,
                height: imagen.naturalHeight
            });
        };
        imagen.onerror = () => reject(new Error('No se pudo cargar el logo CNEL para el PDF.'));
        imagen.src = '/static/img/logo.png';
    });
}

function obtenerAnioExportacion(fecha) {
    const valor = displayValue(fecha, '');
    const anioAlInicio = valor.match(/^((?:19|20)\d{2})(?:\d{2}|[-/]|$)/);
    const anioSeparado = valor.match(/(?:^|[^\d])((?:19|20)\d{2})(?=$|[^\d])/);
    return anioAlInicio ? anioAlInicio[1] : (anioSeparado ? anioSeparado[1] : '');
}

function filtrarFilasExportacion(filas, filtro, campoFecha, campoTipo) {
    return (filas || []).filter(fila => {
        const coincideAnio = !filtro.anio || obtenerAnioExportacion(fila[campoFecha]) === filtro.anio;
        const coincideTipo = !filtro.tipo || String(fila[campoTipo] ?? '').trim() === String(filtro.tipo).trim();
        return coincideAnio && coincideTipo;
    });
}

function obtenerTextoTipoLectura(fila) {
    return displayValue(fila.tipo_lectura_desc, fila.tp_lectura || 'Sin tipo');
}

function obtenerSeccionesReporte(data, filtros, incluirFiltrados) {
    const account = incluirFiltrados
        ? filtrarFilasExportacion(data.estado_cuenta, filtros.estado_cuenta, 'fecha', 'tipo_evento')
        : data.estado_cuenta || [];
    const consumption = incluirFiltrados && filtros.consumo.anio
        ? (data.consumos || []).filter(row => obtenerAnioExportacion(row.periodo) === filtros.consumo.anio)
        : data.consumos || [];
    const readings = incluirFiltrados
        ? (data.lecturas || []).filter(row => {
            const coincideAnio = !filtros.lectura.anio ||
                obtenerAnioExportacion(row.fx_tomalec) === filtros.lectura.anio;
            const coincideTipo = !filtros.lectura.tipo ||
                [row.tp_lectura, row.tipo_lectura_desc, `${row.tipo_lectura_desc || ''} (${row.tp_lectura || ''})`]
                    .some(tipo => String(tipo ?? '').trim() === String(filtros.lectura.tipo).trim());
            return coincideAnio && coincideTipo;
        })
        : data.lecturas || [];

    return [
        {
            title: 'INFORMACIÓN GENERAL DEL CLIENTE',
            headers: ['Campo', 'Valor'],
            rows: Object.entries(data.datos_personales || {}).map(([campo, valor]) => [
                obtenerEtiquetaExportacion(campo),
                displayValue(valor)
            ])
        },
        {
            title: 'ESTADO DE CUENTA',
            headers: ['Fecha', 'Tipo de evento', 'Código de evento', 'Factura', 'Valor', 'Saldo'],
            rows: account.map(row => [
                displayDate(row.fecha), row.tipo_evento, row.codigo_evento, row.factura, row.valor, row.saldo
            ].map(valor => displayValue(valor)))
        },
        {
            title: 'ESTADO SICO',
            headers: ['Fecha', 'Estado SICO', 'Código de evento', 'Factura', 'Valor', 'Saldo'],
            rows: (data.estado_sico || []).map(row => [
                row.fecha, row.estado_sico, row.codigo_evento, row.factura, row.valor, row.saldo
            ].map(valor => displayValue(valor)))
        },
        {
            title: 'CONSUMOS',
            headers: ['Período', 'Energía activa (kWh)', 'Energía reactiva (kvarh)', 'Días facturados'],
            rows: consumption.map(row => [
                row.periodo, row.kwh, row.kwh_reactiva, row.dias_facturados
            ].map(valor => displayValue(valor)))
        },
        {
            title: 'LECTURAS',
            headers: [
                'Código de cliente', 'Medidor', 'Fecha de lectura', 'Lectura anterior',
                'Lectura tomada', 'Lectura facturada', 'Consumo calculado (kWh)',
                'Código de tipo de lectura', 'Tipo de lectura', 'Código de observación',
                'Observación', 'Tipo de registro'
            ],
            rows: readings.map(row => [
                row.cx_cliente, row.cx_nummed, displayDate(row.fx_tomalec), row.qx_ultlec,
                row.qx_tomalec, row.qx_factlec, row.consumo_kwh, row.tp_lectura,
                row.tipo_lectura_desc, row.cx_observa, row.observacion_desc, row.cx_tipo
            ].map(valor => displayValue(valor)))
        }
    ];
}

function obtenerEtiquetaExportacion(campo) {
    const etiquetas = {
        codigo_cliente: 'Código de cliente',
        nombre: 'Nombre',
        cedula: 'Cédula',
        fecha_instalacion: 'Fecha de instalación',
        direccion: 'Dirección',
        telefono: 'Teléfono',
        medidor: 'Medidor',
        marca: 'Marca',
        serie: 'Serie',
        modelo_medidor: 'Modelo del medidor',
        consumo_promedio: 'Consumo promedio (kWh)',
        meses_deuda: 'Meses de deuda',
        deuda_sap: 'Deuda SAP',
        deuda_convenio: 'Deuda del convenio',
        num_partes_convenio: 'Partes del convenio',
        fecha_convenio: 'Fecha del convenio',
        obs_convenio: 'Observación del convenio'
    };
    return etiquetas[campo] || campo.replace(/_/g, ' ').replace(/^./, letra => letra.toUpperCase());
}

function dibujarEncabezadoPdf(pdf, logo, logoWidth, logoHeight) {
    const margenIzquierdo = 14;
    const centroX = pdf.internal.pageSize.getWidth() / 2;
    pdf.addImage(logo.data, 'PNG', margenIzquierdo, 8, logoWidth, logoHeight);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(36, 59, 100);
    pdf.text('CORPORACION NACIONAL DE ELECTRICIDAD CNEL EP', centroX, 14, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(80, 90, 105);
    pdf.text(`Código del cliente: ${clienteActual}`, centroX, 22, { align: 'center' });
}

async function descargarPdfCompleto(filtros, incluirFiltrados) {
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
        throw new Error('No se pudo cargar el generador de archivos PDF.');
    }

    const storedData = sessionStorage.getItem('datosCliente');
    if (!storedData) {
        throw new Error('No hay información de cliente disponible para generar el PDF.');
    }
    const data = JSON.parse(storedData);
    const pdf = new jsPDF({ orientation: 'landscape' });
    if (typeof pdf.autoTable !== 'function') {
        throw new Error('No se pudo cargar el complemento para generar tablas PDF.');
    }

    const logo = await cargarLogoPdf();
    const logoHeight = 12;
    const logoWidth = Math.min(logo.width / logo.height * logoHeight, 30);
    const secciones = obtenerSeccionesReporte(data, filtros, incluirFiltrados);
    const margenIzquierdo = 14;
    const margenSuperior = 34;

    pdf.setProperties({ title: `CNEL Analytics - Cliente ${clienteActual}` });

    let posicionY = margenSuperior;
    secciones.forEach(seccion => {
        if (posicionY > pdf.internal.pageSize.getHeight() - 26) {
            pdf.addPage();
            posicionY = margenSuperior;
        }
        dibujarEncabezadoPdf(pdf, logo, logoWidth, logoHeight);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(36, 59, 100);
        pdf.text(seccion.title, pdf.internal.pageSize.getWidth() / 2, posicionY, { align: 'center' });
        pdf.autoTable({
            head: [seccion.headers],
            body: seccion.rows.length
                ? seccion.rows
                : [{ content: 'Sin registros', colSpan: seccion.headers.length, styles: { halign: 'center' } }],
            startY: posicionY + 4,
            margin: { top: margenSuperior, right: margenIzquierdo, bottom: 14, left: margenIzquierdo },
            styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [36, 59, 100], halign: 'center', fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [241, 245, 251] },
            didDrawPage: () => dibujarEncabezadoPdf(pdf, logo, logoWidth, logoHeight)
        });
        posicionY = pdf.lastAutoTable.finalY + 12;
    });

    const codigoArchivo = String(clienteActual).replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`CNEL_Analytics_${codigoArchivo}.pdf`);
}

async function exportarDatosModulo(modulo) {
    const filtros = obtenerFiltrosPersistidosExportacion();
    let incluirFiltrados = existenFiltrosExportacion(filtros);
    if (incluirFiltrados) {
        const resultado = await Swal.fire({
            title: '¿Qué datos desea exportar?',
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#6366F1',
            denyButtonColor: '#0F766E',
            cancelButtonColor: '#94A3B8',
            confirmButtonText: 'Exportar datos filtrados',
            denyButtonText: 'Exportar todo',
            cancelButtonText: 'Cancelar'
        });
        if (resultCancelled(resultado)) return;
        incluirFiltrados = resultado.isConfirmed;
    }

    const formato = await seleccionarFormatoExportacion();
    if (!formato) return;

    try {
        if (formato === 'excel') {
            descargarExcelCompleto(filtros, incluirFiltrados);
        } else {
            await descargarPdfCompleto(filtros, incluirFiltrados);
        }
    } catch (error) {
        console.error('Error al exportar los datos:', error);
        Swal.fire({
            icon: 'error',
            title: 'No se pudo exportar',
            text: error.message || 'Ocurrió un error al generar el archivo.',
            confirmButtonColor: '#6366F1'
        });
    }
}

function resultCancelled(resultado) {
    return !resultado.isConfirmed && !resultado.isDenied;
}

// Confirmación para exportar reporte
async function exportarExcel() {
    if (!clienteActual) {
        Swal.fire({
            icon: 'info',
            title: 'Atención',
            text: 'Primero debe realizar la búsqueda de un cliente para exportar sus datos.',
            confirmColor: '#6366F1'
        });
        return;
    }

    const modulo = obtenerModuloExportable();
    if (modulo) {
        await exportarDatosModulo(modulo);
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