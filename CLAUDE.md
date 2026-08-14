# DUNI — dashboard universitario personal

App personal (un solo usuario: 24zucoo@gmail.com) para organizar la vida
universitaria: horario, evaluaciones y notas, tareas diarias, vóley e ideas.
Antes se llamaba "Dashboard Uni"; el rebrand a **DUNI** fue en agosto 2026.

## Stack

- React 18 + Vite 5 + react-router-dom v6
- Tailwind CSS v4 (`@tailwindcss/vite`, tokens en `@theme` de `src/index.css`)
- Supabase (auth + Postgres con RLS); el cliente está en `src/lib/supabase.js`
- PWA con vite-plugin-pwa (instalable en Android/iOS, íconos en `public/`)
- Fuentes self-hosted: Space Grotesk (títulos) + Inter (cuerpo) vía @fontsource-variable

## Forma de trabajo (pedida por el usuario)

- Todo en español: UI, comentarios, commits (mensajes `feat: ...` sin tildes).
- Commits chicos y descriptivos por feature. **Siempre hacer `git push` al final
  de cada tarea**; si falla, avisarlo explícitamente en el resumen.
- **Siempre actualizar este CLAUDE.md al terminar una tarea.**
- El usuario corre las migraciones a mano: entregar archivos
  `supabase/schema_vN.sql` y decirle qué correr en el SQL Editor.
- La app debe degradarse con un aviso amable si falta correr un schema
  (ver `faltaSchemaV3` en `src/lib/tareas.js` y los checks de schema_v4).
- Trabajo autónomo; consultar solo decisiones de diseño importantes.
- Notas en escala chilena 1.0–7.0.

## Identidad visual

Dark futurista tipo "Nébulis" (marca personal del usuario):

- Fondo casi negro violeta `#0b0a10` (tokens `--color-noche-950/900/800/700`),
  halos radiales en el body.
- Acento principal violeta (`violet-500/600`), cian solo para detalles
  (punto de "DUNI.", Google Calendar, botón Ideas).
- Clases compartidas en `src/index.css`: `panel`, `campo` (sin w-full),
  `btn-primario`, `btn-fantasma`, `glow-activo`, `pagina-entrada`,
  `check-tarea` (rebote al marcar), `modal-fondo`/`modal-caja` (animación).
- Estados: éxito `emerald-*`, error `red-*`, avisos `amber-*` (fondos /10–/15).

## Base de datos (supabase/)

Correr en orden en el SQL Editor. Estado: el usuario corrió schema.sql y
schema_v2.sql; **schema_v3.sql, schema_v4.sql y seed_horario_2026_2.sql
pueden estar pendientes** (verificar con él).

- `schema.sql` — ramos, evaluaciones, horario_bloques, notas_config (RLS por
  user_id directo o EXISTS sobre ramos).
- `schema_v2.sql` — asistencias (unique ramo+fecha+tipo), checklist_diario,
  volley_eventos (planificado vs asistio).
- `schema_v3.sql` — tareas_recurrentes + columna recurrente_id en
  checklist_diario (índice único parcial por tarea+fecha).
- `schema_v4.sql` — tipo 'actividad' en asistencias + tabla ideas.
- `seed_horario_2026_2.sql` — borra los bloques y crea ramos/bloques reales
  del 2do semestre 2026 (6 ramos, 21 bloques, módulos 1-7). Busca ramos por
  nombre; el bloque doble de IA del martes va como un solo bloque 08:20-10:50.
  v2: toma el único usuario de auth.users (la v1 filtraba por email y si no
  calzaba insertaba 0 filas sin error); termina con un select de verificación.

## Estructura y features

- `src/components/Layout.jsx` — header sticky con marca DUNI, botón 💡 Ideas y
  Salir arriba; nav [Tareas, Calendario] INICIO [Horario, Vóley]; FAB
  TareaRapida en todas las páginas.
- `src/pages/Inicio.jsx` (`/`) — centro de mando: stats (tareas hoy, racha,
  próxima evaluación), "Próximos 7 días" (evaluaciones + bloques + vóley),
  pendientes de hoy con checkbox (optimista, tachado sin desaparecer),
  progreso semanal.
- `src/pages/Tareas.jsx` — recurrentes diarias (materialización idempotente en
  `src/lib/tareas.js`) + puntuales, grid de consistencia 16 semanas, racha 🔥,
  historial mini-calendario por tarea recurrente (botón 📅 expandible).
- `src/pages/Calendario.jsx` — vista mensual (puntos por ramo + punto cian de
  GCal), evaluaciones próximas/rendidas con CRUD, panel Google Calendar.
- `src/lib/gcal.js` — Google Calendar SOLO LECTURA vía Google Identity
  Services (popup, token ~1 h en localStorage, sin backend). Necesita
  `VITE_GOOGLE_CLIENT_ID` en `.env` (ver `.env.example`). Al expirar el token
  la UI vuelve a mostrar "Conectar".
- `src/pages/Horario.jsx` — grilla semanal (bloques muestran NOMBRE del ramo,
  con tipo antepuesto si no es cátedra, y sala en chico; color de fondo = color
  del ramo), gestión de ramos en modal (`GestionRamos.jsx`), y
  `ControlAsistencia.jsx` debajo: asistencia histórica (verde/rojo/gris,
  click cicla fui→falté→sin marcar) para las actividades de
  `SEGUIMIENTOS_ASISTENCIA` en `src/lib/constantes.js`; usa el rango
  `SEMESTRE` (actualizar cada semestre).
- `src/pages/Ideas.jsx` (`/ideas`) — captura rápida; las ideas no se borran,
  se tachan.
- `src/pages/Voley.jsx` — eventos planificados vs asistidos, % consistencia.
- `src/pages/RamoDetalle.jsx` (`/ramos/:id`) — notas + asistencia del día.
- `src/lib/fechas.js` — fechas 'YYYY-MM-DD' SIEMPRE parseadas como locales
  (parseFechaLocal) para evitar corrimiento UTC.

## Decisiones tomadas

- Tareas recurrentes sin cron: cada carga materializa la instancia de hoy en
  checklist_diario (fuente única por día para grid/racha/inicio).
- Racha: hoy sin completar no la rompe (se cuenta desde ayer).
- Control de asistencia usa la tabla `asistencias` existente; los seguimientos
  semanales generan sus fechas desde `SEMESTRE.inicio` por día de la semana,
  el puntual ('actividad') se registra a mano.
- GCal sin backend a propósito (app 100% estática); tokens de 1 h, reconectar
  es un click.
- Updates optimistas al marcar tareas/ideas para que la micro-animación se
  sienta inmediata; en error se recarga.

## Pendiente del usuario

- Correr `supabase/schema_v3.sql`, `schema_v4.sql` y
  `seed_horario_2026_2.sql` si no lo ha hecho.
- Crear OAuth Client ID en Google Cloud Console y ponerlo en `.env` como
  `VITE_GOOGLE_CLIENT_ID` (orígenes: http://localhost:5173 + dominio prod).
