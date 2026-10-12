let movimientosEstadoCuenta = [];
let filtrosEstadoCuentaAplicados = { anio: '', tipo: '' };

function getTipoEventoLabel(tipoEvento) {
    const valor = displayValue(tipoEvento, '').trim();
    if (!valor) return 'Sin tipo';
    const codigo = String(valor).toUpperCase();
    if (codigo === 'F') return 'Factura (F)';
    if (codigo === 'P') return 'Pago (P)';
    return valor;
}

function inicializarFiltrosEstadoCuenta() {
    const btn = document.getElementById('btn-filtro-estado-cuenta');
    const panel = document.getElementById('panel-filtro-estado-cuenta');
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

function resetearFiltrosEstadoCuenta() {
    filtrosEstadoCuentaAplicados = leerFiltrosModulo('estado_cuenta');
    const filtroAnio = document.getElementById('filtro-anio-estado-cuenta');
    const filtroTipo = document.getElementById('filtro-tipo-estado-cuenta');
    const panel = document.getElementById('panel-filtro-estado-cuenta');
    if (filtroAnio) {
        filtroAnio.value = [...filtroAnio.options].some(option => option.value === filtrosEstadoCuentaAplicados.anio)
            ? filtrosEstadoCuentaAplicados.anio
            : '';
    }
    if (filtroTipo) {
        filtroTipo.value = [...filtroTipo.options].some(option => option.value === filtrosEstadoCuentaAplicados.tipo)
            ? filtrosEstadoCuentaAplicados.tipo
            : '';
    }
    filtrosEstadoCuentaAplicados = {
        anio: filtroAnio ? filtroAnio.value : '',
        tipo: filtroTipo ? filtroTipo.value : ''
    };
    if (panel) panel.hidden = true;
    const btn = document.getElementById('btn-filtro-estado-cuenta');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    actualizarBotonLimpiarEstadoCuenta();
}

function renderEstadoCuenta(data) {
    movimientosEstadoCuenta = data.estado_cuenta || [];
    inicializarFiltrosEstadoCuenta();

    const filtroAnio = document.getElementById('filtro-anio-estado-cuenta');
    const filtroTipo = document.getElementById('filtro-tipo-estado-cuenta');

    if (filtroAnio) {
        const anios = [...new Set(movimientosEstadoCuenta
            .map(item => obtenerAnioEstadoCuenta(item.fecha))
            .filter(Boolean))].sort((a, b) => b - a);
        filtroAnio.innerHTML = '<option value="">Todos los años</option>' +
            anios.map(anio => `<option value="${anio}">${anio}</option>`).join('');
    }

    if (filtroTipo) {
        const tipos = [...new Set(movimientosEstadoCuenta
            .map(item => String(item.tipo_evento || '').trim())
            .filter(Boolean))].sort();
        filtroTipo.innerHTML = '<option value="">Todos los tipos</option>' +
            tipos.map(tipo => `<option value="${escapeHtml(tipo)}">${escapeHtml(getTipoEventoLabel(tipo))}</option>`).join('');
    }

    resetearFiltrosEstadoCuenta();
    mostrarEstadoCuentaFiltrado(filtrosEstadoCuentaAplicados.anio, filtrosEstadoCuentaAplicados.tipo);
}

function aplicarFiltrosEstadoCuenta() {
    const filtroAnio = document.getElementById('filtro-anio-estado-cuenta');
    const filtroTipo = document.getElementById('filtro-tipo-estado-cuenta');
    filtrosEstadoCuentaAplicados = {
        anio: filtroAnio ? filtroAnio.value : '',
        tipo: filtroTipo ? filtroTipo.value : ''
    };
    guardarFiltrosModulo('estado_cuenta', filtrosEstadoCuentaAplicados);
    actualizarBotonLimpiarEstadoCuenta();
    mostrarEstadoCuentaFiltrado(
        filtrosEstadoCuentaAplicados.anio,
        filtrosEstadoCuentaAplicados.tipo
    );

    const panel = document.getElementById('panel-filtro-estado-cuenta');
    const btn = document.getElementById('btn-filtro-estado-cuenta');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function actualizarBotonLimpiarEstadoCuenta() {
    const btn = document.getElementById('btn-limpiar-filtro-estado-cuenta');
    if (btn) {
        btn.hidden = !Object.values(filtrosEstadoCuentaAplicados).some(Boolean);
    }
}

function limpiarFiltrosEstadoCuenta() {
    filtrosEstadoCuentaAplicados = { anio: '', tipo: '' };
    const filtroAnio = document.getElementById('filtro-anio-estado-cuenta');
    const filtroTipo = document.getElementById('filtro-tipo-estado-cuenta');
    if (filtroAnio) filtroAnio.value = '';
    if (filtroTipo) filtroTipo.value = '';
    guardarFiltrosModulo('estado_cuenta', filtrosEstadoCuentaAplicados);
    actualizarBotonLimpiarEstadoCuenta();
    const panel = document.getElementById('panel-filtro-estado-cuenta');
    const btn = document.getElementById('btn-filtro-estado-cuenta');
    if (panel) panel.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    mostrarEstadoCuentaFiltrado();
}

function obtenerAnioEstadoCuenta(fecha) {
    const valor = displayValue(fecha, '');
    const anioInicial = valor.match(/^((?:19|20)\d{2})(?:\d{2}|[-/]|$)/);
    const anioSeparado = valor.match(/(?:^|[^\d])((?:19|20)\d{2})(?=$|[^\d])/);
    return anioInicial ? anioInicial[1] : (anioSeparado ? anioSeparado[1] : '');
}

function mostrarEstadoCuentaFiltrado(anio = '', tipo = '') {
    const tbody = document.getElementById('tbody-estado-cuenta');
    const saldoLabel = document.getElementById('lbl-saldo-total');
    if (!tbody) return;

    const movimientos = movimientosEstadoCuenta.filter(item => {
        const matchesYear = !anio || obtenerAnioEstadoCuenta(item.fecha) === anio;
        const matchesType = !tipo || String(item.tipo_evento || '').trim() === String(tipo).trim();
        return matchesYear && matchesType;
    });

    if (!movimientos.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron movimientos para este cliente.</td></tr>';
        if (saldoLabel) saldoLabel.textContent = '$0.00';
        return;
    }

    tbody.innerHTML = movimientos.map((item, index) => `
        <tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
            <td>${escapeHtml(displayDate(item.fecha))}</td>
            <td>${escapeHtml(getTipoEventoLabel(item.tipo_evento))}</td>
            <td>${escapeHtml(displayValue(item.codigo_evento))}</td>
            <td>${escapeHtml(displayValue(item.factura))}</td>
            <td>${escapeHtml(displayValue(item.valor))}</td>
            <td>${escapeHtml(displayValue(item.saldo))}</td>
        </tr>`).join('');

    if (saldoLabel) {
        const saldo = movimientos[movimientos.length - 1].saldo;
        saldoLabel.textContent = `$${displayValue(saldo, '0.00')}`;
    }
}
