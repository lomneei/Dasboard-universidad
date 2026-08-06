-- ============================================================
-- Seed opcional: crea los 7 ramos del semestre 2026-2.
-- IMPORTANTE: correr DESPUÉS de registrar tu cuenta en la app
-- (toma el user_id del primer usuario en auth.users).
-- Las siglas son referenciales — edítalas desde la app si quieres
-- poner las siglas oficiales PUC.
-- ============================================================

with yo as (
  select id from auth.users order by created_at limit 1
)
insert into public.ramos (user_id, nombre, sigla, semestre, color)
select yo.id, r.nombre, r.sigla, '2026-2', r.color
from yo,
  (values
    ('Cálculo 3',                                   'CALC3',  '#3b82f6'),
    ('Dinámica',                                    'DIN',    '#ef4444'),
    ('Laboratorio de Dinámica',                     'LABDIN', '#f97316'),
    ('Análisis Económico de la Experiencia Chilena','AECH',   '#22c55e'),
    ('Fundamentos de Marketing',                    'MKT',    '#ec4899'),
    ('Fundamentos de Finanzas',                     'FIN',    '#14b8a6'),
    ('Herramientas y Agentes de IA',                'IA',     '#8b5cf6')
  ) as r (nombre, sigla, color);

-- Config de notas por defecto (aprobación 4.0) para todo ramo que no la tenga
insert into public.notas_config (ramo_id)
select r.id
from public.ramos r
left join public.notas_config nc on nc.ramo_id = r.id
where nc.id is null;
