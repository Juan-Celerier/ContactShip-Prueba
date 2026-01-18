# ContactShip Prueba Técnica Backend

Microservicio para gestión de leads construido con NestJS, TypeScript, Supabase, Redis y OpenAI.

## Descripción

Este proyecto implementa un microservicio que gestiona leads, con funcionalidades para crear leads manualmente, listar leads, obtener detalles con cache, generar resúmenes con IA y sincronizar leads automáticamente desde una API externa.

## Tecnologías Utilizadas

- **NestJS**: Framework para Node.js
- **TypeScript**: Lenguaje de programación
- **PostgreSQL (Supabase)**: Base de datos
- **Redis**: Cache y colas
- **OpenAI**: Integración con IA para resúmenes
- **Axios**: Cliente HTTP para APIs externas

## Requisitos Previos

- Node.js (v16 o superior)
- PostgreSQL (o Supabase)
- Redis
- Cuenta de OpenAI (para la API de IA)

## Instalación

1. Clona el repositorio:

   ```bash
   git clone <repository-url>
   cd contactship-prueba
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Configura las variables de entorno. Crea un archivo `.env` en la raíz del proyecto:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   REDIS_HOST=localhost
   REDIS_PORT=6379
   OPENAI_API_KEY=tu-api-key-de-openai
   JWT_SECRET=tu-secreto-jwt
   ```

## Ejecución

### Desarrollo

```bash
npm run start:dev
```

### Producción

```bash
npm run build
npm run start:prod
```

## API Endpoints

### Autenticación

#### Login

- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
  ```

Todos los demás endpoints requieren el header `Authorization: Bearer <token>`.

### Leads

#### Crear Lead Manualmente

- **POST** `/create-lead`
- **Body**:
  ```json
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "123-456-7890",
    "cell": "098-765-4321",
    "picture_large": "https://example.com/picture.jpg"
  }
  ```

### Listar Leads

- **GET** `/leads`
- **Response**: Array de leads

### Obtener Detalle de Lead (con Cache)

- **GET** `/leads/:id`
- **Response**: Detalle del lead (cacheado por 5 minutos)

### Generar Resumen con IA

- **POST** `/leads/:id/summarize`
- **Response**:
  ```json
  {
    "summary": "Resumen generado por IA",
    "next_action": "Acción sugerida"
  }
  ```

## Sincronización Automática

El sistema sincroniza automáticamente 10 leads desde la API de Random User Generator cada hora usando un cron job de NestJS.

## Decisiones Técnicas

### Arquitectura y Diseño
- **Separación de responsabilidades**: Controladores delgados enfocados en HTTP, servicios con lógica de negocio, entidades para persistencia
- **Módulos independientes**: AuthModule, LeadsModule, SyncModule permiten escalabilidad y mantenibilidad
- **DTOs para validación**: Uso de class-validator para entrada/salida consistente y segura

### Persistencia y Datos
- **PostgreSQL como base de datos principal**: Elegido por su robustez y soporte transaccional
- **Deduplicación por email**: Estrategia simple y efectiva, implementada tanto en creación manual como sincronización externa
- **Índice único en email**: Protección a nivel base de datos contra duplicados

### Cache y Performance
- **Redis solo para detalle de leads**: Cache agresivo en GET /leads/:id con TTL de 5 minutos
- **Cache invalidation automática**: Invalida cache cuando se actualiza un lead (ej: IA genera summary)
- **No cache en listados**: Permite ver cambios recientes inmediatamente

### Procesamiento Asíncrono
- **Colas para operaciones pesadas**: IA y sincronización externa usan Bull queues
- **Scheduler de NestJS**: CRON job cada hora para sincronización automática
- **Background processing**: No bloquea requests HTTP, mejora UX y escalabilidad

### Seguridad
- **JWT para autenticación**: Bearer tokens en headers Authorization
- **Validación de entrada**: DTOs con class-validator previenen datos maliciosos
- **Protección de endpoints**: Guards aplicados consistentemente

### IA y Integración Externa
- **OpenAI GPT-3.5-turbo**: Modelo balanceado entre costo y calidad
- **Prompt estructurado**: Garantiza formato JSON consistente {summary, next_action}
- **Persistencia del resultado**: IA enriquece datos sin acoplar lógica de negocio

### Logging y Monitoreo
- **Logs contextuales**: Diferentes niveles para desarrollo y producción
- **Manejo de errores consistente**: No expone información interna
- **Trazabilidad**: Job IDs y timestamps para debugging

## Seguridad

- Autenticación JWT mediante Bearer token en el header `Authorization`
- Validación de datos de entrada con DTOs y class-validator

## Cache

- Los detalles de leads se cachean en Redis por 5 minutos
- Mejora el rendimiento de consultas frecuentes

## Manejo de Errores

- Errores consistentes con códigos HTTP apropiados
- Logs detallados para debugging

## Arquitectura

- **Entity**: Lead (TypeORM)
- **DTOs**: CreateLeadDto, LeadDto
- **Service**: LeadsService (lógica de negocio)
- **Controller**: LeadsController (endpoints HTTP)
- **Guard**: JwtGuard (seguridad)
- **AI Service**: AiService (integración con OpenAI)
- **Sync Service**: SyncService (sincronización con cron)

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Licencia

Este proyecto no tiene licencia (UNLICENSED).
