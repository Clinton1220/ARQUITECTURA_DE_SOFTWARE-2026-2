const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipoTramite = sequelize.define('TipoTramite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  costo: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  vigenciaDias: {
    type: DataTypes.INTEGER,
    defaultValue: 90,
    allowNull: false,
    field: 'vigencia_dias',
    validate: {
      min: 1
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'tipos_tramite',
  underscored: true,
  timestamps: true
});

module.exports = TipoTramite;
