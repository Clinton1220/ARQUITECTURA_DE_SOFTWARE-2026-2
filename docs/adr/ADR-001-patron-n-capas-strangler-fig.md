# ADR-001: Adopción del Patrón N-Capas con Estrategia Strangler Fig para Modernización Progresiva

## Estatus
Aceptada

## Fecha
2026-09-17

## Contexto
La Alcaldía Municipal opera actualmente con una aplicación de escritorio heredada (2009) alojada en un único servidor físico bajo el escritorio del secretario de despacho. Este sistema sufre bloqueos frecuentes, carece de alta disponibilidad, depende exclusivamente de un solo funcionario para reiniciarse y genera filas ciudadanas presenciales desde las 5:00 a.m., habiendo recibido ya una queja formal de la Personería Municipal.
Reemplazar el sistema mediante un corte drástico ("Big-Bang") no es viable debido a la restricción técnica RT-03 (17 años de reglas de negocio consolidadas en base de datos sin APIs nativas), la restricción administrativa RA-01 (procesos de contratación pública por etapas) y el riesgo de paralizar los trámites municipales. Se requiere una arquitectura que garantice la radicación y consulta ciudadana 24/7 (AC-01 Confiabilidad y AC-04 Usabilidad), con alta mantenibilidad (AC-07) para un equipo interno sin programadores de planta (RA-03).
Alternativas evaluadas:
1. Reemplazo "Big-Bang" por un nuevo monolito cerrado.
2. Arquitectura de microservicios distribuida desde el día uno.
3. Arquitectura en N-Capas (Presentación / API REST, Controladores/Negocio, Acceso a Datos/ORM y BD Relacional) combinada con el patrón de evolución progresiva Strangler Fig (Higuera Estranguladora).

## Decisión
Decidimos adoptar una arquitectura estructurada en **N-Capas** (Rutas/API REST → Middlewares de Seguridad/Validación → Controladores de Lógica de Negocio → Modelos ORM → Persistencia Relacional) complementada con la estrategia de modernización **Strangler Fig**. En la Fase 1, la nueva solución actúa como fachada web 24/7 para que los ciudadanos radiquen y consulten certificados, mientras la aplicación de 2009 sigue operando internamente para la validación de funcionarios, migrando gradualmente los servicios hasta el retiro definitivo del servidor físico.

## Consecuencias / Trade-offs
- **Positivas**:
  - (+Confiabilidad AC-01): Se desacopla la radicación ciudadana del servidor físico local; las caídas de la máquina de escritorio ya no impiden la recepción de trámites 24/7.
  - (+Mantenibilidad y Modularidad AC-07): Separación clara de responsabilidades que facilita a contratistas externos mantener o extender módulos sin afectar el resto del sistema.
  - (+Viabilidad de Contratación RA-01): Permite licitar entregables contractualmente delimitados por fases (Fase 1: Fachada y radicación; Fase 2: Emisión y QR; Fase 3: Desmantelamiento legado).
- **Negativas**:
  - Durante las Fases 1 y 2 existe duplicidad temporal de interfaces (interfaz web moderna para ciudadanos y software de escritorio de 2009 para funcionarios).
  - Requiere sincronización cuidadosa sobre la base de datos común para evitar inconsistencias de estado entre la ventanilla física y el portal web.
- **Deuda técnica asumida**:
  - Coexistencia temporal con tablas legadas de 2009. Se revisará al iniciar la Fase 3, momento en el cual se migrará el 100% de la lógica a la plataforma web y se retirará el binario de escritorio.
