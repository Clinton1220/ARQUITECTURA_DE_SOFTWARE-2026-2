const crypto = require('crypto');
const { SolicitudTramite, TipoTramite, Usuario, AuditoriaTramite, sequelize } = require('../models');

// Generador de número de radicado oficial 24/7
const generarNumeroRadicado = () => {
  const anio = new Date().getFullYear();
  const aleatorio = Math.floor(10000 + Math.random() * 90000);
  return `RAD-${anio}-${aleatorio}`;
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

    // Verificar que el tipo de trámite exista y esté habilitado
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

    // Regla de negocio: Evitar duplicidad de solicitudes activas para el mismo predio y trámite
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

    // Registro inmutable de auditoría (RF-09 / Personería)
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

    // Si es ciudadano, solo consulta sus propias solicitudes
    if (req.usuario.rol === 'ciudadano') {
      where.usuarioId = req.usuario.id;
    }

    // Filtro opcional por estado
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

// READ: Consulta por radicado (Seguimiento ciudadano 24/7 sin filas - RF-05)
exports.obtenerPorRadicado = async (req, res, next) => {
  try {
    const { radicado } = req.params;

    const solicitud = await SolicitudTramite.findOne({
      where: { radicado, activo: true },
      include: [
        {
          model: TipoTramite,
          as: 'tipoTramite',
          attributes: ['codigo', 'nombre', 'vigenciaDias']
        },
        {
          model: Usuario,
          as: 'ciudadano',
          attributes: ['nombre', 'documentoIdentidad']
        }
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
      transaction: t
    });

    if (!solicitud) {
      await t.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada o inactiva' });
    }

    // Si es ciudadano, solo puede modificar si aún está en estado 'radicada' y es de su propiedad
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

    // Auditoría si cambió el estado
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
    return res.status(200).json(solicitud);
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// DELETE LÓGICO: Cancela y desactiva la solicitud conservando el registro histórico
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

    // Verificar propiedad si es ciudadano
    if (req.usuario.rol === 'ciudadano' && solicitud.usuarioId !== req.usuario.id) {
      await t.rollback();
      return res.status(403).json({ error: 'No autorizado para eliminar esta solicitud' });
    }

    // Borrado lógico: activo = false y estado = 'cancelada'
    await solicitud.update({
      activo: false,
      estado: 'cancelada'
    }, { transaction: t });

    // Auditoría de eliminación lógica
    await AuditoriaTramite.create({
      solicitudId: solicitud.id,
      usuarioId: req.usuario.id,
      accion: 'ELIMINACION_LOGICA',
      estadoAnterior: solicitud.estado,
      estadoNuevo: 'cancelada',
      detalle: 'Solicitud cancelada y marcada inactiva por borrado lógico',
      ipOrigen: req.ip || req.connection.remoteAddress
    }, { transaction: t });

    await t.commit();
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
