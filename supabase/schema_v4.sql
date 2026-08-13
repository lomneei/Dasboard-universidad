-- ============================================================
-- DUNI - Esquema v4: asistencia a actividades puntuales + ideas
-- Correr completo en: Supabase Dashboard -> SQL Editor -> New query
-- (requiere haber corrido antes schema.sql, schema_v2.sql y schema_v3.sql)
-- ============================================================

-- ---------- asistencias: nuevo tipo 'actividad' ----------
-- Para listas / actividades en clase que no son un bloque semanal fijo
-- (ej: "actividad en clase de Análisis Económico").
alter table public.asistencias drop constraint asistencias_tipo_check;
alter table public.asistencias add constraint asistencias_tipo_check
  check (tipo in ('clase', 'ayudantia', 'laboratorio', 'taller', 'actividad'));

-- ---------- Tabla: ideas ----------
-- Captura rápida de ideas. No se borran: se tachan (completada = true)
-- para conservar el historial de todo lo anotado.
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto text not null,
  completada boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "ideas propias" on public.ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index ideas_user_creada_idx on public.ideas (user_id, created_at desc);
