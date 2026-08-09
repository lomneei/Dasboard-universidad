-- ============================================================
-- Dashboard Uni - Esquema v2: asistencias, checklist y vóley
-- Correr completo en: Supabase Dashboard -> SQL Editor -> New query
-- (requiere haber corrido antes schema.sql)
-- ============================================================

-- ---------- Tabla: asistencias ----------
-- Registro de asistencia por ramo, día y tipo de actividad.
-- Una fila por (ramo, fecha, tipo) para poder marcar/desmarcar con upsert.
create table public.asistencias (
  id uuid primary key default gen_random_uuid(),
  ramo_id uuid not null references public.ramos (id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('clase', 'ayudantia', 'laboratorio', 'taller')),
  asistio boolean not null default true,
  created_at timestamptz not null default now(),
  unique (ramo_id, fecha, tipo)
);

-- ---------- Tabla: checklist_diario ----------
-- To-dos del día, con categoría para separar universidad / negocio / vida.
-- No cuelga de un ramo, así que lleva user_id directo (igual que ramos).
create table public.checklist_diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha date not null default current_date,
  texto text not null,
  completado boolean not null default false,
  categoria text not null default 'personal'
    check (categoria in ('academico', 'negocio', 'personal')),
  created_at timestamptz not null default now()
);

-- ---------- Tabla: volley_eventos ----------
-- Entrenamientos, partidos y torneos.
-- planificado: lo agendé con anticipación (para medir consistencia).
-- asistio: null = el evento aún no pasa / no lo he marcado;
--          true/false = fui o no fui. Comparar planificado vs asistio
--          permite ver cuántos entrenamientos planeados cumplí.
create table public.volley_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('entrenamiento', 'partido', 'torneo')),
  fecha date not null,
  notas text,
  planificado boolean not null default true,
  asistio boolean,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Mismo patrón que schema.sql: asistencias hereda la pertenencia a
-- través del ramo; las otras dos usan user_id directo.
alter table public.asistencias enable row level security;
alter table public.checklist_diario enable row level security;
alter table public.volley_eventos enable row level security;

create policy "asistencias de mis ramos" on public.asistencias
  for all
  using (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()));

create policy "checklist propio" on public.checklist_diario
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "eventos de voley propios" on public.volley_eventos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Índices para las consultas frecuentes ----------
create index asistencias_ramo_fecha_idx on public.asistencias (ramo_id, fecha);
create index checklist_diario_user_fecha_idx on public.checklist_diario (user_id, fecha);
create index volley_eventos_user_fecha_idx on public.volley_eventos (user_id, fecha);
