-- ============================================================
-- Dashboard Uni - Esquema de base de datos (Supabase / Postgres)
-- Correr completo en: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- ---------- Tabla: ramos ----------
-- Cada ramo/curso del semestre. user_id amarra la fila al usuario
-- autenticado (se completa solo gracias al DEFAULT auth.uid()).
create table public.ramos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  sigla text not null,
  semestre text,
  color text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

-- ---------- Tabla: evaluaciones ----------
-- Pruebas, controles, tareas, etc. de un ramo.
-- peso_pct: peso en % dentro del ramo (idealmente suman 100).
-- nota: null mientras no esté rendida (escala 1.0 - 7.0).
create table public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  ramo_id uuid not null references public.ramos (id) on delete cascade,
  nombre text not null,
  fecha date,
  peso_pct numeric(5, 2) not null check (peso_pct > 0 and peso_pct <= 100),
  nota numeric(3, 1) check (nota >= 1.0 and nota <= 7.0),
  tipo text not null default 'Prueba',
  created_at timestamptz not null default now()
);

-- ---------- Tabla: horario_bloques ----------
-- Bloques del horario semanal. dia_semana: 1=lunes ... 5=viernes.
-- Horas como time (ej: '08:20', '09:30').
create table public.horario_bloques (
  id uuid primary key default gen_random_uuid(),
  ramo_id uuid not null references public.ramos (id) on delete cascade,
  tipo text not null default 'Cátedra',
  dia_semana smallint not null check (dia_semana between 1 and 5),
  hora_inicio time not null,
  hora_fin time not null,
  sala text,
  created_at timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);

-- ---------- Tabla: notas_config ----------
-- Configuración de notas por ramo: nota mínima de aprobación y
-- (opcional) nota de eximición del examen. Una fila por ramo.
create table public.notas_config (
  id uuid primary key default gen_random_uuid(),
  ramo_id uuid not null unique references public.ramos (id) on delete cascade,
  nota_aprobacion numeric(3, 1) not null default 4.0,
  nota_eximicion numeric(3, 1),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Con RLS activado, nadie puede leer/escribir salvo lo que permitan
-- las policies. Todas exigen que la fila pertenezca al usuario logueado;
-- en las tablas hijas la pertenencia se verifica a través del ramo.
alter table public.ramos enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.horario_bloques enable row level security;
alter table public.notas_config enable row level security;

create policy "ramos propios" on public.ramos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "evaluaciones de mis ramos" on public.evaluaciones
  for all
  using (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()));

create policy "bloques de mis ramos" on public.horario_bloques
  for all
  using (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()));

create policy "config de mis ramos" on public.notas_config
  for all
  using (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.ramos r where r.id = ramo_id and r.user_id = auth.uid()));

-- ---------- Índices para las consultas frecuentes ----------
create index evaluaciones_ramo_idx on public.evaluaciones (ramo_id);
create index evaluaciones_fecha_idx on public.evaluaciones (fecha);
create index horario_bloques_ramo_idx on public.horario_bloques (ramo_id);
