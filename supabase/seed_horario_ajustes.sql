-- ============================================================
-- DUNI - Ajustes al horario 2026-2 (correr después del seed)
-- Correr completo en: Supabase Dashboard -> SQL Editor -> New query
--
-- Qué hace:
--   1. Sala de las cátedras de Fundamentos de Marketing -> AE105.
--   2. Mueve el Laboratorio de Dinámica a jueves M2 (09:40-10:50),
--      sala "Laboratorio 14".
--   3. Crea el pseudo-ramo "Entrenamiento Selección" (vóley playa,
--      color cian, tipo de bloque 'Otro') con sus 3 bloques:
--      martes y jueves 12:20-14:50 (bloque largo que cruza el
--      almuerzo) y viernes 13:30-14:50.
-- Es idempotente: se puede correr de nuevo sin duplicar nada.
-- ============================================================

-- 1) Sala de las cátedras de Marketing
update public.horario_bloques b
set sala = 'AE105'
from public.ramos r
where b.ramo_id = r.id
  and lower(r.nombre) = lower('Fundamentos de Marketing')
  and b.tipo = 'Cátedra';

-- 2) Laboratorio de Dinámica -> jueves M2, Laboratorio 14
update public.horario_bloques b
set dia_semana = 4, hora_inicio = '09:40', hora_fin = '10:50', sala = 'Laboratorio 14'
from public.ramos r
where b.ramo_id = r.id
  and lower(r.nombre) = lower('Dinámica')
  and b.tipo = 'Laboratorio';

-- 3a) Pseudo-ramo para los entrenamientos de selección (vóley playa)
insert into public.ramos (user_id, nombre, sigla, semestre, color)
select u.id, 'Entrenamiento Selección', 'SEL', '2026-2', '#06b6d4'
from (select id from auth.users order by created_at limit 1) u
where not exists (
  select 1 from public.ramos r
  where r.user_id = u.id and lower(r.nombre) = lower('Entrenamiento Selección')
);

insert into public.notas_config (ramo_id)
select r.id from public.ramos r
where lower(r.nombre) = lower('Entrenamiento Selección')
  and not exists (select 1 from public.notas_config nc where nc.ramo_id = r.id);

-- 3b) Bloques de entrenamiento (borra los previos del pseudo-ramo
--     para poder correr este archivo más de una vez sin duplicar)
delete from public.horario_bloques
where ramo_id in (
  select id from public.ramos where lower(nombre) = lower('Entrenamiento Selección')
);

insert into public.horario_bloques (ramo_id, tipo, dia_semana, hora_inicio, hora_fin, sala)
select r.id, 'Otro', v.dia, v.ini::time, v.fin::time, null
from (values
  (2, '12:20', '14:50'),
  (4, '12:20', '14:50'),
  (5, '13:30', '14:50')
) as v (dia, ini, fin)
join public.ramos r on lower(r.nombre) = lower('Entrenamiento Selección');

-- Verificación: 7 ramos (6 + Entrenamiento Selección) y 24 bloques
select
  (select count(*) from public.ramos) as ramos,
  (select count(*) from public.horario_bloques) as bloques;
