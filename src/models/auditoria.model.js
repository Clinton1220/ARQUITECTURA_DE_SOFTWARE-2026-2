const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditoriaTramite = sequelize.define('AuditoriaTramite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  solicitudId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'solicitud_id'
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'usuario_id'
  },
  accion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  estadoAnterior: {
    type: DataTypes.STRING(25),
    allowNull: true,
    field: 'estado_anterior'
  },
  estadoNuevo: {
    type: DataTypes.STRING(25),
    allowNull: true,
    field: 'estado_nuevo'
  },
  detalle: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipOrigen: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_origen'
  }
}, {
  tableName: 'auditoria_tramites',
  underscored: true,
  timestamps: true,
  updatedAt: false // Inmutable: solo inserciones históricas
});

module.exports = AuditoriaTramite;
