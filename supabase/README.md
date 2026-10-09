# Panel administrativo de Ágrifos

La interfaz está en `/#/admin`. La autenticación, los permisos y los archivos
se gestionan en Supabase. Ocultar la ruta no es la protección: las políticas
de PostgreSQL y Storage comprueban la autorización en cada operación.

## Configurar el servicio

1. Crea un proyecto Free en [Supabase](https://supabase.com/dashboard), o usa el
   proyecto de Ágrifos existente. No requiere cambiar de plan.
2. Ejecuta las migraciones de `migrations/` en orden en el SQL Editor del proyecto,
   o aplica la migración con la CLI (`supabase link` y `supabase db push`).
   La migración crea el esquema, el bucket privado y la referencia al APK
   Android ARM64 de la publicación v1.0.0. No descarga ni duplica ese archivo.
3. Usa una cuenta existente de Authentication o crea una cuenta administrativa
   desde el Dashboard y confirma su correo. En un proyecto exclusivo del panel,
   puedes deshabilitar el registro público. Si comparte proyecto con la app,
   conserva la configuración de registro de la app.
   El panel no permite registros ni asignación de permisos.
4. Autoriza su UUID desde el SQL Editor:

   ```sql
   insert into private.administrators(user_id)
   values ('UUID_DEL_USUARIO_EN_AUTHENTICATION');
   ```

   Para retirar el permiso, elimina únicamente esa fila. Una cuenta válida
   que no figure en esta tabla no puede leer solicitudes ni cargar archivos.
5. Opcional: crea un widget [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
   para `agrifos.app` y, si vas a probar localmente, `localhost`.
   La verificación añade un desafío contra envíos automatizados. Sin este widget,
   el formulario usa el campo trampa y límites transaccionales en Supabase.
6. Copia `functions/.env.example` a `functions/.env` y completa
   `DEMO_RATE_LIMIT_SECRET` (secreto aleatorio de al menos 32 bytes) y
   `ALLOWED_ORIGINS` (orígenes exactos, separados por
   comas, sin barra final). Si usas Turnstile, añade `TURNSTILE_SECRET_KEY`.
   Estos secretos solo se usan en el servidor.
7. Desde un equipo con la CLI de Supabase instalada, vincula el proyecto,
   establece los secretos y despliega las dos funciones:

   ```sh
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set --env-file supabase/functions/.env
   supabase functions deploy submit-demo --no-verify-jwt
   supabase functions deploy download-installer --no-verify-jwt
   ```

   Son endpoints públicos por diseño: `submit-demo` valida los datos y exige la
   cuota de envío; si hay secreto Turnstile configurado, también exige su token,
   hostname y acción `demo-request`. `download-installer` solo
   entrega archivos publicados. Las operaciones administrativas usan la
   sesión de Supabase Auth y RLS. Supabase proporciona las variables privadas
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a las funciones.
8. Copia `.env.example` de la raíz a `.env.local` y completa:

   ```dotenv
   VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICA_DEL_PROYECTO
   VITE_TURNSTILE_SITE_KEY=
   ```

   Usa la clave **publishable** (o la clave pública `anon` compatible). Nunca
   uses `service_role`, una clave `secret`, ni la clave secreta de Turnstile
   en variables `VITE_*`: se incorporan al JavaScript público.
   Solo completa `VITE_TURNSTILE_SITE_KEY` si configuraste el secreto del widget.

## Integración configurada

El proyecto `Agrifos` (`nquoibsuhgbomlbsljvs`) está en la organización Free.
Se aplicaron las dos migraciones y se desplegaron `submit-demo` y
`download-installer`. La cuenta existente del propietario tiene acceso al panel;
su contraseña y la configuración de registro de la aplicación se conservan.
El panel incluye recuperación de contraseña. Supabase permite el retorno a
`http://localhost:8081/?recovery=1` y `https://agrifos.app/?recovery=1`, además
del enlace de la aplicación Android. El correo abre una pantalla para elegir
la contraseña; cambiarla también afecta al acceso de esa cuenta en la app.
La recuperación acepta la sesión del enlace y elimina sus tokens de la URL.
El dominio público debe tener esta rama integrada antes de usar su retorno;
mientras tanto, usa el panel local. No registres enlaces de recuperación ni
contraseñas en Git.
La configuración pública local está en `.env.local` y los secretos en
`supabase/functions/.env`, ambos excluidos de Git. El JavaScript compilado contiene
solo la clave pública; los permisos se comprueban mediante RLS.

## Construcción y publicación

Con pnpm, Vite lee `.env.local`. Construye `docs` y revisa el resultado antes
de hacer el commit destinado a GitHub Pages:

```sh
pnpm exec vite build --base=/ --outDir docs
```

Con Docker Compose, copia la configuración pública a `.env` (Compose lee
ese nombre) o usa `--env-file .env.local`:

```sh
docker compose --env-file .env.local up --build -d
```

Las claves del servidor no entran en Docker ni en Git. La landing no necesita
un servidor Node en producción: las funciones se ejecutan en Supabase.

## Comportamiento

- Sin configuración de Supabase, el formulario conserva el envío a FormSubmit,
  el APK existente se enlaza desde GitHub y el panel indica que falta conectar
  el servicio. No hay usuarios, contraseñas ni datos de muestra embebidos.
- Con Supabase configurado, las nuevas solicitudes se guardan en la base de
  datos y se gestionan en el panel. No se envían además por FormSubmit ni se
  importan las solicitudes que ya llegaron por correo.
- Estados: Nueva, Contactada, Demo agendada, Completada y Archivada. Hay
  búsqueda, paginación de 25 solicitudes y notas internas. Archivar conserva
  la información; no elimina registros.
- Cada instalador cargado queda como borrador en un bucket privado. Solo se
  admite APK para Android, hasta 50 MB, compatible con el plan Free. El APK
  inicial continúa alojado en GitHub para no duplicar almacenamiento ni tráfico.
- Los envíos tienen un límite de 3 por ventana de una hora por IP y correo,
  y 100 por día en total. Se guardan HMAC de IP/correo con secreto del servidor;
  los contadores caducados se limpian en cada envío. La IP procede del gateway
  de Supabase y el límite global también protege si cambia la IP. Una red
  compartida puede alcanzar el límite; el usuario puede escribir al correo de
  contacto. Esta protección limita los registros guardados, no las invocaciones
  que cuentan para la cuota Free. Turnstile sigue disponible como refuerzo.
- Publicar una versión retira la publicación anterior de esa plataforma de
  forma transaccional. Los borradores solo pueden descargarse con una sesión
  administrativa; las descargas públicas reciben URLs firmadas de 60 segundos.
  Retirar una publicación no invalida enlaces firmados ya emitidos hasta que
  expiren. No se modifica el repositorio `ferjovel06/agrifos`.
- El panel conserva la sesión solo en la pestaña, permite cerrar sesión y
  no almacena solicitudes en el navegador de forma persistente.

## Verificación antes de habilitarlo

Prueba en el proyecto configurado: acceso con una cuenta autorizada y con otra
sin permiso; solicitud real; cambio de estado; carga de un APK;
publicación y retirada; y rechazo de descargas de borradores.
Las pruebas locales con respuestas simuladas no sustituyen esta verificación
del servicio desplegado. No uses datos personales reales para las pruebas.

Las pruebas SQL de `tests/admin-security.sql` se ejecutan únicamente en una
base desechable con `tests/supabase-fixture.sql`; nunca apliques ese fixture a
un proyecto real. Comprueban los permisos y las reglas de publicación.

Con Deno instalado, comprueba los endpoints con servicios simulados:

```sh
deno test --node-modules-dir=auto --allow-env tests/edge-functions.test.ts
```

Esta prueba no envía correos ni usa un proyecto Supabase real.
`tests/demo-rate-limits.sql` comprueba límites por IP, correo y global, además
del rechazo de cambios a la cuota por usuarios del navegador. Se ejecuta después
de las migraciones en la misma base desechable de las pruebas de permisos.
