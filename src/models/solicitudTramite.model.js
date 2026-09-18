const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SolicitudTramite = sequelize.define('SolicitudTramite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  radicado: {
    type: DataTypes.STRING(35),
    allowNull: false,
    unique: true
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'usuario_id'
  },
  tipoTramiteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tipo_tramite_id'
  },
  direccionPredio: {
    type: DataTypes.STRING(180),
    allowNull: false,
    field: 'direccion_predio'
  },
  barrioVereda: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'barrio_vereda'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('radicada', 'en_revision', 'aprobada', 'rechazada', 'cancelada'),
    defaultValue: 'radicada',
    allowNull: false
  },
  motivoRechazo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motivo_rechazo'
  },
  codigoVerificacionQr: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    field: 'codigo_verificacion_qr'
  },
  hashDocumento: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'hash_documento'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'solicitudes_tramite',
  underscored: true,
  timestamps: true
});

module.exports = SolicitudTramite;
