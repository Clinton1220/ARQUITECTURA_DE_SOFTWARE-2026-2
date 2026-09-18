const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  documentoIdentidad: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    field: 'documento_identidad'
  },
  email: {
    type: DataTypes.STRING(160),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  rol: {
    type: DataTypes.ENUM('ciudadano', 'funcionario', 'admin'),
    defaultValue: 'ciudadano',
    allowNull: false
  },
  telefono: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'usuarios',
  underscored: true,
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash && !user.passwordHash.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && !user.passwordHash.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
      }
    }
  }
});

Usuario.prototype.validarPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = Usuario;
