const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Rutas públicas de autenticación
router.post('/registro', authCtrl.registro);
router.post('/login', authCtrl.login);

// Ruta protegida de perfil
router.get('/perfil', authMiddleware, authCtrl.perfil);

module.exports = router;
