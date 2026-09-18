const jwt = require('jsonwebtoken');
const { Usuario, TipoTramite } = require('../src/models');

const JWT_SECRET = process.env.JWT_SECRET || 'alcaldia_secret_jwt_token_2026_secure';

const inicializarBaseDatosPrueba = async () => {
  // Crear tipos de trámite base para tests
  await TipoTramite.findOrCreate({
    where: { codigo: 'CERT-RESIDENCIA' },
    defaults: {
      codigo: 'CERT-RESIDENCIA',
      nombre: 'Certificado de Residencia',
      descripcion: 'Prueba unitaria',
      costo: 0.00,
      vigenciaDias: 90,
      activo: true
    }
  });
};

const crearUsuarioPrueba = async (rol = 'ciudadano', doc = '123456789', email = 'ciudadano@test.com') => {
  let usuario = await Usuario.findOne({ where: { email } });
  if (!usuario) {
    usuario = await Usuario.create({
      nombre: 'Usuario de Pruebas',
      documentoIdentidad: doc,
      email,
      passwordHash: 'PasswordSeguro123*',
      rol,
      telefono: '3100000000',
      activo: true
    });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return { usuario, token };
};

module.exports = {
  inicializarBaseDatosPrueba,
  crearUsuarioPrueba
};
