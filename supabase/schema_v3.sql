-- ============================================================
-- DUNI - Esquema v3: tareas recurrentes
-- Correr completo en: Supabase Dashboard -> SQL Editor -> New query
-- (requiere haber corrido antes schema.sql y schema_v2.sql)
-- ============================================================

-- ---------- Tabla: tareas_recurrentes ----------
-- Definición de tareas que se repiten todos los días (ej: meditar,
-- pesas/recovery, elongar). Mientras activa = true, la app crea una
-- instancia diaria en checklist_diario al abrir Tareas o Inicio.
create table public.tareas_recurrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tareas_recurrentes enable row level security;

create policy "tareas recurrentes propias" on public.tareas_recurrentes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index tareas_recurrentes_user_idx on public.tareas_recurrentes (user_id, activa);

-- ---------- checklist_diario: enlace a la tarea recurrente ----------
-- Cada día, las tareas recurrentes activas se materializan como filas
-- normales del checklist con recurrente_id apuntando a su definición.
-- Las tareas de un solo día siguen siendo filas con recurrente_id null.
alter table public.checklist_diario
  add column recurrente_id uuid references public.tareas_recurrentes (id) on delete cascade;

-- Una sola instancia por tarea recurrente por día
create unique index checklist_diario_recurrente_unica
  on public.checklist_diario (recurrente_id, fecha)
  where recurrente_id is not null;
