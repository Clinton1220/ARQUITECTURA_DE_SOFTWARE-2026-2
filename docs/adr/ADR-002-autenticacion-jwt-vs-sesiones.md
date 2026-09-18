# ADR-002: Autenticación Basada en JSON Web Tokens (JWT) Sin Estado frente a Sesiones en Servidor

## Estatus
Aceptada

## Fecha
2026-09-17

## Contexto
El sistema de la Alcaldía Municipal debe permitir el acceso concurrente de ciudadanos radicando solicitudes y funcionarios tramitando certificados (RF-10 Control de acceso RBAC). El sistema anterior no contaba con autenticación web y dependía de sesiones locales de escritorio en una sola máquina física.
Bajo el atributo de calidad AC-06 (Seguridad y Confidencialidad) y AC-02 (Eficiencia de Desempeño), la autenticación debe proteger los endpoints de radicación y administración sin degradar los tiempos de respuesta. Además, bajo la restricción operativa de despliegue en contenedores Docker y escalabilidad horizontal futura (RT-01 y AC-08 Portabilidad), el servidor de backend debe ser completamente sin estado (stateless).
Alternativas evaluadas:
1. Sesiones tradicionales HTTP basadas en cookies con almacenamiento en memoria del proceso servidor (express-session con MemoryStore).
2. Sesiones en servidor centralizadas mediante una instancia de Redis.
3. Tokens criptográficos firmados JSON Web Tokens (JWT) transmitidos en el encabezado `Authorization: Bearer <token>`.

## Decisión
Decidimos implementar **JSON Web Tokens (JWT)** con algoritmo HMAC SHA-256 junto con hashing de contraseñas mediante **bcrypt (factor de trabajo >= 10)** para la autenticación y control de acceso RBAC. Descartamos sesiones en memoria local porque romperían la escalabilidad y provocarían desconexión de usuarios al reiniciar el contenedor. Descartamos Redis en esta fase para evitar costos operativos y dependencias de infraestructura no justificadas para la carga inicial (~200 trámites/semana).

## Consecuencias / Trade-offs
- **Positivas**:
  - (+Seguridad AC-06): Autenticación robusta, firmas criptográficas inalterables y contraseñas protegidas con salt y hash en la base de datos.
  - (+Escalabilidad y Portabilidad AC-08): El backend no guarda estado de sesión en memoria, facilitando despliegues en múltiples contenedores o servicios serverless detrás de un balanceador.
  - (+Interoperabilidad): Los tokens JWT son fácilmente consumibles tanto por la interfaz web ciudadana como por aplicaciones móviles o sistemas externos en fases futuras.
- **Negativas**:
  - Dificultad para revocación inmediata de tokens antes de su tiempo de expiración (mitigado fijando un tiempo de vigencia prudencial de 8 horas y verificando el estado `activo = true` del usuario en cada petición sensible).
  - Sobrecarga de tamaño en los encabezados HTTP frente a una simple cookie de sesión ID.
- **Deuda técnica asumida**:
  - Si en la Fase 2 el volumen de funcionarios concurrentes supera los 100 usuarios activos simultáneos, se evaluará la incorporación de una lista negra de tokens revocados (blacklist) o refresh tokens con Redis.
