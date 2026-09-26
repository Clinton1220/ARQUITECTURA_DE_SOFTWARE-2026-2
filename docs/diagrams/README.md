# Diagramas de Arquitectura de Software

Este directorio contiene las imágenes oficiales de los modelos de arquitectura para el **Sistema de Gestión y Emisión Digital de Trámites y Certificados 24/7 (Alcaldía Municipal)**.

---

## 📌 Índice de Diagramas

| # | Diagrama | Tipo / Nivel | Imagen | Enlace en Línea |
|---|----------|--------------|--------|-----------------|
| 1 | **Contexto del Sistema** | C4 Nivel 1 | [c4_nivel1_contexto.png](c4_nivel1_contexto.png) | *(En edición)* |
| 2 | **Contenedores y Capas** | C4 Nivel 2 | [c4_nivel2_contenedores.png](c4_nivel2_contenedores.png) | *(En edición)* |
| 3 | **Clases del Dominio** | UML Estructural | [uml_clases_dominio.png](uml_clases_dominio.png) | *(En edición)* |
| 4 | **Secuencia: Radicación HU-01** | UML Dinámico | [uml_secuencia_hu01.png](uml_secuencia_hu01.png) | [🔗 Ver en Lucidchart](https://lucid.app/lucidchart/84fc9272-7cf2-46e7-b704-865ca83fc88f/edit?viewport_loc=-902%2C-522%2C2747%2C1540%2C0_0&invitationId=inv_bef8d021-b763-4f34-95da-ca8f4055b91c) |
| 5 | **Despliegue e Infraestructura** | UML Despliegue | [uml_despliegue.png](uml_despliegue.png) | *(En edición)* |

---

## 1. Diagrama de Contexto (C4 Nivel 1)

Muestra los límites del sistema municipal, los actores humanos principales (Ciudadano, Funcionario, Personería) y las interacciones con sistemas externos (Sistema legado de 2009 y Servicio SMTP).

![Diagrama de Contexto C4 Nivel 1](c4_nivel1_contexto.png)

---

## 2. Diagrama de Contenedores y Capas (C4 Nivel 2)

Detalla la arquitectura de software interna: Portal Web Ciudadano (HTML5/JS), API Backend en Node.js/Express, Base de Datos PostgreSQL 16 y Servicio SMTP externo.

![Diagrama de Contenedores C4 Nivel 2](c4_nivel2_contenedores.png)

---

## 3. Diagrama de Clases del Dominio (UML)

Modelo de datos relacional y entidades persistidas: `Usuario`, `TipoTramite`, `SolicitudTramite` y `AuditoriaTramite`, con tipos de datos, llaves (`PK`, `FK`, `UK`), restricciones y relaciones de negocio.

![Diagrama de Clases UML](uml_clases_dominio.png)

---

## 4. Diagrama de Secuencia: HU-01 Radicación 24/7 (UML)

Interacción temporal del corte vertical, ilustrando el camino feliz y dos flujos alternos obligatorios (HTTP 401 por token no autorizado y HTTP 409 por conflicto de duplicidad).

> 🔗 **Tablero interactivo:** [Abrir en Lucidchart](https://lucid.app/lucidchart/84fc9272-7cf2-46e7-b704-865ca83fc88f/edit?viewport_loc=-902%2C-522%2C2747%2C1540%2C0_0&invitationId=inv_bef8d021-b763-4f34-95da-ca8f4055b91c)

![Diagrama de Secuencia UML HU-01](uml_secuencia_hu01.png)

---

## 5. Diagrama de Despliegue e Infraestructura (UML)

Mapeo de la solución en contenedores Docker (`app-backend`, `db`), red virtual interna aislada (`red-alcaldia`), puertos expuestos (`3000`, `5432`) y volumen persistente (`pgdata`).

![Diagrama de Despliegue UML](uml_despliegue.png)
