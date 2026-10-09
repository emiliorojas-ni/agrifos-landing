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

GitHub Pages publica la carpeta `docs` desde la rama `main`.

Para actualizar esa versión:

```sh
pnpm exec vite build --base=/agrifos-landing/ --outDir docs
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

