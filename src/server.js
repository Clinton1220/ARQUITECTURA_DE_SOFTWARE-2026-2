const app = require('./app');
const { sequelize, TipoTramite, Usuario } = require('./models');

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();
    console.log('[BD] Conexión a la base de datos establecida correctamente.');

    // En desarrollo/demostración sincronizamos el esquema
    await sequelize.sync();
    console.log('[BD] Modelos sincronizados con el esquema de base de datos.');

    // Poblado automático de datos base (Seeding) si la base está vacía
    const tiposCount = await TipoTramite.count();
    if (tiposCount === 0) {
      await TipoTramite.bulkCreate([
        {
          codigo: 'CERT-RESIDENCIA',
          nombre: 'Certificado de Residencia',
          descripcion: 'Acredita que el ciudadano reside formalmente en el municipio.',
          costo: 0.00,
          vigenciaDias: 90,
          activo: true
        },
        {
          codigo: 'CERT-PAZ-SALVO',
          nombre: 'Certificado de Paz y Salvo Municipal',
          descripcion: 'Acredita no adeudar obligaciones tributarias municipales.',
          costo: 0.00,
          vigenciaDias: 30,
          activo: true
        }
      ]);
      console.log('[BD] Tipos de trámites iniciales sembrados exitosamente.');
    }

    // Usuario demo funcionario si no existe
    const usuarioCount = await Usuario.count();
    if (usuarioCount === 0) {
      await Usuario.create({
        nombre: 'Funcionario de Gobierno Demo',
        documentoIdentidad: '1098765432',
        email: 'funcionario@alcaldia.gov.co',
        passwordHash: 'Alcaldia2026*', // El hook encripta con bcrypt
        rol: 'funcionario',
        telefono: '3001234567',
        activo: true
      });
      console.log('[BD] Usuario funcionario demo creado (funcionario@alcaldia.gov.co / Alcaldia2026*).');
    }

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🏛️  SISTEMA DE TRÁMITES Y CERTIFICADOS - ALCALDÍA MUNICIPAL`);
      console.log(`🚀  Servidor activo en: http://localhost:${PORT}`);
      console.log(`📄  Portal Ciudadano 24/7 en: http://localhost:${PORT}`);
      console.log(`🏥  Health check en: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

iniciarServidor();
