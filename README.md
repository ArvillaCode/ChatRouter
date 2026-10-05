# AI Gateway Chat

Interfaz tipo ChatGPT multi-provider con OpenRouter + NVIDIA NIM, catálogo de modelos, clasificación por precio y tracking de costos.

## Incluye

- Next.js 16 + React 19
- Supabase Auth + Postgres + RLS
- OpenRouter streaming y sincronización automática de precios
- NVIDIA hosted API / NIM compatible con OpenAI
- Selector: Gratis / Económico / Medio / Premium
- Costos por mensaje, conversación y mes
- Presupuesto mensual base
- Dockerfile listo para Coolify

## 1. Crear Supabase independiente

Crea un proyecto nuevo de Supabase para esta app (no reutilices bases de otros productos). Ejecuta `supabase/migrations/001_initial_schema.sql` en el SQL Editor.

Auth: habilita Email/Password. Para desarrollo puedes desactivar confirmación de correo; en producción es mejor mantenerla activa.

## 2. Variables

Copia `.env.example` a `.env.local` y completa:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (solo servidor)
- `OPENROUTER_API_KEY`
- `NVIDIA_API_KEY`
- `APP_URL`

Nunca expongas `SUPABASE_SECRET_KEY`, `OPENROUTER_API_KEY` o `NVIDIA_API_KEY` con prefijo `NEXT_PUBLIC_`.

## 3. Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`, crea tu cuenta y pulsa **Actualizar modelos**.

## 4. Cómo se clasifican los precios

Para OpenRouter se usan los precios vigentes recibidos de `/api/v1/models`:

- Gratis: input=0 y output=0
- Económico: promedio input/output < $1 por millón de tokens
- Medio: $1–$10 por millón
- Premium: > $10 por millón

NVIDIA se integra como hosted/free endpoint y queda separado como provider. La app no inventa un precio comercial: registra $0 mientras se use bajo ese endpoint gratuito. Si NVIDIA cambia el esquema de facturación, actualiza `lib/ai/catalog.ts` para consumir su fuente de pricing.

## 5. Coolify

1. Sube el repositorio a GitHub/GitLab.
2. En Coolify: New Resource → Application → repositorio.
3. Build Pack: Dockerfile.
4. Añade las variables de `.env.example`.
5. Asigna dominio HTTPS.
6. Cambia `APP_URL` al dominio final.
7. En Supabase Auth → URL Configuration, configura Site URL y Redirect URLs con el dominio final.
8. Deploy.

## Seguridad

- API keys privadas solo se leen en Route Handlers del servidor.
- `service/secret key` de Supabase nunca llega al navegador.
- Todas las tablas de datos de usuario tienen RLS.
- El catálogo es lectura pública solo para usuarios autenticados y escritura solo desde el backend con la secret key.
- El servidor comprueba el presupuesto mensual antes de abrir una nueva inferencia.

## Próximos módulos previstos

La arquitectura `lib/ai/providers.ts` permite añadir Groq, Cerebras, Together, Fireworks, Anthropic directo u otros proveedores sin cambiar el frontend.
