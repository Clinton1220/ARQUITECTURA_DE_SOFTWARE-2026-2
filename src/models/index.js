const sequelize = require('../config/database');
const Usuario = require('./usuario.model');
const TipoTramite = require('./tipoTramite.model');
const SolicitudTramite = require('./solicitudTramite.model');
const AuditoriaTramite = require('./auditoria.model');

// Relaciones Usuario <-> SolicitudTramite
Usuario.hasMany(SolicitudTramite, { foreignKey: 'usuarioId', as: 'solicitudes' });
SolicitudTramite.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'ciudadano' });

// Relaciones TipoTramite <-> SolicitudTramite
TipoTramite.hasMany(SolicitudTramite, { foreignKey: 'tipoTramiteId', as: 'solicitudes' });
SolicitudTramite.belongsTo(TipoTramite, { foreignKey: 'tipoTramiteId', as: 'tipoTramite' });

// Relaciones SolicitudTramite <-> AuditoriaTramite
SolicitudTramite.hasMany(AuditoriaTramite, { foreignKey: 'solicitudId', as: 'auditorias' });
AuditoriaTramite.belongsTo(SolicitudTramite, { foreignKey: 'solicitudId', as: 'solicitud' });

// Relaciones Usuario <-> AuditoriaTramite
Usuario.hasMany(AuditoriaTramite, { foreignKey: 'usuarioId', as: 'accionesAuditoria' });
AuditoriaTramite.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'operador' });

module.exports = {
  sequelize,
  Usuario,
  TipoTramite,
  SolicitudTramite,
  AuditoriaTramite
};
