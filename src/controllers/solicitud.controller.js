const crypto = require('crypto');
const { SolicitudTramite, TipoTramite, Usuario, AuditoriaTramite, sequelize } = require('../models');

// Generador de número de radicado oficial 24/7
const generarNumeroRadicado = () => {
  const anio = new Date().getFullYear();
  const aleatorio = Math.floor(10000 + Math.random() * 90000);
  return `RAD-${anio}-${aleatorio}`;
};

// Etiquetas de estado para notificaciones
const ESTADO_LABELS = {
  radicada: '📝 Radicada',
  en_revision: '🔍 En Revisión',
  aprobada: '✅ Aprobada',
  rechazada: '❌ Rechazada',
  cancelada: '🚫 Cancelada'
};

// CREATE (HU-01: Radicación de solicitud de certificado)
exports.crear = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { tipoTramiteId, direccionPredio, barrioVereda, observaciones } = req.body;

    if (!tipoTramiteId || !direccionPredio || !barrioVereda) {
      await t.rollback();
      return res.status(400).json({
        error: 'tipoTramiteId, direccionPredio y barrioVereda son obligatorios'
      });
    }

    const tipo = await TipoTramite.findOne({
      where: { id: tipoTramiteId, activo: true },
      transaction: t
    });

    if (!tipo) {
      await t.rollback();
      return res.status(404).json({
        error: 'El tipo de trámite especificado no existe o no se encuentra activo'
      });
    }

    // Regla de negocio: Evitar duplicidad de solicitudes activas
    const solicitudPrevia = await SolicitudTramite.findOne({
      where: {
        usuarioId: req.usuario.id,
        tipoTramiteId,
        direccionPredio,
        activo: true,
        estado: ['radicada', 'en_revision']
      },
      transaction: t
    });

    if (solicitudPrevia) {
      await t.rollback();
      return res.status(409).json({
        error: 'Ya existe una solicitud activa en trámite para este predio y tipo de certificado',
        radicadoExistente: solicitudPrevia.radicado
      });
    }

    const radicado = generarNumeroRadicado();
    const qrPayload = `${radicado}|${req.usuario.documentoIdentidad}|${Date.now()}`;
    const codigoQr = `QR-ALCALDIA-${crypto.createHash('sha256').update(qrPayload).digest('hex').substring(0, 16).toUpperCase()}`;
    const hashDocumento = crypto.createHash('sha256').update(`${radicado}|${direccionPredio}`).digest('hex');

    const solicitud = await SolicitudTramite.create({
      radicado,
      usuarioId: req.usuario.id,
      tipoTramiteId,
      direccionPredio,
      barrioVereda,
      observaciones: observaciones || '',
      estado: 'radicada',
      codigoVerificacionQr: codigoQr,
      hashDocumento,
      activo: true
    }, { transaction: t });

    // Auditoría inmutable (RF-09 / Personería)
    await AuditoriaTramite.create({
      solicitudId: solicitud.id,
      usuarioId: req.usuario.id,
      accion: 'RADICACION',
      estadoAnterior: null,
      estadoNuevo: 'radicada',
      detalle: `Solicitud radicada en línea para predio en ${barrioVereda}`,
      ipOrigen: req.ip || req.connection.remoteAddress
    }, { transaction: t });

    await t.commit();

    // ══════════════════════════════════════════════════════════
    // NOTIFICACIÓN EN TIEMPO REAL: Nueva solicitud → todos los funcionarios
    // ══════════════════════════════════════════════════════════
    const io = req.app.get('io');
    if (io) {
      const payload = {
        tipo: 'NUEVA_SOLICITUD',
        radicado,
        tramite: tipo.nombre,
        ciudadano: req.usuario.nombre,
        barrioVereda,
        timestamp: new Date().toISOString()
      };
      io.to('sala-funcionarios').emit('nueva_solicitud', payload);
      io.to('sala-general').emit('metricas_actualizadas', { accion: 'nueva_solicitud' });
    }

    return res.status(201).json({
      mensaje: 'Solicitud radicada exitosamente en la Alcaldía Municipal',
      solicitud
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// READ: Listar solicitudes (solo registros activos: borrado lógico)
exports.listar = async (req, res, next) => {
  try {
    const where = { activo: true };

    if (req.usuario.rol === 'ciudadano') {
      where.usuarioId = req.usuario.id;
    }

    if (req.query.estado) {
      where.estado = req.query.estado;
    }

    const solicitudes = await SolicitudTramite.findAll({
      where,
      include: [
        {
          model: TipoTramite,
          as: 'tipoTramite',
          attributes: ['id', 'codigo', 'nombre', 'vigenciaDias']
        },
        {
          model: Usuario,
          as: 'ciudadano',
          attributes: ['id', 'nombre', 'documentoIdentidad', 'email']
        }
      ],
      order: [['id', 'DESC']]
    });

    return res.status(200).json(solicitudes);
  } catch (error) {
    next(error);
  }
};

// READ: Consulta pública por radicado (RF-05 — Seguimiento ciudadano 24/7)
exports.obtenerPorRadicado = async (req, res, next) => {
  try {
    const { radicado } = req.params;

    const solicitud = await SolicitudTramite.findOne({
      where: { radicado, activo: true },
      include: [
        { model: TipoTramite, as: 'tipoTramite', attributes: ['codigo', 'nombre', 'vigenciaDias'] },
        { model: Usuario, as: 'ciudadano', attributes: ['nombre', 'documentoIdentidad'] }
      ]
    });

    if (!solicitud) {
      return res.status(404).json({
        error: `No se encontró ninguna solicitud activa con el radicado ${radicado}`
      });
    }

    return res.status(200).json(solicitud);
  } catch (error) {
    next(error);
  }
};

// UPDATE: Actualizar solicitud o cambiar estado (Gestión administrativa - RF-07)
exports.actualizar = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { direccionPredio, barrioVereda, observaciones, estado, motivoRechazo } = req.body;

    const solicitud = await SolicitudTramite.findOne({
      where: { id, activo: true },
      include: [
        { model: TipoTramite, as: 'tipoTramite', attributes: ['nombre'] },
        { model: Usuario, as: 'ciudadano', attributes: ['id', 'nombre'] }
      ],
      transaction: t
    });

    if (!solicitud) {
      await t.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada o inactiva' });
    }

    if (req.usuario.rol === 'ciudadano') {
      if (solicitud.usuarioId !== req.usuario.id) {
        await t.rollback();
        return res.status(403).json({ error: 'No tiene permisos para modificar esta solicitud' });
      }
      if (solicitud.estado !== 'radicada') {
        await t.rollback();
        return res.status(400).json({
          error: 'No se puede editar una solicitud que ya se encuentra en revisión o aprobada'
        });
      }
    }

    const estadoAnterior = solicitud.estado;
    const nuevoEstado = (req.usuario.rol !== 'ciudadano' && estado) ? estado : solicitud.estado;

    await solicitud.update({
      direccionPredio: direccionPredio || solicitud.direccionPredio,
      barrioVereda: barrioVereda || solicitud.barrioVereda,
      observaciones: observaciones !== undefined ? observaciones : solicitud.observaciones,
      estado: nuevoEstado,
      motivoRechazo: motivoRechazo || solicitud.motivoRechazo
    }, { transaction: t });

    if (estadoAnterior !== nuevoEstado) {
      await AuditoriaTramite.create({
        solicitudId: solicitud.id,
        usuarioId: req.usuario.id,
        accion: 'CAMBIO_ESTADO',
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        detalle: `Estado modificado de ${estadoAnterior} a ${nuevoEstado}`,
        ipOrigen: req.ip || req.connection.remoteAddress
      }, { transaction: t });
    }

    await t.commit();

    // ══════════════════════════════════════════════════════════
    // NOTIFICACIÓN EN TIEMPO REAL: Cambio de estado → ciudadano afectado
    // ══════════════════════════════════════════════════════════
    if (estadoAnterior !== nuevoEstado) {
      const io = req.app.get('io');
      if (io) {
        const ciudadanoId = solicitud.ciudadano ? solicitud.ciudadano.id : solicitud.usuarioId;
        const payload = {
          tipo: 'CAMBIO_ESTADO',
          radicado: solicitud.radicado,
          tramite: solicitud.tipoTramite ? solicitud.tipoTramite.nombre : 'N/A',
          estadoAnterior,
          estadoNuevo: nuevoEstado,
          estadoLabel: ESTADO_LABELS[nuevoEstado] || nuevoEstado,
          funcionario: req.usuario.nombre,
          timestamp: new Date().toISOString()
        };
        // Notificar al ciudadano específico
        io.to(`sala-ciudadano-${ciudadanoId}`).emit('estado_actualizado', payload);
        // Notificar a todos los funcionarios también
        io.to('sala-funcionarios').emit('estado_actualizado', payload);
        io.to('sala-general').emit('metricas_actualizadas', { accion: 'cambio_estado', nuevoEstado });
      }
    }

    return res.status(200).json(solicitud);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// DELETE LÓGICO: Cancela y desactiva la solicitud conservando historial
exports.eliminar = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const solicitud = await SolicitudTramite.findOne({
      where: { id, activo: true },
      transaction: t
    });

    if (!solicitud) {
      await t.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (req.usuario.rol === 'ciudadano' && solicitud.usuarioId !== req.usuario.id) {
      await t.rollback();
      return res.status(403).json({ error: 'No autorizado para eliminar esta solicitud' });
    }

    const estadoAnterior = solicitud.estado;

    await solicitud.update({
      activo: false,
      estado: 'cancelada'
    }, { transaction: t });

    await AuditoriaTramite.create({
      solicitudId: solicitud.id,
      usuarioId: req.usuario.id,
      accion: 'ELIMINACION_LOGICA',
      estadoAnterior,
      estadoNuevo: 'cancelada',
      detalle: 'Solicitud cancelada y marcada inactiva por borrado lógico',
      ipOrigen: req.ip || req.connection.remoteAddress
    }, { transaction: t });

    await t.commit();

    // NOTIFICACIÓN EN TIEMPO REAL: Cancelación
    const io = req.app.get('io');
    if (io) {
      io.to('sala-funcionarios').emit('solicitud_cancelada', {
        radicado: solicitud.radicado,
        timestamp: new Date().toISOString()
      });
      io.to('sala-general').emit('metricas_actualizadas', { accion: 'cancelacion' });
    }

    return res.status(204).send();
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// Verificación pública de autenticidad de certificado (RF-06)
exports.verificarAutenticidad = async (req, res, next) => {
  try {
    const { codigoQr } = req.params;

    const solicitud = await SolicitudTramite.findOne({
      where: { codigoVerificacionQr: codigoQr, activo: true },
      include: [
        { model: TipoTramite, as: 'tipoTramite' },
        { model: Usuario, as: 'ciudadano', attributes: ['nombre', 'documentoIdentidad'] }
      ]
    });

    if (!solicitud) {
      return res.status(404).json({
        valido: false,
        mensaje: 'El código de verificación no corresponde a ningún certificado oficial emitido'
      });
    }

    return res.status(200).json({
      valido: solicitud.estado === 'aprobada',
      radicado: solicitud.radicado,
      estado: solicitud.estado,
      estadoLabel: ESTADO_LABELS[solicitud.estado] || solicitud.estado,
      tipoTramite: solicitud.tipoTramite.nombre,
      ciudadano: solicitud.ciudadano.nombre,
      documentoIdentidad: solicitud.ciudadano.documentoIdentidad,
      direccionPredio: solicitud.direccionPredio,
      fechaEmision: solicitud.updatedAt,
      entidadEmisora: 'Alcaldía Municipal - Secretaría de Gobierno'
    });
  } catch (error) {
    next(error);
  }
};

// DASHBOARD: Métricas agregadas en tiempo real para el panel de control
exports.metricas = async (req, res, next) => {
  try {
    const [total, radicadas, enRevision, aprobadas, rechazadas] = await Promise.all([
      SolicitudTramite.count({ where: { activo: true } }),
      SolicitudTramite.count({ where: { activo: true, estado: 'radicada' } }),
      SolicitudTramite.count({ where: { activo: true, estado: 'en_revision' } }),
      SolicitudTramite.count({ where: { activo: true, estado: 'aprobada' } }),
      SolicitudTramite.count({ where: { activo: true, estado: 'rechazada' } })
    ]);

    return res.status(200).json({
      total, radicadas, enRevision, aprobadas, rechazadas,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
