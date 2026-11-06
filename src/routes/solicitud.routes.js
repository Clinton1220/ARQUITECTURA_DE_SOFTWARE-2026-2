/**
 * ============================================================================
 * ENRUTADOR: SOLICITUDES DE TRÁMITES Y CERTIFICADOS MUNICIPALES
 * ============================================================================
 * Capa: Enrutamiento y Exposición REST (N-Capas - Corte Vertical HU-01)
 * Patrón Arquitectónico: Strangler Fig + RESTful Resource Routing
 * Atributos de Calidad Asociados:
 *   - AC-01: Seguridad (Verificación estricta de JWT y control de acceso)
 *   - AC-02: Eficiencia de Desempeño (Rutas optimizadas P95 <= 800ms)
 *   - AC-03: Mantenibilidad (Desacoplamiento total entre rutas, controlador y ORM)
 *   - AC-04: Confiabilidad (Trazabilidad y respuestas estandarizadas)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const solicitudCtrl = require('../controllers/solicitud.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// ────────────────────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS (Consulta Ciudadana 24/7 sin filas ni autenticación requerida)
// ────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/solicitudes/seguimiento/:radicado
 * @desc    Consulta el estado en tiempo real de una solicitud mediante su número de radicado oficial.
 * @access  Público (RF-05: Consulta ciudadana sin desplazamientos presenciales)
 * @params  radicado {string} Formato RAD-YYYY-XXXXX
 * @returns 200 OK con los datos de la solicitud y tipo de trámite
 *          404 Not Found si el radicado no existe o está inactivo
 */
router.get('/seguimiento/:radicado', solicitudCtrl.obtenerPorRadicado);

/**
 * @route   GET /api/solicitudes/verificar/:codigoQr
 * @desc    Valida la autenticidad e integridad jurídica de un certificado expedido.
 * @access  Público (RF-06: Verificación de fe pública para juzgados, bancos y terceros)
 * @params  codigoQr {string} Código de verificación QR con firma hash SHA-256
 * @returns 200 OK con confirmación de validez, emisor oficial y datos del titular
 *          404 Not Found si el código no corresponde a un certificado emitido
 */
router.get('/verificar/:codigoQr', solicitudCtrl.verificarAutenticidad);

// ────────────────────────────────────────────────────────────────────────────
// RUTAS PROTEGIDAS / ADMINISTRATIVAS (Requieren autenticación mediante JWT)
// ────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/solicitudes/metricas
 * @desc    Dashboard de métricas agregadas en tiempo real para funcionarios (totales por estado).
 * @access  Protegido (Requiere JWT - Funcionarios de Gobierno)
 * @returns 200 OK { total, radicadas, enRevision, aprobadas, rechazadas, timestamp }
 *          401 Unauthorized si el token no es provisto o es inválido
 */
router.get('/metricas', authMiddleware, solicitudCtrl.metricas);

/**
 * @route   POST /api/solicitudes
 * @desc    HU-01 (Corte Vertical): Radicación en línea de una nueva solicitud de certificado.
 * @access  Protegido (Requiere JWT - Ciudadano autenticado)
 * @body    { tipoTramiteId, direccionPredio, barrioVereda, observaciones }
 * @returns 201 Created con el nuevo radicado oficial generado, hash y código QR
 *          400 Bad Request si faltan campos obligatorios
 *          401 Unauthorized si falta el token de autenticación
 *          404 Not Found si el tipo de trámite no existe o está inactivo
 *          409 Conflict si ya existe una solicitud en curso para el mismo predio y trámite
 */
router.post('/', authMiddleware, solicitudCtrl.crear);

/**
 * @route   GET /api/solicitudes
 * @desc    Listado filtrado de solicitudes activas (borrado lógico: activo = true).
 * @access  Protegido (Ciudadano ve solo las suyas; Funcionario ve todas las radicadas)
 * @query   estado {string} Opcional: 'radicada' | 'en_revision' | 'aprobada' | 'rechazada'
 * @returns 200 OK con la lista de solicitudes ordenadas descendentemente
 *          401 Unauthorized si el token es inválido
 */
router.get('/', authMiddleware, solicitudCtrl.listar);

/**
 * @route   PUT /api/solicitudes/:id
 * @desc    Actualización de solicitud o cambio administrativo de estado (RF-07).
 * @access  Protegido (Ciudadano puede editar si estado='radicada'; Funcionario gestiona estados)
 * @params  id {number} ID primario de la solicitud
 * @body    { direccionPredio?, barrioVereda?, observaciones?, estado?, motivoRechazo? }
 * @returns 200 OK con la solicitud actualizada y notificación WebSocket emitida
 *          400 Bad Request si la transición de estado o datos son inválidos
 *          403 Forbidden si el usuario no tiene permisos sobre la solicitud
 *          404 Not Found si la solicitud no existe o está inactiva
 */
router.put('/:id', authMiddleware, solicitudCtrl.actualizar);

/**
 * @route   DELETE /api/solicitudes/:id
 * @desc    Cancelación y borrado lógico de la solicitud (marca activo=false, estado='cancelada').
 * @access  Protegido (Ciudadano dueño de la solicitud o Funcionario administrativo)
 * @params  id {number} ID primario de la solicitud
 * @returns 204 No Content sin cuerpo tras el borrado lógico exitoso
 *          403 Forbidden si no tiene permisos para cancelar la solicitud
 *          404 Not Found si la solicitud no existe
 */
router.delete('/:id', authMiddleware, solicitudCtrl.eliminar);

module.exports = router;
