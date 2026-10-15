# Sunday Brew Coffee — sitio + panel

Sitio en inglés para Sunday Brew Coffee (café en tráiler, Phoenix AZ). HTML/CSS/JS sin build, datos en Supabase.

## Estructura

```
public/                 ← todo lo que se publica
  index.html, find-us.html, menu.html, merch.html, book.html, resources.html
  styles.css            ← todo el estilo; variables de marca en :root
  config.js             ← URL y llave publishable de Supabase (públicas)
  js/                   ← lib.js (cliente Supabase + helpers) y un archivo por página
  admin/                ← panel: login, solicitudes, eventos, menú, merch, ajustes
  media/                ← logos/, icons/, photos/ (archivos fijos del sitio)
src/worker.js           ← Worker de Cloudflare: /api/booking (guardar + correo Resend)
supabase/migrations/    ← esquema, RLS, GRANTs y bucket de Storage
.github/workflows/      ← preview en GitHub Pages
```

Las fotos que los dueños suben desde el panel van al bucket `public-images` de Supabase; `public/media/` es para lo fijo (logo, íconos, fotos de la página de inicio).

## Etapas de hosting

1. **Ahora: preview en GitHub Pages.** Cada push a `main` publica `public/`. Las páginas, el menú, los eventos y el panel funcionan (hablan directo con Supabase). **El formulario Book Us no**, porque Pages no corre código de servidor.
   - Con el plan Free de GitHub, Pages requiere repo público. No hay secretos en el repo.
   - Activar: Settings → Pages → Source: **GitHub Actions**.
2. **Después: Cloudflare Workers.** Conectar el repo en Workers & Pages (deploy command `npx wrangler deploy`), cargar los secretos y el formulario empieza a funcionar. Luego se apaga Pages.

## Supabase

1. En el proyecto del cliente: SQL Editor → pegar `supabase/migrations/0001_init.sql` → Run.
2. Authentication → Users → crear a Marion y Daniel (sin registro público; desactivar "Allow new users to sign up").
3. Registrarlos como admins:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email in ('…', '…');
   ```
4. Copiar Project URL y la llave publishable a `public/config.js`.
5. Authentication → URL Configuration: agregar la URL del preview y luego la del dominio.

## Variables (solo en el Worker, nunca en el repo)

| Variable | Qué hace | De dónde sale |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto | Supabase del cliente → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Insertar solicitudes saltando RLS | Supabase del cliente → API keys (secret) |
| `RESEND_API_KEY` | Mandar el aviso de nueva solicitud | Resend del cliente |
| `BOOKING_NOTIFY_TO` | A quién llega el aviso (separar con comas) | Gmail de los dueños |
| `EMAIL_FROM` | Remitente (en `wrangler.jsonc`) | `bookings@sundaybrewcoffeeaz.com`, dominio verificado en Resend |

Cambiar una variable requiere volver a desplegar.

## Correr en local

```bash
npx wrangler dev        # sitio + /api/booking (usa .dev.vars)
npx serve public -l 8000   # solo estático, URLs sin .html como GitHub Pages
```

## Fases de diseño

1. **Estructura y funcionalidad** (actual): CSS neutro, una columna, sin marca.
2. **Marca**: logo, colores, tipografía y fotos → sobre todo `:root` en `styles.css` y `public/media/`.
3. **Pulido**: responsive fino, transiciones, feedback.
