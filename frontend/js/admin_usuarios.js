let listaUsuarios = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarUsuarios();
});

// Cargar dinámicamente el listado desde la API
async function cargarUsuarios() {
    try {
        const res = await fetch('/admin/api/usuarios');
        if (!res.ok) throw new Error("Error al obtener los usuarios");

        listaUsuarios = await res.json();
        const tbody = document.getElementById('usuariosTableBody');
        tbody.innerHTML = '';

        listaUsuarios.forEach(u => {
            tbody.innerHTML += `
                <tr>
                    <td>${escaparHtml(u.username)}</td>
                    <td>${escaparHtml(u.cedula_identidad || '-')}</td>
                    <td>${escaparHtml(u.nombre_completo || '-')}</td>
                    <td>${escaparHtml(u.email)}</td>
                    <td><span class="badge badge-role">${escaparHtml(u.rol_nombre)}</span></td>
                    <td>
                        <span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">
                            ${u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${u.is_active ? 'checked' : ''} onchange="toggleEstado(${u.id})">
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <div class="acciones-cell">
                            <button class="btn-icon btn-edit" title="Editar usuario" onclick="abrirModalEdicion(${u.id})">
                                <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                            </button>
                            <button class="btn-icon btn-delete" title="Eliminar usuario" onclick="eliminarUsuario(${u.id})">
                                <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

// Evita inyección de HTML en los datos mostrados
function escaparHtml(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Valida una cédula ecuatoriana de 10 dígitos
// Estructura: PP (provincia 01-24) + T (tercer dígito 0-5) + 6 dígitos + DV (verificador módulo 10)
function validarCedula(cedula) {
    const valor = (cedula || '').trim();

    if (!/^\d{10}$/.test(valor)) {
        return { valido: false, mensaje: 'La cédula debe tener exactamente 10 dígitos.' };
    }

    const provincia = parseInt(valor.slice(0, 2), 10);
    if (provincia < 1 || provincia > 24) {
        return { valido: false, mensaje: 'Los dos primeros dígitos deben corresponder a una provincia (01 a 24).' };
    }

    const tercerDigito = parseInt(valor[2], 10);
    if (tercerDigito > 5) {
        return { valido: false, mensaje: 'El tercer dígito de la cédula debe ser 0, 1, 2, 3, 4 o 5.' };
    }

    // Coeficientes 2,1,2,1,2,1,2,1,2 sobre los primeros 9 dígitos.
    // Si el producto es >= 10 se suman sus dígitos (producto - 9) antes de acumular.
    let suma = 0;
    for (let i = 0; i < 9; i++) {
        let producto = parseInt(valor[i], 10) * (i % 2 === 0 ? 2 : 1);
        if (producto >= 10) {
            producto -= 9;
        }
        suma += producto;
    }
    const verificador = (10 - (suma % 10)) % 10;

    if (verificador !== parseInt(valor[9], 10)) {
        return { valido: false, mensaje: 'El dígito verificador de la cédula no es correcto.' };
    }

    return { valido: true, mensaje: 'Cédula válida.' };
}

function validarCedulaInput(input) {
    // Solo se permiten números y como máximo 10 caracteres
    const limpio = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== limpio) {
        input.value = limpio;
    }

    const hint = document.getElementById('cedulaHint');
    const resultado = validarCedula(limpio);

    input.classList.toggle('input-error', !resultado.valido && limpio.length === 10);
    input.classList.toggle('input-ok', resultado.valido);

    if (limpio.length === 0) {
        hint.textContent = '10 dígitos. Provincia 01-24 y dígito verificador válido.';
        hint.className = 'form-hint';
    } else if (resultado.valido) {
        hint.textContent = resultado.mensaje;
        hint.className = 'form-hint hint-ok';
    } else {
        hint.textContent = resultado.mensaje;
        hint.className = 'form-hint hint-error';
    }

    return resultado;
}

// Cambiar estado activo/inactivo (Toggle)
async function toggleEstado(id) {
    try {
        const res = await fetch(`/admin/api/usuarios/${id}/estado`, { method: 'PUT' });
        if (res.ok) {
            cargarUsuarios();
        } else {
            alert("No se pudo cambiar el estado del usuario.");
            cargarUsuarios();
        }
    } catch (error) {
        console.error("Error al actualizar el estado:", error);
    }
}

// Crear o actualizar un usuario mediante Formulario AJAX
async function guardarUsuario(e) {
    e.preventDefault();
    const form = document.getElementById('formUsuario');
    const formData = new FormData(form);
    const id = document.getElementById('usuario_id').value;

    // La cédula debe cumplir el formato y algoritmo ecuatoriano
    const inputCedula = document.getElementById('usuario_cedula');
    const resultadoCedula = validarCedula(inputCedula.value);
    if (!resultadoCedula.valido) {
        validarCedulaInput(inputCedula);
        inputCedula.focus();
        alert(resultadoCedula.mensaje);
        return;
    }
    formData.set('cedula_identidad', inputCedula.value.trim());

    // En modo edición la contraseña es opcional
    if (id && !formData.get('password')) {
        formData.delete('password');
    }

    const url = id ? `/admin/api/usuarios/${id}` : '/admin/api/usuarios';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: metodo,
            body: formData
        });

        if (res.ok) {
            form.reset();
            cerrarModal();
            cargarUsuarios();
        } else {
            let mensaje = "Ocurrió un error al guardar el usuario.";
            try {
                const err = await res.json();
                mensaje = err.detail || mensaje;
            } catch (e) { /* respuesta sin cuerpo JSON */ }
            alert(mensaje);
        }
    } catch (error) {
        console.error("Error al guardar:", error);
    }
}

async function eliminarUsuario(id) {
    const usuario = listaUsuarios.find(u => u.id === id);
    const nombre = usuario ? (usuario.nombre_completo || usuario.username) : `#${id}`;

    const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar usuario?',
        text: `Se eliminará a "${nombre}". Esta acción no se puede deshacer.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ee5d50',
        cancelButtonColor: '#64748b',
        reverseButtons: true
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {
        const res = await fetch(`/admin/api/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cargarUsuarios();
        } else {
            let mensaje = "No se pudo eliminar el usuario.";
            try {
                const err = await res.json();
                mensaje = err.detail || mensaje;
            } catch (e) { /* respuesta sin cuerpo JSON */ }
            alert(mensaje);
        }
    } catch (error) {
        console.error("Error al eliminar:", error);
    }
}

function abrirModal() {
    resetearFormulario();
    document.getElementById('modalUsuarioTitle').textContent = 'Registrar Nuevo Usuario';
    document.getElementById('btnGuardarUsuario').textContent = 'Guardar Usuario';
    document.getElementById('usuario_password').required = true;
    document.getElementById('passwordHint').textContent = 'Mínimo 6 caracteres.';
    document.getElementById('modalUsuario').style.display = 'flex';
}

function abrirModalEdicion(id) {
    const u = listaUsuarios.find(x => x.id === id);
    if (!u) return;

    resetearFormulario();

    document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuario';
    document.getElementById('btnGuardarUsuario').textContent = 'Actualizar Usuario';
    document.getElementById('usuario_password').required = false;
    document.getElementById('passwordHint').textContent = 'Dejar vacío para no modificar la contraseña.';

    document.getElementById('usuario_id').value = u.id;
    document.getElementById('usuario_username').value = u.username || '';
    document.getElementById('usuario_nombre_completo').value = u.nombre_completo || '';
    document.getElementById('usuario_cedula').value = u.cedula_identidad || '';
    document.getElementById('usuario_email').value = u.email || '';
    document.getElementById('usuario_rol_id').value = u.rol_id;

    document.getElementById('modalUsuario').style.display = 'flex';
}

function resetearFormulario() {
    document.getElementById('formUsuario').reset();
    document.getElementById('usuario_id').value = '';
    document.getElementById('usuario_password').value = '';

    const inputCedula = document.getElementById('usuario_cedula');
    inputCedula.value = '';
    inputCedula.classList.remove('input-error', 'input-ok');
    const hint = document.getElementById('cedulaHint');
    hint.className = 'form-hint';
    hint.textContent = '10 dígitos. Provincia 01-24 y dígito verificador válido.';
}

function cerrarModal() {
    document.getElementById('modalUsuario').style.display = 'none';
    resetearFormulario();
}
