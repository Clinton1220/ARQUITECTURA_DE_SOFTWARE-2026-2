# Sistema de Trámites y Certificados Municipales (Caso 2: Alcaldía Municipal)
## Documento de Arquitectura de Software (DAS) + Corte Vertical Ejecutable

[![Arquitectura: arc42 + C4 Model](https://img.shields.io/badge/Architecture-arc42%20%2B%20C4%20Model-blue.svg)](docs/DAS.md)
[![Tests: Jest Passing](https://img.shields.io/badge/Tests-8%2F8%20Passing-success.svg)](tests/solicitud.test.js)
[![Stack: Node.js 20 + PostgreSQL 16](https://img.shields.io/badge/Stack-Node.js%20%7C%20PostgreSQL-336791.svg)](docker-compose.yml)
[![Estrategia: Strangler Fig](https://img.shields.io/badge/Pattern-Strangler%20Fig-orange.svg)](docs/adr/ADR-001-patron-n-capas-strangler-fig.md)

Este repositorio contiene la entrega oficial completa del **Documento de Arquitectura de Software (DAS)** y el **Corte Vertical Ejecutable (Vertical Slice / Walking Skeleton)** para el **Caso 2: Alcaldía Municipal — Trámites y Certificados**, desarrollado conforme al estándar arc42 simplificado, el Modelo C4 (Niveles 1 y 2), Registros de Decisiones de Arquitectura (ADRs) y atributos de calidad ISO/IEC 25010.

---

## 📋 Tabla de Contenidos

1. [Visión General del Problema y Solución](#-visión-general-del-problema-y-solución)
2. [Estructura del Repositorio](#-estructura-del-repositorio)
3. [Entregables Arquitectónicos (docs/)](#-entregables-arquitectónicos-docs)
4. [Instalación y Ejecución Rápida (Terminal Limpia)](#-instalación-y-ejecución-rápida-terminal-limpia)
5. [Ejecución con Docker y Docker Compose](#-ejecución-con-docker-y-docker-compose)
6. [Ejecución de Pruebas Automatizadas](#-ejecución-de-pruebas-automatizadas)
7. [Colección de Pruebas en Postman](#-colección-de-pruebas-en-postman)
8. [Demostración en Vivo del Corte Vertical (HU-01)](#-demostración-en-vivo-del-corte-vertical-hu-01)
9. [Matriz de Cumplimiento de Lista de Chequeo](#-matriz-de-cumplimiento-de-lista-de-chequeo)

---

## 🏛️ Visión General del Problema y Solución

- **Situación Inicial (Caso 2):** Aplicación de escritorio heredada (2009) ejecutada en un único servidor físico bajo el escritorio del secretario de despacho. Se cuelga frecuentemente, requiere reinicio manual por un único funcionario, atiende ~200 trámites/semana solo en horario matutino y genera filas presenciales desde las 5:00 a. m., habiendo causado quejas formales ante la Personería.
- **Solución Arquitectónica:** Modernización progresiva mediante el patrón **Strangler Fig (Higuera Estranguladora)** y una arquitectura en **N-Capas**. Se despliega una fachada web y API REST para radicación y consulta ciudadana 24/7 sin colas, con autenticación sin estado (JWT), código de verificación QR oficial, persistencia relacional con transacciones ACID (PostgreSQL 16) y bitácora inmutable de auditoría institucional.

---

## 📂 Estructura del Repositorio

```
alcaldia-tramites-corte-vertical/
├── docs/                                  # Entregables oficiales de arquitectura
│   ├── DAS.md                             # Documento DAS en Markdown
│   ├── DAS.docx                           # Documento oficial en Word
│   ├── DAS.pdf                            # Documento oficial en PDF
│   ├── adr/                               # Registros de Decisiones de Arquitectura
│   │   ├── ADR-001-patron-n-capas-strangler-fig.md
│   │   ├── ADR-002-autenticacion-jwt-vs-sesiones.md
│   │   └── ADR-003-uso-orm-sequelize-postgresql.md
│   └── diagrams/                          # Fuentes de diagramas en notación UML y C4
│       ├── c4_nivel1_contexto.puml
│       ├── c4_nivel2_contenedores.puml
│       ├── uml_clases_dominio.puml
│       ├── uml_secuencia_hu01.puml
│       └── uml_despliegue.puml
├── db/
│   └── migrations/
│       └── 001_esquema_inicial.sql        # Script DDL con PK, FK, CHECK, UNIQUE y borrado lógico
├── src/                                   # Código backend (Corte Vertical N-Capas)
│   ├── config/database.js                 # Conexión Sequelize y pool de base de datos
│   ├── models/                            # Modelos ORM (Usuario, TipoTramite, Solicitud, Auditoria)
│   ├── controllers/                       # Controladores de negocio (Auth, Solicitud CRUD)
│   ├── routes/                            # Rutas Express (públicas y protegidas con JWT)
│   ├── middlewares/                       # Autenticación JWT, RBAC y manejo de errores
│   ├── app.js                             # Configuración y middlewares de Express
│   └── server.js                          # Punto de entrada y arranque del servidor
├── public/                                # Portal Web Ciudadano 24/7 (HTML5/CSS3/JS)
├── tests/                                 # Pruebas automatizadas de integración
│   ├── helpers.js
│   └── solicitud.test.js
├── postman/
│   └── coleccion-corte-vertical.json      # Colección oficial Postman con tests automáticos
├── .env.example                           # Plantilla de variables de entorno (sin secretos)
├── .gitignore                             # Exclusión estricta de .env y node_modules
├── docker-compose.yml                     # Orquestación de backend y PostgreSQL 16
├── Dockerfile                             # Imagen optimizada Node 20 LTS
├── package.json                           # Scripts y dependencias
└── README.md                              # Este manual de instalación y ejecución
```

---

## 📑 Entregables Arquitectónicos (docs/)

1. **Documento de Arquitectura de Software (DAS):**
   - [`docs/DAS.md`](docs/DAS.md) — Versión Markdown navegable con diagramas integrados.
   - [`docs/DAS.docx`](docs/DAS.docx) — Versión oficial editable para Word.
   - [`docs/DAS.pdf`](docs/DAS.pdf) — Versión oficial maquetada para impresión y entrega formal.
2. **Decisiones de Arquitectura (ADRs):**
   - [`docs/adr/ADR-001-patron-n-capas-strangler-fig.md`](docs/adr/ADR-001-patron-n-capas-strangler-fig.md)
   - [`docs/adr/ADR-002-autenticacion-jwt-vs-sesiones.md`](docs/adr/ADR-002-autenticacion-jwt-vs-sesiones.md)
   - [`docs/adr/ADR-003-uso-orm-sequelize-postgresql.md`](docs/adr/ADR-003-uso-orm-sequelize-postgresql.md)
3. **Diagramas:** Fuentes en PlantUML dentro de [`docs/diagrams/`](docs/diagrams/).

---

## ⚡ Instalación y Ejecución Rápida (Terminal Limpia)

### Prerrequisitos
- **Node.js:** Versión 18 LTS o superior (recomendado 20 LTS).
- **npm:** Versión 9 o superior.

### Paso 1: Clonar el repositorio y entrar a la carpeta
```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>
```

### Paso 2: Instalar dependencias
```bash
npm install
```

### Paso 3: Configurar variables de entorno
Copie el archivo de ejemplo para crear su `.env` local:
```bash
cp .env.example .env
```
*(En Windows PowerShell: `copy .env.example .env`)*

### Paso 4: Ejecutar el servidor
El sistema detecta automáticamente si se cuenta con PostgreSQL activo. Si no dispone de PostgreSQL en su máquina local, se puede arrancar de manera inmediata con SQLite de demostración o mediante Docker Compose.

Para iniciar en modo desarrollo/demostración:
```bash
npm start
```
El servidor arrancará en: **`http://localhost:3000`**

---

## 🐳 Ejecución con Docker y Docker Compose (Recomendado)

Para levantar el backend junto con el motor de base de datos **PostgreSQL 16 oficial** en contenedores aislados y con el script DDL precargado:

```bash
docker-compose up --build
```

- **Portal Web Ciudadano:** `http://localhost:3000`
- **Health Check del Sistema:** `http://localhost:3000/api/health`
- **PostgreSQL 16:** expuesto en `localhost:5432` con base de datos `alcaldia_tramites`.

---

## 🧪 Ejecución de Pruebas Automatizadas

El proyecto cuenta con una suite de pruebas de integración con **Jest y Supertest** que valida los 8 escenarios arquitectónicos críticos (Seguridad 401, Radicación 201 con radicado oficial, Prevención de conflicto 409, Listado 200, Consulta por radicado 200, Actualización 200, Borrado lógico 204 y Health Check 200).

Ejecutar las pruebas:
```bash
npm test
```

### Salida esperada:
```
PASS tests/solicitud.test.js
  Arquitectura del Corte Vertical: Trámites y Certificados (Caso 2)
    √ 1. Rechaza peticiones a POST /api/solicitudes sin token JWT (HTTP 401)
    √ 2. Crea una solicitud de certificado con radicado oficial 24/7 (HTTP 201)
    √ 3. Rechaza solicitud duplicada para el mismo predio y trámite activo (HTTP 409)
    √ 4. Lista las solicitudes activas del ciudadano autenticado (HTTP 200)
    √ 5. Permite consultar el estado del trámite en tiempo real por radicado (HTTP 200)
    √ 6. Permite actualizar observaciones de la solicitud (HTTP 200)
    √ 7. Aplica borrado lógico: responde 204 y conserva la fila inactiva en la BD
    √ 8. Endpoint /api/health reporta estado UP y conexión activa a base de datos

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

---

## 📮 Colección de Pruebas en Postman

El archivo [`postman/coleccion-corte-vertical.json`](postman/coleccion-corte-vertical.json) incluye las 6 peticiones con aserciones automáticas estipuladas en la Sección 5.4 del DAS:

1. `POST /api/auth/login` → HTTP 200 y almacena variable de colección `token`.
2. `POST /api/solicitudes` (sin token) → HTTP 401 (**AC-01 Seguridad**).
3. `POST /api/solicitudes` (con token) → HTTP 201 (**Corte Vertical HU-01**).
4. `POST /api/solicitudes` (predio duplicado) → HTTP 409 (**Regla de negocio**).
5. `GET /api/solicitudes` → HTTP 200 y confirma la presencia del radicado.
6. `DELETE /api/solicitudes/:id` → HTTP 204 y confirma persistencia con `activo = false`.

---

## 🖥️ Demostración en Vivo del Corte Vertical (HU-01)

Abra su navegador en **`http://localhost:3000`** para interactuar con la plataforma:

1. **Ingreso Ciudadano / Funcionario:**
   - Puede crear un nuevo ciudadano en la pestaña *Ingreso Ciudadano*, o
   - Iniciar sesión con el usuario funcionario sembrado por defecto:
     - **Email:** `funcionario@alcaldia.gov.co`
     - **Contraseña:** `Alcaldia2026*`
2. **Radicar Trámite (HU-01):**
   - Seleccione *Certificado de Residencia*, ingrese dirección y barrio, y pulse *Radicar Solicitud Oficialmente*. El sistema responderá en pantalla con su número de radicado oficial (`RAD-2026-XXXXX`).
3. **Consulta en Tiempo Real (RF-05):**
   - En la pestaña *Consulta por Radicado*, digite el radicado obtenido. El sistema mostrará el estado actual del trámite sin requerir que el ciudadano haga filas.
4. **Verificación Digital QR (RF-06):**
   - En la pestaña *Verificar Autenticidad QR*, ingrese el código QR generado para visualizar la emisión oficial del certificado.
5. **Borrado Lógico (Soft Delete):**
   - En *Mis Solicitudes*, pulse el botón *Cancelar*. La solicitud se marcará con `activo = false` en la base de datos conservando su trazabilidad inmutable para entes de control.

---

## ✅ Matriz de Cumplimiento de Lista de Chequeo

| # | Criterio de la Plantilla Oficial DAS | Estado | Evidencia en el Repositorio |
| :-: | :--- | :---: | :--- |
| **1** | DAS completo (Secciones 1–6) en PDF y Word dentro de `docs/` | **CUMPLIDO** | [`docs/DAS.pdf`](docs/DAS.pdf), [`docs/DAS.docx`](docs/DAS.docx) y [`docs/DAS.md`](docs/DAS.md) |
| **2** | 3 escenarios de calidad ISO 25010 con métricas cuantitativas | **CUMPLIDO** | Sección 1.3: AC-01 Seguridad, AC-02 Desempeño, AC-03 Mantenibilidad, AC-04 Confiabilidad |
| **3** | 5 vistas: Contexto C4 L1, Contenedores C4 L2, Clases UML, Secuencia UML, Despliegue UML | **CUMPLIDO** | Sección 3 (3.1 a 3.5), leyendas, lecturas de 30s y fuentes en [`docs/diagrams/`](docs/diagrams/) |
| **4** | Mínimo 1 ADR en `docs/adr/` con plantilla oficial | **CUMPLIDO** | [`docs/adr/`](docs/adr/): 3 ADRs completos (ADR-001, ADR-002, ADR-003) |
| **5** | Repositorio Git con $\ge 10$ commits atómicos y `.gitignore` | **CUMPLIDO** | Historial Git con Conventional Commits y exclusión de `.env` |
| **6** | Script SQL DDL con PK, FK, CHECK, UNIQUE y borrado lógico | **CUMPLIDO** | [`db/migrations/001_esquema_inicial.sql`](db/migrations/001_esquema_inicial.sql) |
| **7** | CRUD punta a punta ejecutable (Modelo–Controlador–Rutas–API) | **CUMPLIDO** | Implementado en `src/` para la entidad principal `SolicitudTramite` (HU-01) |
| **8** | Colección Postman o pruebas de integración pasando | **CUMPLIDO** | Ambos: [`postman/coleccion-corte-vertical.json`](postman/coleccion-corte-vertical.json) y [`tests/solicitud.test.js`](tests/solicitud.test.js) pasando 8/8 |
| **9** | README.md que permite instalar y ejecutar sin ayuda del autor | **CUMPLIDO** | Este documento [`README.md`](README.md) paso a paso |
| **10**| Análisis de trade-offs y $\ge 3$ puntos de sensibilidad | **CUMPLIDO** | Sección 6.1 (Trade-offs) y Sección 6.2 (Puntos de sensibilidad R-01 a R-03) |
