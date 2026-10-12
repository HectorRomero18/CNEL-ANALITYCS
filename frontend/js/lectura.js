let lecturasActuales = [];
let lecturasFiltros = { anio: '', tipo: '' };

function obtenerTiposLectura() {
    const tiposMap = new Map();

    lecturasActuales.forEach(item => {
        const tipoRaw = displayValue(item.tp_lectura, '').trim();
        const tipoDesc = displayValue(item.tipo_lectura_desc, '').trim();

        const entradas = [];
        if (tipoRaw) {
            const label = tipoDesc || tipoRaw;
            entradas.push({ value: tipoRaw, label });
        } else if (tipoDesc) {
            entradas.push({ value: tipoDesc, label: tipoDesc });
        }

        entradas.forEach(entrada => {
            if (!tiposMap.has(entrada.value)) {
                tiposMap.set(entrada.value, entrada.label);
            }
        });
    });

    return [...tiposMap.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function inicializarFiltrosLectura() {
    const btn = document.getElementById('btn-filtro-lectura');
    const panel = document.getElementById('panel-filtro-lectura');
    if (!btn || !panel || btn.dataset.bound === 'true') return;

    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
        const isHidden = panel.hasAttribute('hidden');
        panel.hidden = !isHidden;
        btn.setAttribute('aria-expanded', String(!isHidden));
    });

    document.addEventListener('click', (event) => {
        if (!panel.contains(event.target) && !btn.contains(event.target)) {
            panel.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        }
    });
}

function resetearFiltrosLectura() {
    lecturasFiltros = leerFiltrosModulo('lectura');
    const filtroAnio = document.getElementById('filtro-anio-lectura');
    const filtroTipo = document.getElementById('filtro-tipo-lectura');
    const panel = document.getElementById('panel-filtro-lectura');
    if (filtroAnio) {
        filtroAnio.value = [...filtroAnio.options].some(option => option.value === lecturasFiltros.anio)
            ? lecturasFiltros.anio
            : '';
    }
    if (filtroTipo) {
        filtroTipo.value = [...filtroTipo.options].some(option => option.value === lecturasFiltros.tipo)
            ? lecturasFiltros.tipo
            : '';
    }
    lecturasFiltros = {
        anio: filtroAnio ? filtroAnio.value : '',
        tipo: filtroTipo ? filtroTipo.value : ''
    };
    if (panel) panel.hidden = true;
    const btn = document.getElementById('btn-filtro-lectura');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    actualizarBotonLimpiarLectura();
}

function renderLectura(data) {
    lecturasActuales = data.lecturas || [];
    inicializarFiltrosLectura();

    const filtroAnio = document.getElementById('filtro-anio-lectura');
    if (filtroAnio) {
        const anios = [...new Set(lecturasActuales
            .map(item => obtenerAnioLectura(item.fx_tomalec))
            .filter(Boolean))].sort((a, b) => b - a);
        filtroAnio.innerHTML = '<option value="">Todos los años</option>' +
            anios.map(anio => `<option value="${escapeHtml(anio)}">${escapeHtml(anio)}</option>`).join('');
    }

    const filtroTipo = document.getElementById('filtro-tipo-lectura');
    if (filtroTipo) {
        const tipos = obtenerTiposLectura();
        filtroTipo.innerHTML = '<option value="">Todos los tipos</option>' +
            tipos.map(tipo => `<option value="${escapeHtml(tipo.value)}">${escapeHtml(tipo.label)}</option>`).join('');
    }

    resetearFiltrosLectura();
    mostrarLecturasFiltradas(lecturasFiltros.anio, lecturasFiltros.tipo);
}

function aplicarFiltrosLectura() {
    const filtroAnio = document.getElementById('filtro-anio-lectura');
    const filtroTipo = document.getElementById('filtro-tipo-lectura');
    lecturasFiltros = {
        anio: filtroAnio ? filtroAnio.value : '',
        tipo: filtroTipo ? filtroTipo.value : ''
    };
    guardarFiltrosModulo('lectura', lecturasFiltros);
    actualizarBotonLimpiarLectura();
    mostrarLecturasFiltradas(lecturasFiltros.anio, lecturasFiltros.tipo);

    const panel = document.getElementById('panel-filtro-lectura');
    const btn = document.getElementById('btn-filtro-lectura');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function actualizarBotonLimpiarLectura() {
    const btn = document.getElementById('btn-limpiar-filtro-lectura');
    if (btn) {
        btn.hidden = !Object.values(lecturasFiltros).some(Boolean);
    }
}

function limpiarFiltrosLectura() {
    lecturasFiltros = { anio: '', tipo: '' };
    const filtroAnio = document.getElementById('filtro-anio-lectura');
    const filtroTipo = document.getElementById('filtro-tipo-lectura');
    if (filtroAnio) filtroAnio.value = '';
    if (filtroTipo) filtroTipo.value = '';
    guardarFiltrosModulo('lectura', lecturasFiltros);
    actualizarBotonLimpiarLectura();
    const panel = document.getElementById('panel-filtro-lectura');
    const btn = document.getElementById('btn-filtro-lectura');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    mostrarLecturasFiltradas();
}

function filtrarLecturasPorAnio(anio) {
    mostrarLecturasFiltradas(anio, lecturasFiltros.tipo);
}

function obtenerAnioLectura(fecha) {
    const valor = displayValue(fecha, '');
    const anioInicial = valor.match(/^((?:19|20)\d{2})(?:\d{2}|[-/]|$)/);
    const anioSeparado = valor.match(/(?:^|[^\d])((?:19|20)\d{2})(?=$|[^\d])/);
    return anioInicial ? anioInicial[1] : (anioSeparado ? anioSeparado[1] : '');
}

function mostrarLecturasFiltradas(anio = '', tipo = '') {
    const tbody = document.getElementById('tbody-lectura');
    if (!tbody) return;

    const lecturasList = obtenerLecturasFiltradas(anio, tipo);

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

function obtenerLecturasFiltradas(anio = '', tipo = '') {
    return lecturasActuales.filter(item => {
        const itemAnio = obtenerAnioLectura(item.fx_tomalec);
        const itemTipoRaw = displayValue(item.tp_lectura, '').trim();
        const itemTipoDesc = displayValue(item.tipo_lectura_desc, '').trim();
        const itemTipoLabel = itemTipoRaw && itemTipoDesc && itemTipoRaw !== itemTipoDesc
            ? `${itemTipoDesc} (${itemTipoRaw})`
            : (itemTipoDesc || itemTipoRaw || 'Sin tipo');
        const matchesYear = !anio || itemAnio === anio;
        const matchesType = !tipo || [itemTipoRaw, itemTipoDesc, itemTipoLabel].includes(tipo);
        return matchesYear && matchesType;
    });
}
