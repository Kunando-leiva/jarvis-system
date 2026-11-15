# Instagram Stories en JARVIS

## Alcance

Este módulo agrega una cola de historias al backend actual. No reemplaza el servicio de Reels ni modifica su flujo.

### API

- `POST /api/instagram/stories`: crea una historia programada.
- `GET /api/instagram/stories`: lista historias y estados.
- `POST /api/instagram/stories/process-due`: ejecuta manualmente el procesador (útil para pruebas).
- `POST /api/instagram/stories/:id/manual-complete`: marca como completada una historia publicada desde la app de Instagram.

Ejemplo:

```json
{
  "title": "Invitación al canal",
  "mediaType": "image",
  "mediaUrl": "https://servidor-publico.example/story.jpg",
  "scheduledAt": "2026-11-20T20:30:00-03:00",
  "accountId": "valhalla",
  "linkUrl": "https://chat.whatsapp.com/...",
  "linkLabel": "UNITE A NUESTRO CANAL"
}
```

## Comportamiento del enlace

Instagram Graph API permite publicar medios como Stories mediante `media_type=STORIES`, pero no ofrece un parámetro oficial para crear el sticker interactivo de enlace. Por eso, cuando se proporciona `linkUrl`, JARVIS NO publica la historia automáticamente: al llegar la hora, cambia a `MANUAL_ACTION_REQUIRED` y envía a n8n el medio, URL, etiqueta e instrucciones para publicarla desde Instagram agregando el sticker.

Sin `linkUrl`, el backend publica la historia mediante Graph API. Los archivos deben estar alojados en una URL HTTPS pública que Meta pueda descargar.

## Variables de entorno

- `META_GRAPH_API_VERSION` (opcional, por defecto `v22.0`)
- `VAULT_PATH`
- Tokens e IDs de cuenta existentes: `INSTAGRAM_ACCESS_TOKEN_VALHALLA`, `INSTAGRAM_BUSINESS_ID_VALHALLA`, `INSTAGRAM_ACCESS_TOKEN_ALHORNO`, `INSTAGRAM_BUSINESS_ID_ALHORNO`

No agregar credenciales al repositorio. Verificar elegibilidad de publicación de Stories y permisos de cada cuenta con Meta antes de habilitar producción.

## Limitaciones conocidas

- Esta primera entrega agrega endpoints de backend; la interfaz frontend y el workflow de notificación n8n deben conectarse en una siguiente iteración.
- El estado `PUBLISHED` en `manual-complete` es una confirmación ingresada por el usuario; el backend no puede verificar una publicación manual.
- Una historia con enlace se pausa para acción humana y no se publica sin el sticker.
