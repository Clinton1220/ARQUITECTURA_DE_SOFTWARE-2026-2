/**
 * Middleware centralizado de gestión de errores
 * Asegura respuestas homogéneas y evita fugas de información interna
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // Error de restricción única en Sequelize (409 Conflict)
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Conflicto: Ya existe un registro con los datos suministrados',
      campos: err.errors ? err.errors.map(e => e.path) : [],
      detalle: err.message
    });
  }

  // Error de validación en Sequelize (400 Bad Request)
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Error de validación en los datos enviados',
      detalles: err.errors ? err.errors.map(e => ({ campo: e.path, mensaje: e.message })) : []
    });
  }

  // Error de clave foránea en Sequelize (400 Bad Request)
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'La referencia foránea proporcionada no existe en la base de datos'
    });
  }

  // Error general no capturado (500 Internal Server Error)
  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || 'Error interno del servidor',
    codigo: 'INTERNAL_SERVER_ERROR'
  });
};

module.exports = errorHandler;
