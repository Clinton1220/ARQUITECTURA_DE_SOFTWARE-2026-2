const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'alcaldia_secret_jwt_token_2026_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Registro de usuarios
exports.registro = async (req, res, next) => {
  try {
    const { nombre, documentoIdentidad, email, password, rol, telefono } = req.body;

    if (!nombre || !documentoIdentidad || !email || !password) {
      return res.status(400).json({
        error: 'nombre, documentoIdentidad, email y password son obligatorios'
      });
    }

    const existente = await Usuario.findOne({
      where: { email }
    });
    if (existente) {
      return res.status(409).json({
        error: 'El correo electrónico ya se encuentra registrado'
      });
    }

    const usuario = await Usuario.create({
      nombre,
      documentoIdentidad,
      email,
      passwordHash: password, // El hook antes de crear aplica bcrypt
      rol: rol || 'ciudadano',
      telefono
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        documentoIdentidad: usuario.documentoIdentidad,
        rol: usuario.rol
      }
    });
  } catch (error) {
    next(error);
  }
};

// Inicio de sesión (Login)
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'email y password son obligatorios'
      });
    }

    const usuario = await Usuario.findOne({
      where: { email, activo: true }
    });

    if (!usuario) {
      return res.status(401).json({
        error: 'Credenciales inválidas o usuario inactivo'
      });
    }

    const passwordValido = await usuario.validarPassword(password);
    if (!passwordValido) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      mensaje: 'Autenticación exitosa',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        documentoIdentidad: usuario.documentoIdentidad,
        rol: usuario.rol
      }
    });
  } catch (error) {
    next(error);
  }
};

// Perfil de usuario autenticado
exports.perfil = async (req, res) => {
  return res.status(200).json({ usuario: req.usuario });
};
