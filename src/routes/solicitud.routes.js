const express = require('express');
const router = express.Router();
const solicitudCtrl = require('../controllers/solicitud.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Rutas públicas de consulta ciudadana y validación QR (24/7 sin filas)
router.get('/seguimiento/:radicado', solicitudCtrl.obtenerPorRadicado);
router.get('/verificar/:codigoQr', solicitudCtrl.verificarAutenticidad);

// Rutas protegidas del corte vertical (requieren JWT - AC-01 / AC-02)
router.post('/', authMiddleware, solicitudCtrl.crear);
router.get('/', authMiddleware, solicitudCtrl.listar);
router.put('/:id', authMiddleware, solicitudCtrl.actualizar);
router.delete('/:id', authMiddleware, solicitudCtrl.eliminar);

module.exports = router;
