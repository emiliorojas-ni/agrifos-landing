# Ágrifos

Landing page de Ágrifos — inteligencia para el campo.

## Desarrollo

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Producción

```sh
pnpm build
```

Dominio de producción: https://agrifos.app/

Contacto: agrifos.app@gmail.com

## Solicitudes de demo

El panel privado está disponible en `/#/admin`. La integración de Supabase
permite gestionar solicitudes y publicar instaladores APK, DMG y EXE.
La configuración y el despliegue están descritos en
[supabase/README.md](supabase/README.md).
Cuando Supabase está conectado, las solicitudes se almacenan allí; sin esa
configuración se mantiene el envío por correo descrito a continuación.

El formulario de la landing envía las solicitudes a `agrifos.app@gmail.com`
mediante [FormSubmit](https://formsubmit.co/), usando su endpoint AJAX para
mantener al visitante en la página. No requiere claves ni un servidor propio.

Antes de usarlo en producción, envía una solicitud desde el sitio y confirma
el correo de activación que FormSubmit enviará al destinatario. Después de
activar el correo, vuelve a enviar una solicitud y verifica su recepción.
La primera solicitud no debe darse por recibida hasta completar esta verificación.

El formulario valida los campos obligatorios, requiere autorización de contacto,
incluye un honeypot y conserva los datos si el envío falla. Solo muestra la
confirmación cuando el servicio responde con éxito. Los envíos dependen de la
disponibilidad de FormSubmit; el correo de contacto queda como alternativa.

El destinatario se define en `src/components/DemoRequest.tsx`. Cambiarlo
requiere reconstruir el sitio y activar el nuevo correo.

GitHub Pages publica la carpeta `docs` desde la rama `main`.

Para actualizar esa versión:

```sh
pnpm exec vite build --base=/ --outDir docs
```

## Docker

Requiere Docker con Compose (en Windows, Docker Desktop con contenedores Linux).

```sh
docker compose up --build -d
```

La landing queda disponible en http://localhost:8080. La imagen compila el
proyecto con Node y pnpm usando el lockfile, y sirve el resultado con Nginx.
Incluye un healthcheck en `/healthz` y soporte para rutas de la aplicación.

Para usar otro puerto en PowerShell:

```powershell
$env:WEB_PORT = "3000"
docker compose up --build -d
```

Para ver los logs o detener los contenedores:

```sh
docker compose logs -f
docker compose down
```

Después de cambiar el código, ejecuta de nuevo `docker compose up --build -d`.

