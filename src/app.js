require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, TipoTramite } = require('./models');
const authRoutes = require('./routes/auth.routes');
const solicitudRoutes = require('./routes/solicitud.routes');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del portal ciudadano
app.use(express.static(path.join(__dirname, '../public')));

// Health check para monitoreo y auto-recuperación (AC-01 Confiabilidad)
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'CONNECTED',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'DISCONNECTED',
      error: error.message
    });
  }
});

// Catálogo de tipos de trámites disponibles
app.get('/api/tipos-tramite', async (req, res, next) => {
  try {
    const tipos = await TipoTramite.findAll({
      where: { activo: true },
      attributes: ['id', 'codigo', 'nombre', 'descripcion', 'costo', 'vigenciaDias']
    });
    res.status(200).json(tipos);
  } catch (error) {
    next(error);
  }
});

// Enrutamiento de la API REST
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudRoutes);

// Manejo centralizado de errores (AC-03 Mantenibilidad)
app.use(errorHandler);

module.exports = app;
