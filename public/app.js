/**
 * PORTAL CIUDADANO — ALCALDÍA MUNICIPAL
 * Frontend con WebSockets en Tiempo Real (Socket.io)
 * Arquitectura: N-Capas + Strangler Fig + Corte Vertical HU-01
 */

'use strict';

// ═══════════════════════════════════════════════════════
// ESTADO GLOBAL DE LA APLICACIÓN
// ═══════════════════════════════════════════════════════
const APP = {
  token:     null,
  usuario:   null,
  socket:    null,
  modalData: null,   // solicitudId actual del modal de funcionario
};

// ═══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════
const API_URL = '';  // Mismo origen

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (APP.token) headers['Authorization'] = `Bearer ${APP.token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.error || data.message || 'Error desconocido', data };
  return data;
}

function formatFecha(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function estadoBadge(estado) {
  const map = {
    radicada:   '<span class="badge badge-radicada"><i class="bi bi-file-earmark-arrow-up"></i> Radicada</span>',
    en_revision:'<span class="badge badge-en_revision"><i class="bi bi-hourglass-split"></i> En Revisión</span>',
    aprobada:   '<span class="badge badge-aprobada"><i class="bi bi-check-circle-fill"></i> Aprobada</span>',
    rechazada:  '<span class="badge badge-rechazada"><i class="bi bi-x-circle-fill"></i> Rechazada</span>',
    cancelada:  '<span class="badge badge-cancelada"><i class="bi bi-slash-circle"></i> Cancelada</span>',
  };
  return map[estado] || `<span class="badge">${estado}</span>`;
}

// ═══════════════════════════════════════════════════════
// SISTEMA DE TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════
function toast(tipo, titulo, desc = '', duracion = 5000) {
  const icons = {
    success: '<i class="bi bi-check-circle-fill"></i>',
    error:   '<i class="bi bi-x-circle-fill"></i>',
    info:    '<i class="bi bi-info-circle-fill"></i>',
    warning: '<i class="bi bi-exclamation-triangle-fill"></i>'
  };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[tipo] || 'ℹ️'}</span>
    <div class="toast-content">
      <div class="toast-title">${titulo}</div>
      ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
    </div>
  `;
  container.prepend(el);
  el.addEventListener('click', () => removerToast(el));
  setTimeout(() => removerToast(el), duracion);
}

function removerToast(el) {
  el.style.animation = 'toastOut 0.3s ease forwards';
  setTimeout(() => el.remove(), 300);
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN POR PESTAÑAS
// ═══════════════════════════════════════════════════════
function activarTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  const pane = document.getElementById(tabId);
  if (btn) btn.classList.add('active');
  if (pane) pane.classList.add('active');

  // Acciones al activar ciertas pestañas
  if (tabId === 'tab-mis-tramites' && APP.token) cargarSolicitudesCiudadano();
  if (tabId === 'tab-admin' && APP.usuario?.rol === 'funcionario') {
    cargarMetricas();
    cargarSolicitudesAdmin();
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => activarTab(btn.dataset.tab));
});

document.getElementById('link-login-radicar')?.addEventListener('click', (e) => {
  e.preventDefault();
  activarTab('tab-login');
});

// ═══════════════════════════════════════════════════════
// AUTENTICACIÓN Y SESIÓN
// ═══════════════════════════════════════════════════════
function actualizarUIAuth() {
  const pill    = document.getElementById('user-pill');
  const nameEl  = document.getElementById('user-name-display');
  const roleEl  = document.getElementById('user-role-badge');
  const adminBtn = document.getElementById('tab-admin-btn');
  const noticeRadicar = document.getElementById('notice-auth-radicar');
  const formRadicar   = document.querySelector('#form-radicar form') || document.getElementById('form-radicar');

  if (APP.usuario) {
    pill.classList.remove('hidden');
    nameEl.textContent = APP.usuario.nombre;
    roleEl.innerHTML = APP.usuario.rol === 'funcionario'
      ? '<i class="bi bi-gear-fill"></i> Funcionario'
      : '<i class="bi bi-person-fill"></i> Ciudadano';
    roleEl.className   = `role-badge ${APP.usuario.rol}`;

    if (APP.usuario.rol === 'funcionario') {
      adminBtn.classList.remove('hidden');
    }
    if (noticeRadicar) noticeRadicar.classList.add('hidden');
  } else {
    pill.classList.add('hidden');
    adminBtn.classList.add('hidden');
    if (noticeRadicar) noticeRadicar.classList.remove('hidden');
  }
}

// LOGIN
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('login-alert');
  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Iniciando sesión...';
  mostrarAlerta(alertEl, '', '');

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      })
    });

    APP.token   = data.token;
    APP.usuario = data.usuario;
    localStorage.setItem('tramites_token',   APP.token);
    localStorage.setItem('tramites_usuario', JSON.stringify(APP.usuario));

    actualizarUIAuth();
    conectarWebSocket();

    toast('success', `¡Bienvenido, ${APP.usuario.nombre}!`,
          APP.usuario.rol === 'funcionario'
            ? '<i class="bi bi-gear-wide-connected"></i> Panel de funcionario habilitado.'
            : '<i class="bi bi-send"></i> Ya puede radicar sus trámites en línea.');

    // Redirigir al panel correspondiente
    activarTab(APP.usuario.rol === 'funcionario' ? 'tab-admin' : 'tab-radicar');
  } catch (err) {
    mostrarAlerta(alertEl, err.message, 'error');
    toast('error', 'Error de autenticación', err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Ingresar al Sistema';
  }
});

// REGISTRO
document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('reg-alert');
  try {
    await apiFetch('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre:            document.getElementById('reg-nombre').value,
        documentoIdentidad:document.getElementById('reg-documento').value,
        email:             document.getElementById('reg-email').value,
        password:          document.getElementById('reg-password').value,
        rol: 'ciudadano'
      })
    });
    mostrarAlerta(alertEl, '✅ Registro exitoso. Ahora puede iniciar sesión.', 'success');
    toast('success', 'Cuenta creada', 'Inicia sesión para radicar tus trámites.');
    document.getElementById('form-registro').reset();
  } catch (err) {
    mostrarAlerta(alertEl, err.message, 'error');
  }
});

// LOGOUT
document.getElementById('btn-logout').addEventListener('click', () => {
  APP.token   = null;
  APP.usuario = null;
  localStorage.removeItem('tramites_token');
  localStorage.removeItem('tramites_usuario');
  if (APP.socket) { APP.socket.disconnect(); APP.socket = null; }
  actualizarUIAuth();
  actualizarWSIndicador('disconnected');
  toast('info', 'Sesión cerrada', 'Hasta pronto.');
  activarTab('tab-login');
});

// Restaurar sesión desde localStorage
function restaurarSesion() {
  const token   = localStorage.getItem('tramites_token');
  const usuario = localStorage.getItem('tramites_usuario');
  if (token && usuario) {
    APP.token   = token;
    APP.usuario = JSON.parse(usuario);
    actualizarUIAuth();
    conectarWebSocket();
    if (APP.usuario.rol === 'funcionario') cargarMetricas();
  }
}

// ═══════════════════════════════════════════════════════
// WEBSOCKETS — TIEMPO REAL
// ═══════════════════════════════════════════════════════
function actualizarWSIndicador(estado) {
  const dot  = document.getElementById('ws-dot');
  const text = document.getElementById('ws-text');
  dot.className = 'ws-dot';
  if (estado === 'connected') {
    dot.classList.add('connected');
    text.textContent = 'Tiempo real activo';
  } else if (estado === 'error') {
    dot.classList.add('error');
    text.textContent = 'Sin conexión en vivo';
  } else {
    text.textContent = 'Conectando...';
  }
}

function conectarWebSocket() {
  if (!APP.usuario) return;
  if (APP.socket?.connected) return;

  APP.socket = io({ transports: ['websocket', 'polling'] });

  APP.socket.on('connect', () => {
    console.log('[WS] Conectado:', APP.socket.id);
    actualizarWSIndicador('connected');
    APP.socket.emit('autenticar', {
      rol:       APP.usuario.rol,
      usuarioId: APP.usuario.id
    });
  });

  APP.socket.on('disconnect', () => {
    console.log('[WS] Desconectado');
    actualizarWSIndicador('error');
  });

  // ── Evento: nueva solicitud radicada (para funcionarios) ──────────
  APP.socket.on('nueva_solicitud', (data) => {
    agregarAlFeed({
      icon: '<i class="bi bi-inbox-fill"></i>', iconClass: 'nueva',
      titulo: `Nueva solicitud: ${data.tramite}`,
      desc: `Ciudadano: ${data.ciudadano} — ${data.barrioVereda} | ${data.radicado}`,
      time: formatFecha(data.timestamp)
    });
    toast('info', `<i class="bi bi-inbox-fill"></i> Nueva solicitud recibida`, `${data.tramite} — ${data.radicado}`);
    cargarMetricas();
    cargarSolicitudesAdmin();
    actualizarBannerStats();
  });

  // ── Evento: cambio de estado (para ciudadano afectado y funcionarios) ──
  APP.socket.on('estado_actualizado', (data) => {
    agregarAlFeed({
      icon: '<i class="bi bi-arrow-repeat"></i>', iconClass: 'estado',
      titulo: `Estado actualizado: ${data.radicado}`,
      desc: `${data.tramite}: ${data.estadoAnterior} → ${data.estadoLabel} (por ${data.funcionario})`,
      time: formatFecha(data.timestamp)
    });

    // Si soy ciudadano y me afecta, muestro toast
    if (APP.usuario?.rol === 'ciudadano') {
      const tipoToast = data.estadoNuevo === 'aprobada' ? 'success'
                      : data.estadoNuevo === 'rechazada' ? 'error' : 'warning';
      toast(tipoToast, `<i class="bi bi-bell-fill"></i> Tu trámite fue actualizado`, `${data.radicado}: ${data.estadoLabel}`, 8000);
      cargarSolicitudesCiudadano();
    } else {
      cargarMetricas();
      cargarSolicitudesAdmin();
      actualizarBannerStats();
    }
  });

  // ── Evento: solicitud cancelada ──────────────────────────────────
  APP.socket.on('solicitud_cancelada', (data) => {
    agregarAlFeed({
      icon: '<i class="bi bi-slash-circle"></i>', iconClass: 'cancela',
      titulo: `Solicitud cancelada: ${data.radicado}`,
      desc: 'El ciudadano canceló su solicitud.',
      time: formatFecha(data.timestamp)
    });
    cargarMetricas();
    cargarSolicitudesAdmin();
    actualizarBannerStats();
  });

  // ── Evento: métricas actualizadas (trigger de recarga silenciosa) ─
  APP.socket.on('metricas_actualizadas', () => {
    actualizarBannerStats();
  });

  APP.socket.on('connect_error', (err) => {
    console.warn('[WS] Error:', err.message);
    actualizarWSIndicador('error');
  });
}

// ═══════════════════════════════════════════════════════
// CATÁLOGO DE TIPOS DE TRÁMITE
// ═══════════════════════════════════════════════════════
async function cargarTiposTramite() {
  try {
    const tipos = await apiFetch('/api/tipos-tramite');
    const sel   = document.getElementById('tipo-tramite-select');
    const hint  = document.getElementById('tipo-tramite-hint');
    sel.innerHTML = '<option value="">— Seleccione el tipo de certificado —</option>';
    tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.nombre}${t.costo > 0 ? ` ($${t.costo.toLocaleString('es-CO')})` : ' (Gratuito)'}`;
      opt.dataset.descripcion = t.descripcion;
      opt.dataset.vigencia    = t.vigenciaDias;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      const opt = sel.selectedOptions[0];
      if (opt?.dataset.descripcion) {
        hint.textContent = `${opt.dataset.descripcion} (Vigencia: ${opt.dataset.vigencia} días)`;
      } else {
        hint.textContent = '';
      }
    });
  } catch (err) {
    console.error('[Catálogo]', err);
  }
}

// ═══════════════════════════════════════════════════════
// DATOS DE EJEMPLO PARA DEMOSTRACIÓN
// ═══════════════════════════════════════════════════════
const EJEMPLOS_DEMO = [
  {
    barrio:     'Barrio El Centro',
    direccion:  'Carrera 5 # 10-24',
    observaciones: 'Necesito el certificado para trámite bancario de crédito hipotecario.',
    tipoNombre: 'Certificado de Residencia'
  },
  {
    barrio:     'Barrio La Esperanza',
    direccion:  'Calle 15 # 8-32 Apto 201',
    observaciones: 'Requerido para postulación a subsidio de vivienda del programa Mi Casa Ya.',
    tipoNombre: 'Certificado de Paz y Salvo Municipal'
  },
  {
    barrio:     'Vereda El Porvenir',
    direccion:  'Km 3 Vía Principal, Lote 12',
    observaciones: 'Solicitado por empresa de servicios públicos para actualización de tarifas.',
    tipoNombre: 'Certificado de Estratificación Socioeconómica'
  },
  {
    barrio:     'Barrio San Martín',
    direccion:  'Transversal 9 # 22-15 Casa 3',
    observaciones: 'Requerido para escrituración ante notaría pública.',
    tipoNombre: 'Certificado de Nomenclatura y Dirección'
  },
  {
    barrio:     'Urbanización Los Pinos',
    direccion:  'Manzana B Casa 7, Etapa 2',
    observaciones: 'Necesito el certificado de residencia para trámite de libreta militar.',
    tipoNombre: 'Certificado de Residencia'
  },
];
let _demoIndex = 0;

document.getElementById('btn-demo-fill')?.addEventListener('click', () => {
  if (!APP.token) {
    toast('warning', '<i class="bi bi-lock"></i> Inicia sesión primero',
          'Para radicar trámites debes autenticarte.');
    activarTab('tab-login');
    return;
  }

  const ejemplo = EJEMPLOS_DEMO[_demoIndex % EJEMPLOS_DEMO.length];
  _demoIndex++;

  // Seleccionar el tipo de trámite que coincida con el nombre del ejemplo
  const sel = document.getElementById('tipo-tramite-select');
  let tipoEncontrado = false;
  for (const opt of sel.options) {
    if (opt.textContent.includes(ejemplo.tipoNombre.split(' ').slice(0, 3).join(' '))) {
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change'));
      tipoEncontrado = true;
      break;
    }
  }
  // Si no encontró por nombre, usar la primera opción válida
  if (!tipoEncontrado && sel.options.length > 1) {
    sel.selectedIndex = 1;
    sel.dispatchEvent(new Event('change'));
  }

  document.getElementById('barrio-vereda-input').value   = ejemplo.barrio;
  document.getElementById('direccion-predio-input').value = ejemplo.direccion;
  document.getElementById('observaciones-input').value   = ejemplo.observaciones;

  // Animación de highlight en los campos rellenados
  ['barrio-vereda-input', 'direccion-predio-input', 'observaciones-input'].forEach(id => {
    const el = document.getElementById(id);
    el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    el.style.borderColor = '#a78bfa';
    el.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.25)';
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    }, 1500);
  });

  toast('info',
    '<i class="bi bi-magic"></i> Datos de ejemplo cargados',
    `Ejemplo ${_demoIndex}: ${ejemplo.barrio} — ${ejemplo.tipoNombre}`
  );
});

// ═══════════════════════════════════════════════════════
// RADICACIÓN DE SOLICITUD (HU-01)
// ═══════════════════════════════════════════════════════
document.getElementById('form-radicar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('radicar-alert');
  const recibo  = document.getElementById('recibo-radicado');
  const btn     = document.getElementById('btn-submit-tramite');

  if (!APP.token) {
    mostrarAlerta(alertEl, '🔐 Debe iniciar sesión para radicar un trámite.', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Radicando...';
  recibo.classList.add('hidden');
  mostrarAlerta(alertEl, '', '');

  try {
    const tipoSel  = document.getElementById('tipo-tramite-select');
    const tipoNombre = tipoSel.selectedOptions[0]?.textContent || '';

    const data = await apiFetch('/api/solicitudes', {
      method: 'POST',
      body: JSON.stringify({
        tipoTramiteId: document.getElementById('tipo-tramite-select').value,
        barrioVereda:  document.getElementById('barrio-vereda-input').value,
        direccionPredio: document.getElementById('direccion-predio-input').value,
        observaciones: document.getElementById('observaciones-input').value,
      })
    });

    // Mostrar recibo visual
    document.getElementById('recibo-radicado-num').textContent = data.solicitud.radicado;
    document.getElementById('recibo-qr').textContent           = data.solicitud.codigoVerificacionQr;
    document.getElementById('recibo-tramite').textContent      = tipoNombre;
    document.getElementById('recibo-fecha').textContent        = formatFecha(data.solicitud.createdAt);
    recibo.classList.remove('hidden');

    toast('success', '<i class="bi bi-check-circle-fill"></i> Solicitud Radicada', `Radicado: ${data.solicitud.radicado}`, 8000);
    document.getElementById('form-radicar').reset();
    document.getElementById('tipo-tramite-hint').textContent = '';
  } catch (err) {
    mostrarAlerta(alertEl, err.message, 'error');
    toast('error', '<i class="bi bi-x-circle-fill"></i> Error al radicar', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill"></i> Radicar Solicitud Oficialmente';
  }
});

// ═══════════════════════════════════════════════════════
// MIS SOLICITUDES (Ciudadano)
// ═══════════════════════════════════════════════════════
async function cargarSolicitudesCiudadano() {
  const tbody = document.getElementById('tabla-solicitudes-body');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Cargando...</td></tr>';

  if (!APP.token) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-person-lock"></i> Inicia sesión para ver tus trámites.</td></tr>';
    return;
  }

  try {
    const estado = document.getElementById('filtro-estado').value;
    const url    = estado ? `/api/solicitudes?estado=${estado}` : '/api/solicitudes';
    const lista  = await apiFetch(url);

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-inbox"></i> No hay solicitudes registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(s => `
      <tr>
        <td><code style="font-size:11px;color:#60a5fa">${s.radicado}</code></td>
        <td>${s.tipoTramite?.nombre || '—'}</td>
        <td style="font-size:12px">${s.direccionPredio}<br><span style="color:var(--text-muted)">${s.barrioVereda}</span></td>
        <td style="font-size:12px;white-space:nowrap">${formatFecha(s.createdAt)}</td>
        <td>${estadoBadge(s.estado)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-secondary" onclick="verDetalleRadicado('${s.radicado}')">
              <i class="bi bi-search"></i> Ver
            </button>
            ${s.estado === 'radicada' ?
              `<button class="btn btn-sm btn-danger" onclick="cancelarSolicitud(${s.id}, '${s.radicado}')">
                <i class="bi bi-trash3"></i> Cancelar
              </button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Error: ${err.message}</td></tr>`;
  }
}

document.getElementById('btn-recargar-solicitudes').addEventListener('click', cargarSolicitudesCiudadano);
document.getElementById('filtro-estado').addEventListener('change', cargarSolicitudesCiudadano);

async function cancelarSolicitud(id, radicado) {
  if (!confirm(`¿Confirma la cancelación del trámite ${radicado}?`)) return;
  try {
    await apiFetch(`/api/solicitudes/${id}`, { method: 'DELETE' });
    toast('info', '<i class="bi bi-slash-circle"></i> Solicitud cancelada', `El trámite ${radicado} fue cancelado exitosamente.`);
    cargarSolicitudesCiudadano();
  } catch (err) {
    toast('error', 'Error al cancelar', err.message);
  }
}

// ═══════════════════════════════════════════════════════
// CONSULTA PÚBLICA POR RADICADO (RF-05)
// ═══════════════════════════════════════════════════════
document.getElementById('btn-buscar-radicado').addEventListener('click', buscarPorRadicado);
document.getElementById('input-buscar-radicado').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') buscarPorRadicado();
});

async function buscarPorRadicado() {
  const val    = document.getElementById('input-buscar-radicado').value.trim();
  const resEl  = document.getElementById('resultado-radicado');
  if (!val) return;

  resEl.classList.add('hidden');
  resEl.innerHTML = '';

  try {
    const s = await apiFetch(`/api/solicitudes/seguimiento/${encodeURIComponent(val)}`);
    resEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div>
          <h4 style="font-size:16px;font-weight:700"><i class="bi bi-file-earmark-text"></i> ${s.tipoTramite?.nombre || 'Trámite'}</h4>
          <code style="font-size:12px;color:#60a5fa"><i class="bi bi-hash"></i> ${s.radicado}</code>
        </div>
        ${estadoBadge(s.estado)}
      </div>
      <div class="result-detail">
        <div class="result-field"><span class="label"><i class="bi bi-person"></i> Ciudadano</span><span class="value">${s.ciudadano?.nombre || '—'}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-credit-card-2-front"></i> Documento</span><span class="value">${s.ciudadano?.documentoIdentidad || '—'}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-signpost-2"></i> Predio</span><span class="value">${s.direccionPredio}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-geo-alt"></i> Barrio / Vereda</span><span class="value">${s.barrioVereda}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-calendar-event"></i> Fecha Radicación</span><span class="value">${formatFecha(s.createdAt)}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-clock-history"></i> Última Actualización</span><span class="value">${formatFecha(s.updatedAt)}</span></div>
        ${s.motivoRechazo ? `<div class="result-field" style="grid-column:1/-1"><span class="label"><i class="bi bi-exclamation-triangle"></i> Motivo Rechazo</span><span class="value" style="color:#fc8181">${s.motivoRechazo}</span></div>` : ''}
        <div class="result-field" style="grid-column:1/-1"><span class="label"><i class="bi bi-qr-code"></i> Código QR de Verificación</span><span class="value" style="font-size:12px;font-family:monospace;word-break:break-all">${s.codigoVerificacionQr}</span></div>
      </div>
    `;
    resEl.classList.remove('hidden');
  } catch (err) {
    resEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
    resEl.classList.remove('hidden');
  }
}

// Función auxiliar para "Ver" desde la tabla de Mis Solicitudes
async function verDetalleRadicado(radicado) {
  activarTab('tab-consultar');
  document.getElementById('input-buscar-radicado').value = radicado;
  setTimeout(buscarPorRadicado, 100);
}

// ═══════════════════════════════════════════════════════
// VERIFICACIÓN QR (RF-06)
// ═══════════════════════════════════════════════════════
document.getElementById('btn-buscar-qr').addEventListener('click', verificarQR);
document.getElementById('input-buscar-qr').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verificarQR();
});

async function verificarQR() {
  const val   = document.getElementById('input-buscar-qr').value.trim();
  const resEl = document.getElementById('resultado-qr');
  if (!val) return;

  resEl.classList.add('hidden');
  try {
    const v = await apiFetch(`/api/solicitudes/verificar/${encodeURIComponent(val)}`);
    resEl.innerHTML = `
      <div class="result-valid ${v.valido ? 'valido' : 'invalido'}">
        ${v.valido
          ? '<i class="bi bi-patch-check-fill"></i> CERTIFICADO AUTÉNTICO Y VIGENTE'
          : '<i class="bi bi-exclamation-triangle-fill"></i> CERTIFICADO NO VÁLIDO O PENDIENTE DE APROBACIÓN'}
      </div>
      <div class="result-detail">
        <div class="result-field"><span class="label"><i class="bi bi-hash"></i> N° Radicado</span><span class="value">${v.radicado}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-circle-half"></i> Estado</span><span class="value">${v.estadoLabel || v.estado}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-file-text"></i> Tipo de Trámite</span><span class="value">${v.tipoTramite}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-person"></i> Ciudadano</span><span class="value">${v.ciudadano}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-credit-card-2-front"></i> Documento</span><span class="value">${v.documentoIdentidad}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-house"></i> Predio</span><span class="value">${v.direccionPredio}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-calendar-check"></i> Fecha Emisión</span><span class="value">${formatFecha(v.fechaEmision)}</span></div>
        <div class="result-field"><span class="label"><i class="bi bi-building"></i> Entidad Emisora</span><span class="value">${v.entidadEmisora}</span></div>
      </div>
    `;
    resEl.classList.remove('hidden');
  } catch (err) {
    resEl.innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
    resEl.classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════════════
// PANEL DE FUNCIONARIO — DASHBOARD Y GESTIÓN
// ═══════════════════════════════════════════════════════
async function cargarMetricas() {
  if (!APP.token || APP.usuario?.rol !== 'funcionario') return;
  try {
    const m = await apiFetch('/api/solicitudes/metricas');
    document.getElementById('metric-total').textContent     = m.total;
    document.getElementById('metric-radicadas').textContent = m.radicadas;
    document.getElementById('metric-revision').textContent  = m.enRevision;
    document.getElementById('metric-aprobadas').textContent = m.aprobadas;
    document.getElementById('metric-rechazadas').textContent= m.rechazadas;
    actualizarBannerStats(m);
  } catch (err) {
    console.warn('[Métricas]', err.message);
  }
}

async function actualizarBannerStats(m) {
  if (!m) {
    try { m = await apiFetch('/api/solicitudes/metricas'); } catch { return; }
  }
  document.getElementById('stat-total').textContent    = `${m.total} Trámites`;
  document.getElementById('stat-aprobadas').textContent= `${m.aprobadas} Aprobados`;
  document.getElementById('stat-revision').textContent = `${m.enRevision} En Revisión`;
  document.getElementById('stat-radicadas').textContent= `${m.radicadas} Radicados`;
}

async function cargarSolicitudesAdmin() {
  if (!APP.token || APP.usuario?.rol !== 'funcionario') return;
  const tbody = document.getElementById('tabla-admin-body');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Cargando...</td></tr>';

  try {
    const lista = await apiFetch('/api/solicitudes');

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hay solicitudes activas.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(s => `
      <tr>
        <td><code style="font-size:11px;color:#60a5fa"><i class="bi bi-hash"></i> ${s.radicado}</code></td>
        <td>
          <div style="font-size:13px;font-weight:600"><i class="bi bi-person"></i> ${s.ciudadano?.nombre || '—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${s.ciudadano?.email || ''}</div>
        </td>
        <td style="font-size:12px"><i class="bi bi-file-text"></i> ${s.tipoTramite?.nombre || '—'}</td>
        <td style="font-size:12px"><i class="bi bi-house"></i> ${s.direccionPredio}<br><span style="color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${s.barrioVereda}</span></td>
        <td style="font-size:12px;white-space:nowrap"><i class="bi bi-calendar3"></i> ${formatFecha(s.createdAt)}</td>
        <td>${estadoBadge(s.estado)}</td>
        <td>
          <button class="btn btn-sm btn-warning"
            onclick="abrirModalEstado(${s.id}, '${s.radicado}', '${s.ciudadano?.nombre || 'N/A'}', '${s.estado}')">
            <i class="bi bi-pencil-square"></i> Gestionar
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Error: ${err.message}</td></tr>`;
  }
}

document.getElementById('btn-recargar-admin')?.addEventListener('click', () => {
  cargarMetricas();
  cargarSolicitudesAdmin();
});

// ═══════════════════════════════════════════════════════
// MODAL DE CAMBIO DE ESTADO (Funcionario)
// ═══════════════════════════════════════════════════════
function abrirModalEstado(id, radicado, ciudadano, estadoActual) {
  APP.modalData = { id, radicado };
  document.getElementById('modal-radicado-text').textContent   = radicado;
  document.getElementById('modal-ciudadano-text').textContent  = ciudadano;
  document.getElementById('modal-estado-actual').innerHTML     = estadoBadge(estadoActual);
  document.getElementById('modal-motivo-rechazo').value        = '';
  document.getElementById('motivo-rechazo-group').style.display= 'none';
  document.getElementById('modal-nuevo-estado').value          = 'en_revision';
  document.getElementById('modal-estado').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('modal-estado').classList.add('hidden');
  APP.modalData = null;
}

document.getElementById('modal-close').addEventListener('click', cerrarModal);
document.getElementById('modal-cancel-btn').addEventListener('click', cerrarModal);
document.getElementById('modal-estado').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) cerrarModal();
});

document.getElementById('modal-nuevo-estado').addEventListener('change', function() {
  document.getElementById('motivo-rechazo-group').style.display =
    this.value === 'rechazada' ? 'block' : 'none';
});

document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
  if (!APP.modalData) return;
  const nuevoEstado    = document.getElementById('modal-nuevo-estado').value;
  const motivoRechazo  = document.getElementById('modal-motivo-rechazo').value;
  const btn            = document.getElementById('modal-confirm-btn');

  if (nuevoEstado === 'rechazada' && !motivoRechazo.trim()) {
    toast('warning', 'Campo requerido', 'Debe indicar el motivo del rechazo.');
    return;
  }

  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    await apiFetch(`/api/solicitudes/${APP.modalData.id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado: nuevoEstado, motivoRechazo })
    });
    toast('success', '<i class="bi bi-arrow-repeat"></i> Estado actualizado', `${APP.modalData.radicado} → ${nuevoEstado}. Ciudadano notificado en tiempo real.`);
    cerrarModal();
    cargarMetricas();
    cargarSolicitudesAdmin();
  } catch (err) {
    toast('error', 'Error al actualizar', err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Confirmar Cambio';
  }
});

// ═══════════════════════════════════════════════════════
// FEED DE ACTIVIDAD EN TIEMPO REAL (Funcionario)
// ═══════════════════════════════════════════════════════
function agregarAlFeed({ icon, iconClass, titulo, desc, time }) {
  const feed  = document.getElementById('activity-feed');
  const empty = feed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = 'feed-item';
  el.innerHTML = `
    <div class="feed-icon ${iconClass}">${icon}</div>
    <div class="feed-content">
      <div class="feed-title"><i class="bi bi-dot"></i> ${titulo}</div>
      <div class="feed-desc">${desc}</div>
    </div>
    <div class="feed-time"><i class="bi bi-clock"></i> ${time}</div>
  `;
  feed.prepend(el);

  // Limitar a 50 items
  const items = feed.querySelectorAll('.feed-item');
  if (items.length > 50) items[items.length - 1].remove();
}

document.getElementById('btn-limpiar-feed')?.addEventListener('click', () => {
  const feed = document.getElementById('activity-feed');
  feed.innerHTML = '<div class="feed-empty"><i class="bi bi-broadcast" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4"></i> Feed limpiado. Esperando nueva actividad...</div>';
});

// ═══════════════════════════════════════════════════════
// UTILIDADES DE ALERTAS
// ═══════════════════════════════════════════════════════
function mostrarAlerta(el, msg, tipo) {
  if (!msg) { el.classList.add('hidden'); return; }
  el.className = `alert alert-${tipo}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════
// HEALTH CHECK Y UPTIME
// ═══════════════════════════════════════════════════════
async function checkHealth() {
  try {
    const h = await apiFetch('/api/health');
    const uptime = Math.floor(h.uptime);
    const h2 = Math.floor(uptime / 3600);
    const m2 = Math.floor((uptime % 3600) / 60);
    const s2 = uptime % 60;
    document.getElementById('footer-uptime').textContent =
      `Servidor activo: ${h2}h ${m2}m ${s2}s`;
  } catch (err) {
    document.getElementById('system-status-text').textContent = 'Sistema en Mantenimiento';
  }
}

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════
(async function init() {
  // Restaurar sesión previa
  restaurarSesion();

  // Cargar catálogo de trámites
  await cargarTiposTramite();

  // Health check
  checkHealth();
  setInterval(checkHealth, 30000);

  // Mostrar notice de auth si no hay sesión
  if (!APP.token) {
    document.getElementById('notice-auth-radicar')?.classList.remove('hidden');
  }

  // Cargar métricas del banner si hay token de funcionario
  if (APP.token && APP.usuario?.rol === 'funcionario') {
    actualizarBannerStats();
  } else if (APP.token) {
    // Ciudadano: cargar stats públicas (solo con auth)
    actualizarBannerStats();
  }

  console.log('[Portal] Sistema de Trámites v2.0 — Tiempo Real activo.');
})();
