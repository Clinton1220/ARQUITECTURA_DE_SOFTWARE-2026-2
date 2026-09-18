// ============================================================================
// PORTAL DE TRÁMITES Y CERTIFICADOS 24/7 - ALCALDÍA MUNICIPAL
// Lógica de cliente para interactuar con la API REST y demostrar el Corte Vertical
// ============================================================================

const API_BASE = '/api';

// Estado global de sesión
let tokenActual = localStorage.getItem('alcaldia_token') || null;
let usuarioActual = JSON.parse(localStorage.getItem('alcaldia_usuario') || 'null');

document.addEventListener('DOMContentLoaded', () => {
  inicializarNavegacion();
  inicializarAutenticacion();
  cargarTiposTramite();
  verificarEstadoServidor();

  if (tokenActual) {
    mostrarUsuarioEnHeader();
    cargarMisSolicitudes();
  }
});

// 1. Gestión de Pestañas
function inicializarNavegacion() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      const targetPane = document.getElementById(target);
      if (targetPane) targetPane.classList.add('active');

      if (target === 'tab-mis-tramites' && tokenActual) {
        cargarMisSolicitudes();
      }
    });
  });
}

// 2. Health check de servidor
async function verificarEstadoServidor() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    const indicator = document.querySelector('.status-indicator');
    const text = document.getElementById('system-status-text');

    if (data.status === 'UP') {
      indicator.style.backgroundColor = '#22c55e';
      text.textContent = `Sistema Operativo 24/7 (BD: ${data.database})`;
    } else {
      indicator.style.backgroundColor = '#ef4444';
      text.textContent = 'Degradado (Reintentando auto-restart...)';
    }
  } catch (err) {
    const indicator = document.querySelector('.status-indicator');
    const text = document.getElementById('system-status-text');
    if (indicator) indicator.style.backgroundColor = '#ef4444';
    if (text) text.textContent = 'Servidor Inaccesible';
  }
}

// 3. Cargar catálogo de tipos de trámite
async function cargarTiposTramite() {
  try {
    const select = document.getElementById('tipo-tramite-select');
    const res = await fetch(`${API_BASE}/tipos-tramite`);
    const tipos = await res.json();

    select.innerHTML = '<option value="">-- Seleccione el Certificado o Trámite --</option>';
    tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.nombre} (Vigencia: ${t.vigenciaDias} días - ${t.costo > 0 ? '$' + t.costo : 'Gratuito'})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error cargando tipos de trámite:', err);
  }
}

// 4. Autenticación y Sesión
function inicializarAutenticacion() {
  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');
  const btnLogout = document.getElementById('btn-logout');

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const alertBox = document.getElementById('login-alert');

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          guardarSesion(data.token, data.usuario);
          mostrarAlerta(alertBox, '¡Ingreso exitoso! Redirigiendo...', 'success');
          setTimeout(() => {
            document.querySelector('[data-tab="tab-radicar"]').click();
          }, 800);
        } else {
          mostrarAlerta(alertBox, data.error || 'Credenciales inválidas', 'danger');
        }
      } catch (err) {
        mostrarAlerta(alertBox, 'Error de conexión con el servidor', 'danger');
      }
    });
  }

  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('reg-nombre').value;
      const documentoIdentidad = document.getElementById('reg-documento').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const alertBox = document.getElementById('reg-alert');

      try {
        const res = await fetch(`${API_BASE}/auth/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, documentoIdentidad, email, password, rol: 'ciudadano' })
        });
        const data = await res.json();

        if (res.ok) {
          guardarSesion(data.token, data.usuario);
          mostrarAlerta(alertBox, '¡Registro exitoso! Cuenta ciudadana creada.', 'success');
          setTimeout(() => {
            document.querySelector('[data-tab="tab-radicar"]').click();
          }, 800);
        } else {
          mostrarAlerta(alertBox, data.error || 'No se pudo completar el registro', 'danger');
        }
      } catch (err) {
        mostrarAlerta(alertBox, 'Error de conexión con el servidor', 'danger');
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', cerrarSesion);
  }
}

function guardarSesion(token, usuario) {
  tokenActual = token;
  usuarioActual = usuario;
  localStorage.setItem('alcaldia_token', token);
  localStorage.setItem('alcaldia_usuario', JSON.stringify(usuario));
  mostrarUsuarioEnHeader();
}

function cerrarSesion() {
  tokenActual = null;
  usuarioActual = null;
  localStorage.removeItem('alcaldia_token');
  localStorage.removeItem('alcaldia_usuario');
  ocultarUsuarioEnHeader();
  document.querySelector('[data-tab="tab-login"]').click();
}

function mostrarUsuarioEnHeader() {
  const pill = document.getElementById('user-pill');
  const nameDisplay = document.getElementById('user-name-display');
  const loginTabBtn = document.getElementById('tab-login-btn');

  if (pill && nameDisplay && usuarioActual) {
    pill.classList.remove('hidden');
    nameDisplay.textContent = `👤 ${usuarioActual.nombre} (${usuarioActual.rol})`;
  }
  if (loginTabBtn) loginTabBtn.textContent = '👤 Mi Cuenta';
}

function ocultarUsuarioEnHeader() {
  const pill = document.getElementById('user-pill');
  const loginTabBtn = document.getElementById('tab-login-btn');
  if (pill) pill.classList.add('hidden');
  if (loginTabBtn) loginTabBtn.textContent = '🔐 Ingreso Ciudadano';
}

// 5. Radicar Trámite (HU-01)
const formRadicar = document.getElementById('form-radicar');
if (formRadicar) {
  formRadicar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('radicar-alert');

    if (!tokenActual) {
      mostrarAlerta(alertBox, 'Debes iniciar sesión para radicar un trámite oficial.', 'warning');
      setTimeout(() => {
        document.querySelector('[data-tab="tab-login"]').click();
      }, 1000);
      return;
    }

    const tipoTramiteId = parseInt(document.getElementById('tipo-tramite-select').value);
    const barrioVereda = document.getElementById('barrio-vereda-input').value;
    const direccionPredio = document.getElementById('direccion-predio-input').value;
    const observaciones = document.getElementById('observaciones-input').value;

    try {
      const res = await fetch(`${API_BASE}/solicitudes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenActual}`
        },
        body: JSON.stringify({
          tipoTramiteId,
          barrioVereda,
          direccionPredio,
          observaciones
        })
      });

      const data = await res.json();

      if (res.status === 201) {
        mostrarAlerta(alertBox, `🎉 ¡Trámite radicado exitosamente! Tu número oficial de radicado es: <strong>${data.solicitud.radicado}</strong>`, 'success');
        formRadicar.reset();
        cargarMisSolicitudes();
      } else if (res.status === 409) {
        mostrarAlerta(alertBox, `⚠️ ${data.error}. Radicado previo: ${data.radicadoExistente || 'N/A'}`, 'warning');
      } else if (res.status === 401) {
        mostrarAlerta(alertBox, 'Sesión expirada. Por favor ingresa nuevamente.', 'danger');
        cerrarSesion();
      } else {
        mostrarAlerta(alertBox, data.error || 'Error al radicar trámite.', 'danger');
      }
    } catch (err) {
      mostrarAlerta(alertBox, 'Error de conexión con el servidor.', 'danger');
    }
  });
}

// 6. Cargar Mis Solicitudes (CRUD List, Update, Soft-Delete)
async function cargarMisSolicitudes() {
  const tbody = document.getElementById('tabla-solicitudes-body');
  if (!tokenActual || !tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Cargando trámites...</td></tr>';
    const res = await fetch(`${API_BASE}/solicitudes`, {
      headers: { 'Authorization': `Bearer ${tokenActual}` }
    });

    if (res.status === 401) {
      cerrarSesion();
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No tienes solicitudes activas registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach(s => {
      const tr = document.createElement('tr');
      const fecha = new Date(s.createdAt).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      tr.innerHTML = `
        <td><strong>${s.radicado}</strong></td>
        <td>${s.tipoTramite ? s.tipoTramite.nombre : 'Certificado'}</td>
        <td>${s.direccionPredio} (${s.barrioVereda})</td>
        <td>${fecha}</td>
        <td><span class="badge badge-${s.estado}">${s.estado.toUpperCase()}</span></td>
        <td>
          <div style="display: flex; gap: 4px;">
            ${usuarioActual && usuarioActual.rol !== 'ciudadano' ? `
              <button class="btn btn-secondary btn-sm" onclick="cambiarEstadoAdmin(${s.id}, '${s.estado === 'radicada' ? 'aprobada' : 'radicada'}')">
                ${s.estado === 'radicada' ? 'Aprobar' : 'Reversar'}
              </button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="verCertificado('${s.radicado}')">Ver</button>
            <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #dc2626;" onclick="cancelarSolicitud(${s.id})">Cancelar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error listando solicitudes:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Error al cargar datos.</td></tr>';
  }
}

// 7. Borrado Lógico (Soft-Delete: activo = false)
window.cancelarSolicitud = async function(id) {
  if (!confirm('¿Está seguro de que desea cancelar esta solicitud? Se aplicará borrado lógico preservando la trazabilidad en auditoría.')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/solicitudes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenActual}` }
    });

    if (res.status === 204) {
      alert('Solicitud cancelada exitosamente (borrado lógico aplicado).');
      cargarMisSolicitudes();
    } else {
      const data = await res.json();
      alert(data.error || 'No se pudo cancelar la solicitud.');
    }
  } catch (err) {
    alert('Error al conectar con el servidor.');
  }
};

// 8. Cambio de estado por funcionario
window.cambiarEstadoAdmin = async function(id, nuevoEstado) {
  try {
    const res = await fetch(`${API_BASE}/solicitudes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenActual}`
      },
      body: JSON.stringify({ estado: nuevoEstado })
    });

    if (res.ok) {
      alert(`Estado actualizado a: ${nuevoEstado}`);
      cargarMisSolicitudes();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al actualizar estado');
    }
  } catch (err) {
    alert('Error de conexión');
  }
};

// 9. Consulta por Radicado (RF-05)
const btnBuscarRadicado = document.getElementById('btn-buscar-radicado');
if (btnBuscarRadicado) {
  btnBuscarRadicado.addEventListener('click', async () => {
    const radicado = document.getElementById('input-buscar-radicado').value.trim();
    const resultBox = document.getElementById('resultado-radicado');

    if (!radicado) {
      alert('Por favor ingrese un número de radicado');
      return;
    }

    try {
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = '<p>Consultando radicado en tiempo real...</p>';

      const res = await fetch(`${API_BASE}/solicitudes/seguimiento/${radicado}`);
      const data = await res.json();

      if (res.ok) {
        resultBox.innerHTML = `
          <div style="border-left: 4px solid #003366; padding-left: 1rem;">
            <h4>Radicado Oficial: ${data.radicado}</h4>
            <p><strong>Tipo de Trámite:</strong> ${data.tipoTramite ? data.tipoTramite.nombre : 'N/A'}</p>
            <p><strong>Ciudadano Solicitante:</strong> ${data.ciudadano ? data.ciudadano.nombre : 'Confidencial'}</p>
            <p><strong>Predio:</strong> ${data.direccionPredio} (${data.barrioVereda})</p>
            <p><strong>Estado Actual:</strong> <span class="badge badge-${data.estado}">${data.estado.toUpperCase()}</span></p>
            <p><strong>Código de Autenticidad QR:</strong> <code>${data.codigoVerificacionQr}</code></p>
            ${data.estado === 'aprobada' ? `
              <div style="margin-top: 1rem;">
                <button class="btn btn-secondary btn-sm" onclick="verCertificado('${data.radicado}')">📜 Ver Certificado Digital</button>
              </div>
            ` : '<p class="text-muted" style="margin-top: 0.5rem;"><em>El certificado estará disponible una vez sea aprobado por la Secretaría de Gobierno.</em></p>'}
          </div>
        `;
      } else {
        resultBox.innerHTML = `<p style="color: #dc2626;">❌ ${data.error}</p>`;
      }
    } catch (err) {
      resultBox.innerHTML = '<p style="color: #dc2626;">Error al consultar el servicio.</p>';
    }
  });
}

// 10. Validación de Autenticidad QR (RF-06)
const btnBuscarQr = document.getElementById('btn-buscar-qr');
if (btnBuscarQr) {
  btnBuscarQr.addEventListener('click', async () => {
    const codigoQr = document.getElementById('input-buscar-qr').value.trim();
    const resultBox = document.getElementById('resultado-qr');

    if (!codigoQr) {
      alert('Por favor ingrese el código de validación QR');
      return;
    }

    try {
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = '<p>Verificando validez jurídica del certificado...</p>';

      const res = await fetch(`${API_BASE}/solicitudes/verificar/${codigoQr}`);
      const data = await res.json();

      if (res.ok) {
        resultBox.innerHTML = `
          <div class="cert-preview">
            <div class="cert-header">
              <h4>REPÚBLICA DE COLOMBIA</h4>
              <h3>ALCALDÍA MUNICIPAL</h3>
              <p>SECRETARÍA DE GOBIERNO</p>
            </div>
            <div style="text-align: center; margin: 1.5rem 0;">
              <h2>${data.tipoTramite ? data.tipoTramite.toUpperCase() : 'CERTIFICADO OFICIAL'}</h2>
              <p><strong>RADICADO N°:</strong> ${data.radicado}</p>
            </div>
            <p style="text-align: justify; line-height: 1.8;">
              La Secretaría de Gobierno de la Alcaldía Municipal hace constar que el(la) ciudadano(a) 
              <strong>${data.ciudadano}</strong> identificado(a) con cédula de ciudadanía N° <strong>${data.documentoIdentidad}</strong>, 
              reside actualmente en el predio ubicado en <strong>${data.direccionPredio}</strong> de este municipio.
            </p>
            <div class="cert-qr-area">
              <div>
                <p><strong>Estado:</strong> <span class="badge badge-${data.estado}">${data.estado.toUpperCase()}</span></p>
                <p><small>Fecha de Emisión: ${new Date(data.fechaEmision).toLocaleString('es-CO')}</small></p>
                <p><small>Verificación: ${data.entidadEmisora}</small></p>
              </div>
              <div style="text-align: center;">
                <div style="border: 2px solid #000; padding: 10px; background: #fff; font-family: monospace; font-size: 11px;">
                  [QR VALIDADO]<br>${codigoQr}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = `<p style="color: #dc2626;">❌ ${data.mensaje || 'Certificado inválido o no emitido'}</p>`;
      }
    } catch (err) {
      resultBox.innerHTML = '<p style="color: #dc2626;">Error al consultar el servicio.</p>';
    }
  });
}

window.verCertificado = function(radicado) {
  document.querySelector('[data-tab="tab-consultar"]').click();
  document.getElementById('input-buscar-radicado').value = radicado;
  document.getElementById('btn-buscar-radicado').click();
};

const btnRecargar = document.getElementById('btn-recargar-solicitudes');
if (btnRecargar) {
  btnRecargar.addEventListener('click', cargarMisSolicitudes);
}

function mostrarAlerta(contenedor, mensaje, tipo) {
  if (!contenedor) return;
  contenedor.className = `alert alert-${tipo}`;
  contenedor.innerHTML = mensaje;
  contenedor.classList.remove('hidden');
}
