-- ============================================================================
-- SUSTENTACIÓN CLASE 4 (17-oct-2026) — "Del diagrama a la tabla"
-- Ejecutar paso a paso en psql, en el orden indicado.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PASO 1 — INSERT dictados
-- ---------------------------------------------------------------------------
-- 1a. Ciudadano Carlos Urrego
INSERT INTO usuarios (nombre, documento_identidad, email, password_hash, rol, telefono)
VALUES ('Carlos Urrego', '1020304050', 'carlos.urrego@correo.com',
        '$2a$10$abcdefghijklmnopqrstuuJ8l0l2p1x9Y7r2Qe3cVb5nH6mK4sT8e', -- hash bcrypt, nunca texto plano
        'ciudadano', '3001234567');

-- 1b. Solicitud de certificado de residencia radicada hoy 17-oct-2026
INSERT INTO solicitudes_tramite
    (radicado, usuario_id, tipo_tramite_id, direccion_predio, barrio_vereda, estado, created_at)
VALUES ('RAD-2026-00001',
        (SELECT id FROM usuarios WHERE documento_identidad = '1020304050'),
        (SELECT id FROM tipos_tramite WHERE codigo = 'CERT-RESIDENCIA'),
        'Calle 10 # 5-23', 'Centro', 'aprobada', '2026-10-17 09:30:00');

-- 1c. Certificado expedido para esa solicitud
INSERT INTO certificados
    (solicitud_id, numero_certificado, codigo_verificacion_qr, hash_sha256, fecha_vencimiento)
VALUES ((SELECT id FROM solicitudes_tramite WHERE radicado = 'RAD-2026-00001'),
        'CERT-2026-00001', 'QR-7F3A9C21',
        repeat('a', 64), DATE '2026-10-17' + 90);   -- vigencia 90 días (tipos_tramite)

-- Verificación
SELECT u.nombre, s.radicado, s.estado, c.numero_certificado, c.estado AS estado_cert
FROM usuarios u
JOIN solicitudes_tramite s ON s.usuario_id = u.id
JOIN certificados c        ON c.solicitud_id = s.id
WHERE u.documento_identidad = '1020304050';

-- ---------------------------------------------------------------------------
-- PASO 2 — INSERT venenoso
-- ---------------------------------------------------------------------------
-- 2a. Segundo certificado para la MISMA solicitud  → debe FALLAR
--     ERROR: duplicate key value violates unique constraint "uq_certificado_solicitud"
INSERT INTO certificados
    (solicitud_id, numero_certificado, codigo_verificacion_qr, hash_sha256, fecha_vencimiento)
VALUES ((SELECT id FROM solicitudes_tramite WHERE radicado = 'RAD-2026-00001'),
        'CERT-2026-00002', 'QR-00000002', repeat('b', 64), DATE '2026-10-17' + 90);

-- 2b. Solicitud con estado 'perdida'  → debe FALLAR
--     ERROR: new row ... violates check constraint "solicitudes_tramite_estado_check"
INSERT INTO solicitudes_tramite
    (radicado, usuario_id, tipo_tramite_id, direccion_predio, barrio_vereda, estado)
VALUES ('RAD-2026-00002',
        (SELECT id FROM usuarios WHERE documento_identidad = '1020304050'),
        (SELECT id FROM tipos_tramite WHERE codigo = 'CERT-RESIDENCIA'),
        'Carrera 3 # 8-10', 'San José', 'perdida');

-- ---------------------------------------------------------------------------
-- PASO 3 — Consulta relámpago: trámites radicados esta semana, por estado
-- ---------------------------------------------------------------------------
SELECT estado, COUNT(*) AS total
FROM solicitudes_tramite
WHERE activo
  AND created_at >= date_trunc('week', CURRENT_DATE)          -- lunes de esta semana
  AND created_at <  date_trunc('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY estado
ORDER BY total DESC;

-- ---------------------------------------------------------------------------
-- PASO 4 — Cambio sorpresa: la Personería exige saber qué funcionario expidió
--          cada certificado → entidad Funcionario + FK (NO un campo de texto libre)
-- ---------------------------------------------------------------------------
CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE
        REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,  -- su login
    codigo_funcionario VARCHAR(20) NOT NULL UNIQUE,
    cargo VARCHAR(80) NOT NULL,
    dependencia VARCHAR(80) NOT NULL DEFAULT 'Secretaría de Gobierno',
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE certificados
    ADD COLUMN funcionario_id INTEGER
        REFERENCES funcionarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- (Tras cargar los funcionarios y completar los certificados históricos:)
-- ALTER TABLE certificados ALTER COLUMN funcionario_id SET NOT NULL;
