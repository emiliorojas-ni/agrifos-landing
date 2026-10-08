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

