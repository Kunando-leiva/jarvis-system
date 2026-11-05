# ARQUITECTURA DE JARVIS - SISTEMA OPERATIVO COGNITIVO

## Visión
JARVIS es un sistema operativo cognitivo diseñado para orquestar agentes de IA, gestionar conocimiento y aprender de las interacciones. Su arquitectura está construida sobre principios de modularidad, desacoplamiento y evolución continua.

## Principios Arquitectónicos
1. **Modularidad:** Cada componente tiene una responsabilidad única y clara.
2. **Desacoplamiento:** Los servicios se comunican a través de contratos claros y eventos, no por dependencias directas.
3. **Observabilidad:** Todo el sistema es trazable a través de logs estructurados con traceId.
4. **Evolución:** La arquitectura permite agregar nuevas capacidades sin reescribir el núcleo.

## Estructura de Carpetas
backend/src/
├── core/ # Infraestructura base del sistema
│ ├── logger.js # Sistema de logs centralizado
│ ├── contracts.js # Contratos de datos (ServiceResponse, Plan, etc.)
│ ├── aiProvider.js # Abstracción de IA con políticas comunes
│ ├── eventBus.js # Eventos para auditoría, métricas y aprendizaje
│ ├── toolRegistry.js # Registro centralizado de herramientas
│ ├── taskManager.js # Gestión de tareas para orquestación
│ └── dependencyContainer.js # Contenedor de dependencias
├── services/ # Servicios cognitivos del sistema
│ ├── memoryService.js # Memoria a corto y medio plazo (SQLite)
│ ├── longTermMemoryService.js # Memoria episódica, semántica y procedimental
│ ├── reasoningService.js # Planificador (genera planes)
│ ├── executionService.js # Ejecutor (ejecuta planes)
│ └── reflectionService.js # Observador y registrador (aprendizaje)
├── knowledge/ # Conocimiento estático del sistema y proyecto
│ └── index.js # Punto de entrada para el conocimiento
├── agents/ # Agentes especializados
│ └── ... (JARVIS, GIDEON, HEIMDALL, KILL, etc.)
├── controllers/ # Controladores de la API
├── routes/ # Rutas de la API
├── socket/ # WebSockets
│ └── index.js # Coordinador de conexiones (refactorizado)
└── app.js # Configuración principal de Express (refactorizado)

## Flujo de Datos (Alta Nivel)

1. **Usuario → Frontend → Socket:** El usuario envía un mensaje.
2. **Socket → ReasoningService:** El socket pasa la consulta al planificador.
3. **ReasoningService:** Genera un plan estructurado (usando `aiProvider` y consultando `memoryService`).
4. **ExecutionService:** Ejecuta el plan paso a paso (usando herramientas, agentes y `aiProvider`).
5. **ReflectionService:** Observa el resultado y registra insights.
6. **MemoryService + LongTermMemoryService:** Se actualizan con la nueva interacción.
7. **Respuesta → Usuario:** El resultado se envía de vuelta al frontend.

## Decisiones Arquitectónicas Clave

### 1. AI Provider (Abstracción de IA)
- **Decisión:** JARVIS no sabe qué modelo de IA usa.
- **Motivo:** Permite cambiar de proveedor (OpenAI, Claude, Gemini, Groq, etc.) sin modificar el código de los servicios.
- **Políticas:** Reintentos, timeouts, cuotas y métricas son gestionados por el provider.

### 2. Event Bus (Solo para Eventos)
- **Decisión:** El event bus solo se usa para eventos que ya ocurrieron (auditoría, aprendizaje, métricas).
- **Motivo:** El flujo principal de razonamiento debe ser síncrono y directo para evitar complejidad.

### 3. Separación Planificación vs. Ejecución
- **Decisión:** `ReasoningService` solo planifica, `ExecutionService` ejecuta.
- **Motivo:** Facilita pruebas, permite planes más complejos y separa responsabilidades.

### 4. Tool Registry
- **Decisión:** Todas las herramientas están registradas centralmente.
- **Motivo:** El `ExecutionService` puede descubrir y llamar herramientas dinámicamente.

### 5. Separación Memoria vs. Conocimiento
- **Decisión:** Memoria (interacciones, contexto) vs. Conocimiento (estructura del proyecto, dependencias).
- **Motivo:** Claridad conceptual y facilidad de mantenimiento.

### 6. Task Manager
- **Decisión:** Gestión centralizada de tareas para orquestación.
- **Motivo:** Prepara el sistema para la Fase 3 (Orquestación de Agentes).

## Evolución del Sistema (Roadmap)

- **Fase 0:** Infraestructura y Cimientos. (✓ Completado)
- **Fase 1:** Memoria y Razonamiento.
- **Fase 2:** Conocimiento del Proyecto.
- **Fase 3:** Orquestación de Agentes.
- **Fase 4:** Modo Arquitecto de Software.
- **Fase 5:** Proactividad y Mejora Continua.

## Principios de Desarrollo

1. Cada commit debe dejar el proyecto corriendo.
2. Cada servicio nuevo debe tener una prueba básica.
3. No eliminar código viejo hasta que el nuevo esté validado.
4. Documentar cada decisión importante en este archivo.

---

## 🔒 Principios de Diseño

### 1. Encapsulamiento y Contratos

**Regla:** Ningún servicio debe acceder a métodos privados (prefijo `_`) de otro servicio.

**Razón:** Esto asegura que los servicios sean intercambiables y que los cambios internos no afecten a otros servicios.

**Ejemplo:**
```javascript
// ❌ MAL: Acceder a método privado de otro servicio
this.memoryService._ensureSession(sessionId);

// ✅ BIEN: Usar método público
this.memoryService.ensureSession(sessionId);
```  // 

2. Contratos Estables
Cada servicio expone un conjunto claro y estable de métodos públicos. Los contratos están documentados en contracts.js.

Beneficios:

Facilita el reemplazo de implementaciones

Permite pruebas unitarias con mocks

El contenedor de dependencias puede inyectar servicios sin conocer detalles internos

3. Semántica de Métodos Públicos
initialize(): Prepara el servicio para operar

getStatus(): Devuelve estado actual

getMetrics(): Devuelve métricas de uso

shutdown(): Libera recursos y detiene el servicio

Métodos de negocio específicos con nombres claros

Última actualización: 2026-08-24

---

### 6. Pruebas para `ensureSession`

**Archivo:** `backend/test/memory.test.js` (Nuevo)

```javascript
// backend/test/memory.test.js
// Pruebas específicas para MemoryService

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import memoryService from '../src/services/memoryService.js';

describe('MemoryService - ensureSession', () => {
  before(async () => {
    await memoryService.initialize();
  });

  after(async () => {
    await memoryService.shutdown();
  });

  it('debe crear una sesión si no existe', () => {
    const sessionId = `test_session_${Date.now()}`;
    
    // La sesión no debería existir al inicio
    const contextBefore = memoryService.getContext(sessionId);
    assert.deepEqual(contextBefore, {});
    
    // Crear la sesión
    memoryService.ensureSession(sessionId);
    
    // Verificar que la sesión existe
    const contextAfter = memoryService.getContext(sessionId);
    assert.ok(contextAfter, 'El contexto debería existir');
  });

  it('no debe generar duplicados al llamar ensureSession varias veces', () => {
    const sessionId = `test_session_${Date.now()}`;
    
    memoryService.ensureSession(sessionId);
    memoryService.ensureSession(sessionId);
    memoryService.ensureSession(sessionId);
    
    // Verificar que solo hay una sesión
    const db = memoryService.db;
    const stmt = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE session_id = ?');
    const result = stmt.get(sessionId);
    
    assert.equal(result.count, 1, 'Solo debería haber una sesión');
  });

  it('debe permitir guardar mensajes después de ensureSession', async () => {
    const sessionId = `test_session_${Date.now()}`;
    
    memoryService.ensureSession(sessionId);
    
    const saved = await memoryService.saveMessage(sessionId, 'user', 'Mensaje de prueba');
    assert.ok(saved, 'El mensaje debería guardarse correctamente');
    
    const history = await memoryService.getConversationHistory(sessionId, 5);
    assert.ok(history.length > 0, 'El historial debería contener el mensaje');
  });

  it('debe permitir guardar contexto después de ensureSession', async () => {
    const sessionId = `test_session_${Date.now()}`;
    
    memoryService.ensureSession(sessionId);
    
    const context = { test: 'data', timestamp: Date.now() };
    const saved = await memoryService.saveContext(sessionId, context);
    assert.ok(saved, 'El contexto debería guardarse correctamente');
    
    const retrieved = await memoryService.getContext(sessionId);
    assert.equal(retrieved.test, context.test, 'El contexto debería recuperarse correctamente');
  });
});

**Última actualización:** 2026-08-24
**Versión:** 1.0 (Fase 0 Completada)
**Estado:** ✅ Estable