-- ============================================================================
-- SCRIPT DDL: 001_esquema_inicial.sql
-- Caso 2: Alcaldía Municipal — Trámites y Certificados
-- Motor: PostgreSQL 16
-- Cumplimiento: PK, FK con REFERENCES, CHECK, UNIQUE, Índices y Borrado Lógico
-- ============================================================================

-- 1. Tabla de Usuarios (Ciudadanos, Funcionarios de Gobierno, Administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    documento_identidad VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'ciudadano' 
        CHECK (rol IN ('ciudadano', 'funcionario', 'admin')),
    telefono VARCHAR(30),
    activo BOOLEAN NOT NULL DEFAULT TRUE, -- Borrado lógico
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Catálogo de Tipos de Trámite (Residencia, Paz y Salvo, etc.)
CREATE TABLE IF NOT EXISTS tipos_tramite (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    costo NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (costo >= 0),
    vigencia_dias INTEGER NOT NULL DEFAULT 90 CHECK (vigencia_dias > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE, -- Borrado lógico
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Principal de Solicitudes de Trámite (Corte Vertical HU-01)
CREATE TABLE IF NOT EXISTS solicitudes_tramite (
    id SERIAL PRIMARY KEY,
    radicado VARCHAR(35) NOT NULL UNIQUE, -- Código oficial único 24/7 (ej: RAD-2026-00001)
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_tramite_id INTEGER NOT NULL REFERENCES tipos_tramite(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    direccion_predio VARCHAR(180) NOT NULL,
    barrio_vereda VARCHAR(100) NOT NULL,
    observaciones TEXT,
    estado VARCHAR(25) NOT NULL DEFAULT 'radicada' 
        CHECK (estado IN ('radicada', 'en_revision', 'aprobada', 'rechazada', 'cancelada')),
    motivo_rechazo TEXT,
    codigo_verificacion_qr VARCHAR(100) UNIQUE,
    hash_documento VARCHAR(64),
    activo BOOLEAN NOT NULL DEFAULT TRUE, -- Borrado lógico (eliminar solicitud)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Restricción de negocio: un ciudadano no puede radicar dos veces el mismo predio con el mismo trámite en el mismo minuto
    CONSTRAINT uq_solicitud_usuario_predio_fecha UNIQUE (usuario_id, tipo_tramite_id, direccion_predio, created_at)
);

-- 4. Tabla de Auditoría y Trazabilidad Inmutable (Respuesta a RF-09 y entes de control / Personería)
CREATE TABLE IF NOT EXISTS auditoria_tramites (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes_tramite(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    usuario_id INTEGER REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL, -- RADICACION, CAMBIO_ESTADO, DESCARGA_CERTIFICADO, ELIMINACION_LOGICA
    estado_anterior VARCHAR(25),
    estado_nuevo VARCHAR(25),
    detalle TEXT,
    ip_origen VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización justificando consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_documento ON usuarios(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_radicado ON solicitudes_tramite(radicado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes_tramite(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_tramite(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_activo ON solicitudes_tramite(activo);
CREATE INDEX IF NOT EXISTS idx_auditoria_solicitud ON auditoria_tramites(solicitud_id);

-- Semilla de datos iniciales para pruebas directas
INSERT INTO tipos_tramite (codigo, nombre, descripcion, costo, vigencia_dias, activo)
VALUES 
    ('CERT-RESIDENCIA', 'Certificado de Residencia', 'Acredita que el ciudadano reside habitualmente en la jurisdicción municipal', 0.00, 90, TRUE),
    ('CERT-PAZ-SALVO', 'Certificado de Paz y Salvo Municipal', 'Acredita que el contribuyente se encuentra al día con sus obligaciones tributarias municipales', 0.00, 30, TRUE)
ON CONFLICT (codigo) DO NOTHING;
