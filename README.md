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

GitHub Pages publica la carpeta `docs` desde la rama `main`.

Para actualizar esa versión:

```sh
pnpm exec vite build --base=/ --outDir docs
```

