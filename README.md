# Dashboard Uni 🎓

Dashboard personal universitario: ramos, evaluaciones, horario semanal y
calculadora de notas (escala chilena 1,0–7,0). Hecho con React + Vite +
Tailwind CSS y Supabase (Postgres + Auth).

## Funcionalidades

- **Esta semana** (home): evaluaciones próximas + clases de los próximos 7 días.
- **Ramos**: CRUD en tarjetas con color por ramo.
- **Horario**: calendario semanal (lunes a viernes) con bloques por ramo.
- **Evaluaciones**: lista ordenada por fecha, con alerta visual si falta menos
  de una semana.
- **Calculadora de notas** por ramo: promedio actual ponderado y simulación de
  qué nota necesitas en lo pendiente para aprobar (4,0) o eximirte.

## Setup

### 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor → New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo.
3. En **Project Settings → API** copia la URL del proyecto y la anon key.

### 2. App local

```bash
npm install
cp .env.example .env   # y completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

La primera vez, regístrate desde la pantalla de login (email + contraseña).
Si Supabase tiene activada la confirmación por email (viene activada por
defecto), confirma el correo antes de entrar.

### 3. Deploy en Vercel

1. Importa el repo desde GitHub en Vercel (framework preset: **Vite**).
2. En **Settings → Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy. El archivo `vercel.json` ya incluye el rewrite necesario para que
   las rutas de React Router funcionen al recargar la página.

## Estructura

```
src/
  components/   # Layout, Modal, ProtectedRoute, EvaluacionModal
  hooks/        # useAuth (sesión de Supabase via contexto)
  lib/          # cliente supabase, cálculo de notas, fechas, constantes
  pages/        # Login, EstaSemana, Ramos, RamoDetalle, Horario, Evaluaciones
supabase/
  schema.sql    # esquema completo de la DB con RLS
```

## Cómo calcula las notas

- **Promedio actual** = promedio ponderado de las evaluaciones con nota,
  normalizado por el peso rendido.
- **Nota necesaria** = la nota uniforme `x` tal que
  `(puntos rendidos + x · peso pendiente) / peso total = objetivo`.
  Si `x ≤ 1,0` el objetivo ya está asegurado; si `x > 7,0` ya no es alcanzable.
- Si los pesos del ramo no suman 100%, la app avisa y calcula sobre el total
  registrado.
