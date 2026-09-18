const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'alcaldia_secret_jwt_token_2026_secure';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado: Token JWT ausente o inválido',
        codigo: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        error: 'No autorizado: Token expirado o con firma inválida',
        codigo: 'AUTH_TOKEN_INVALID'
      });
    }

    const usuario = await Usuario.findOne({
      where: { id: decoded.id, activo: true },
      attributes: ['id', 'nombre', 'documentoIdentidad', 'email', 'rol']
    });

    if (!usuario) {
      return res.status(401).json({
        error: 'No autorizado: Usuario no encontrado o inactivo',
        codigo: 'AUTH_USER_INACTIVE'
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
};

const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado: El rol '${req.usuario.rol}' no tiene permisos para esta operación`,
        codigo: 'FORBIDDEN_ROLE'
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  autorizarRoles
};
