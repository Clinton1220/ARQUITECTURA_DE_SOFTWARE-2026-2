const request = require('supertest');
const app = require('../src/app');
const { sequelize, SolicitudTramite, TipoTramite } = require('../src/models');
const { inicializarBaseDatosPrueba, crearUsuarioPrueba } = require('./helpers');

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await inicializarBaseDatosPrueba();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Arquitectura del Corte Vertical: Trámites y Certificados (Caso 2)', () => {
  let tokenCiudadano;
  let usuarioCiudadano;
  let tipoResidencia;
  let solicitudCreadaId;
  let radicadoCreado;

  beforeAll(async () => {
    const authData = await crearUsuarioPrueba('ciudadano', '1012345678', 'juan.perez@alcaldia.test');
    tokenCiudadano = authData.token;
    usuarioCiudadano = authData.usuario;
    tipoResidencia = await TipoTramite.findOne({ where: { codigo: 'CERT-RESIDENCIA' } });
  });

  // 1. Verificación de Seguridad (AC-01 / AC-02)
  test('1. Rechaza peticiones a POST /api/solicitudes sin token JWT (HTTP 401)', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .send({
        tipoTramiteId: tipoResidencia.id,
        direccionPredio: 'Calle 10 # 4 - 20',
        barrioVereda: 'El Centro'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.codigo).toBe('AUTH_TOKEN_MISSING');
  });

  // 2. Creación punta a punta atravesando todas las capas (HU-01)
  test('2. Crea una solicitud de certificado con radicado oficial 24/7 (HTTP 201)', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${tokenCiudadano}`)
      .send({
        tipoTramiteId: tipoResidencia.id,
        direccionPredio: 'Carrera 7 # 15 - 30',
        barrioVereda: 'Barrio Obrero',
        observaciones: 'Certificado requerido para trámite educativo'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('solicitud');
    expect(res.body.solicitud).toHaveProperty('id');
    expect(res.body.solicitud).toHaveProperty('radicado');
    expect(res.body.solicitud.radicado).toMatch(/^RAD-2026-\d{5}$/);
    expect(res.body.solicitud.estado).toBe('radicada');
    expect(res.body.solicitud.activo).toBe(true);

    solicitudCreadaId = res.body.solicitud.id;
    radicadoCreado = res.body.solicitud.radicado;

    // Verificar persistencia física real en la BD
    const enBD = await SolicitudTramite.findByPk(solicitudCreadaId);
    expect(enBD).not.toBeNull();
    expect(enBD.radicado).toBe(radicadoCreado);
  });

  // 3. Regla de negocio: detección de duplicidad / conflicto (HTTP 409)
  test('3. Rechaza solicitud duplicada para el mismo predio y trámite activo (HTTP 409)', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${tokenCiudadano}`)
      .send({
        tipoTramiteId: tipoResidencia.id,
        direccionPredio: 'Carrera 7 # 15 - 30', // Misma dirección que en test 2
        barrioVereda: 'Barrio Obrero'
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('radicadoExistente');
  });

  // 4. Lectura de trámites propios (HTTP 200)
  test('4. Lista las solicitudes activas del ciudadano autenticado (HTTP 200)', async () => {
    const res = await request(app)
      .get('/api/solicitudes')
      .set('Authorization', `Bearer ${tokenCiudadano}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const encontrada = res.body.find(s => s.id === solicitudCreadaId);
    expect(encontrada).toBeDefined();
    expect(encontrada.radicado).toBe(radicadoCreado);
  });

  // 5. Consulta pública de seguimiento por radicado sin login (RF-05)
  test('5. Permite consultar el estado del trámite en tiempo real por radicado (HTTP 200)', async () => {
    const res = await request(app)
      .get(`/api/solicitudes/seguimiento/${radicadoCreado}`);

    expect(res.status).toBe(200);
    expect(res.body.radicado).toBe(radicadoCreado);
    expect(res.body.estado).toBe('radicada');
    expect(res.body).toHaveProperty('codigoVerificacionQr');
  });

  // 6. Actualización de solicitud / estado (HTTP 200)
  test('6. Permite actualizar observaciones de la solicitud (HTTP 200)', async () => {
    const res = await request(app)
      .put(`/api/solicitudes/${solicitudCreadaId}`)
      .set('Authorization', `Bearer ${tokenCiudadano}`)
      .send({
        observaciones: 'Observación corregida por el ciudadano'
      });

    expect(res.status).toBe(200);
    expect(res.body.observaciones).toBe('Observación corregida por el ciudadano');
  });

  // 7. Borrado Lógico (HTTP 204 y activo = false en la BD)
  test('7. Aplica borrado lógico: responde 204 y conserva la fila inactiva en la BD', async () => {
    const res = await request(app)
      .delete(`/api/solicitudes/${solicitudCreadaId}`)
      .set('Authorization', `Bearer ${tokenCiudadano}`);

    expect(res.status).toBe(204);

    // Verificar en la BD que la fila NO se destruyó físicamente (borrado lógico)
    const enBD = await SolicitudTramite.findByPk(solicitudCreadaId);
    expect(enBD).not.toBeNull();
    expect(enBD.activo).toBe(false);
    expect(enBD.estado).toBe('cancelada');

    // Verificar que el listado de registros activos ya no lo retorna
    const listadoRes = await request(app)
      .get('/api/solicitudes')
      .set('Authorization', `Bearer ${tokenCiudadano}`);
    const noAparece = listadoRes.body.find(s => s.id === solicitudCreadaId);
    expect(noAparece).toBeUndefined();
  });

  // 8. Health Check del sistema (AC-01 Confiabilidad)
  test('8. Endpoint /api/health reporta estado UP y conexión activa a base de datos', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('CONNECTED');
  });
});
