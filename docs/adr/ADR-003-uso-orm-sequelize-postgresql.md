# ADR-003: Uso de ORM Sequelize con PostgreSQL sobre SQL Nativo y Motores NoSQL

## Estatus
Aceptada

## Fecha
2026-09-17

## Contexto
El sistema municipal maneja trámites oficiales que comprometen la fe pública de la administración (certificados de residencia, certificados de paz y salvo tributario). Las relaciones entre ciudadanos, predios, tipos de certificados y registros de auditoría requieren cumplimiento estricto de propiedades ACID, integridad referencial y restricciones de unicidad (RF-01, RF-02, RF-09 y AC-01 Adecuación Funcional).
Por otro lado, la restricción administrativa RA-03 señala que la alcaldía cuenta con un solo técnico de soporte sin perfil de programador, por lo que el mantenimiento futuro recaerá en contratistas externos. Esto exige código estructurado, modelos fuertemente tipados, migraciones versionadas y protección contra inyecciones SQL (AC-07 Mantenibilidad y AC-06 Seguridad).
Alternativas evaluadas:
1. Base de datos NoSQL documental (ej. MongoDB) con consultas directas.
2. Motor relacional PostgreSQL utilizando consultas SQL en texto plano nativo (módulo `pg`).
3. Motor relacional PostgreSQL 16 gestionado a través del ORM Sequelize con soporte de pool de conexiones y migraciones de esquema.

## Decisión
Decidimos utilizar **PostgreSQL 16** como motor de base de datos relacional y **Sequelize 6.x** como ORM (Object-Relational Mapping). Descartamos NoSQL (MongoDB) porque la emisión de certificados y trámites requiere consistencia transaccional inmediata, llaves foráneas estrictas y restricciones UNIQUE que eviten radicaciones duplicadas. Descartamos SQL nativo directo porque el ORM abstrae la sanitización contra inyecciones SQL, versiona el modelo de datos y facilita el cumplimiento del escenario de mantenibilidad (agregar un campo impacta como máximo 3 archivos).

## Consecuencias / Trade-offs
- **Positivas**:
  - (+Integridad de Datos AC-01): Garantía de restricciones CHECK, UNIQUE y relaciones con llaves foráneas (FK ON DELETE RESTRICT).
  - (+Mantenibilidad AC-07): Definición declarativa de modelos, relaciones automáticas y migraciones versionadas que permiten a cualquier nuevo desarrollador entender el esquema en minutos.
  - (+Seguridad AC-06): Protección automática contra inyecciones SQL mediante consultas parametrizadas generadas por el ORM.
  - (+Borrado Lógico y Auditoría): Soporte nativo para hooks que facilitan registrar entradas en la tabla de auditoría ante cada cambio.
- **Negativas**:
  - Pequeña sobrecarga en tiempo de respuesta respecto a consultas SQL en crudo ultra-optimizadas.
  - Posible problema de N+1 queries en listados complejos con relaciones anidadas.
- **Mitigación y Deuda técnica**:
  - Se configuran cláusulas `include` explícitas (eager loading con JOINs) y un pool de conexiones optimizado (máximo 10 conexiones). Para reportes complejos en fases futuras se autoriza el uso puntual de consultas SQL nativas (`sequelize.query`).
