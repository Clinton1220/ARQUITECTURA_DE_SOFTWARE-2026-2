require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sequelize, TipoTramite, Usuario } = require('./models');

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP y adjuntar Socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

// Exponer io globalmente para que los controladores emitan eventos
app.set('io', io);

// Gestión de salas y conexiones en tiempo real
io.on('connection', (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);

  // El cliente anuncia su rol para unirse a la sala correcta
  socket.on('autenticar', ({ rol, usuarioId }) => {
    socket.join('sala-general');
    if (rol === 'funcionario') {
      socket.join('sala-funcionarios');
      console.log(`[WS] Funcionario (ID:${usuarioId}) se unió a sala-funcionarios`);
    } else {
      socket.join(`sala-ciudadano-${usuarioId}`);
      console.log(`[WS] Ciudadano (ID:${usuarioId}) se unió a su sala personal`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Cliente desconectado: ${socket.id}`);
  });
});

const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();
    console.log('[BD] Conexión a la base de datos establecida correctamente.');

    await sequelize.sync();
    console.log('[BD] Modelos sincronizados con el esquema de base de datos.');

    // Seeding: Tipos de trámite
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
        },
        {
          codigo: 'CERT-ESTRATIFICACION',
          nombre: 'Certificado de Estratificación Socioeconómica',
          descripcion: 'Indica el estrato socioeconómico del inmueble según catastro municipal.',
          costo: 0.00,
          vigenciaDias: 365,
          activo: true
        },
        {
          codigo: 'CERT-NOMENCLATURA',
          nombre: 'Certificado de Nomenclatura y Dirección',
          descripcion: 'Certifica la dirección oficial asignada al predio por la Alcaldía.',
          costo: 5000,
          vigenciaDias: 180,
          activo: true
        }
      ]);
      console.log('[BD] Tipos de trámites iniciales sembrados exitosamente.');
    }

    // Seeding: Usuario demo funcionario
    const usuarioCount = await Usuario.count();
    if (usuarioCount === 0) {
      await Usuario.create({
        nombre: 'Funcionario de Gobierno Demo',
        documentoIdentidad: '1098765432',
        email: 'funcionario@alcaldia.gov.co',
        passwordHash: 'Alcaldia2026*',
        rol: 'funcionario',
        telefono: '3001234567',
        activo: true
      });
      console.log('[BD] Usuario funcionario demo creado (funcionario@alcaldia.gov.co / Alcaldia2026*).');
    }

    httpServer.listen(PORT, () => {
      console.log('=======================================================');
      console.log('🏛️  SISTEMA DE TRÁMITES Y CERTIFICADOS - ALCALDÍA MUNICIPAL');
      console.log(`🚀  Servidor activo en: http://localhost:${PORT}`);
      console.log(`📡  WebSockets activos (Socket.io) en: ws://localhost:${PORT}`);
      console.log(`📄  Portal Ciudadano 24/7 en: http://localhost:${PORT}`);
      console.log(`🏥  Health check en: http://localhost:${PORT}/api/health`);
      console.log('=======================================================');
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

iniciarServidor();
