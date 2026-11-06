-- ============================================================================
-- SCRIPT DDL: 002_certificados.sql
-- Caso 2: Alcaldía Municipal — Ciudadano · Solicitud · Certificado
-- Motor: PostgreSQL 16  (ejecutar DESPUÉS de 001_esquema_inicial.sql)
-- ============================================================================

-- Certificado expedido: 1 solicitud aprobada  ->  máximo 1 certificado
CREATE TABLE IF NOT EXISTS certificados (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER NOT NULL
        REFERENCES solicitudes_tramite(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_certificado VARCHAR(35) NOT NULL UNIQUE,          -- CERT-2026-00001
    codigo_verificacion_qr VARCHAR(100) NOT NULL UNIQUE,
    hash_sha256 CHAR(64) NOT NULL,
    fecha_expedicion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'vigente'
        CHECK (estado IN ('vigente', 'vencido', 'anulado')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,                    -- Borrado lógico
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_certificado_solicitud UNIQUE (solicitud_id),   -- ← el "INSERT venenoso" choca aquí
    CONSTRAINT ck_vencimiento CHECK (fecha_vencimiento > fecha_expedicion::date)
);

-- RF-08: no puede haber dos solicitudes EN CURSO del mismo ciudadano, trámite y predio
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_en_curso
    ON solicitudes_tramite (usuario_id, tipo_tramite_id, direccion_predio)
    WHERE activo AND estado IN ('radicada', 'en_revision');

CREATE INDEX IF NOT EXISTS idx_certificados_solicitud ON certificados(solicitud_id);
