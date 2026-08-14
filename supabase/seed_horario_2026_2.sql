-- ============================================================
-- DUNI - Seed del horario real 2026 - 2do semestre  (v2 corregida)
-- Correr completo en: Supabase Dashboard -> SQL Editor -> New query
--
-- v2: ya no filtra auth.users por email (si el email no calzaba, el
-- cross join devolvía 0 filas y el seed "corría sin errores" pero no
-- insertaba nada). Ahora usa el único usuario de la app y falla con
-- un mensaje claro si no encuentra ninguno.
--
-- Qué hace:
--   1. Verifica que exista tu usuario en auth.users.
--   2. Borra TODOS los bloques de horario actuales (los ramos y sus
--      notas/evaluaciones NO se tocan).
--   3. Crea los ramos del semestre que no existan todavía (por nombre).
--   4. Inserta todos los bloques del horario.
--
-- Módulos: 1: 08:20-09:30 | 2: 09:40-10:50 | 3: 11:00-12:10
--          4: 12:20-13:30 | 5: 14:50-16:00 | 6: 16:10-17:20
--          7: 17:30-18:40
-- ============================================================

-- 0) Guard: si esto falla, no hay usuario registrado en este proyecto
do $$
declare
  total integer;
begin
  select count(*) into total from auth.users;
  if total = 0 then
    raise exception 'auth.users está vacío: inicia sesión en la app al menos una vez antes de correr el seed';
  end if;
  if total > 1 then
    raise notice 'Ojo: hay % usuarios; el seed usará el más antiguo', total;
  end if;
end $$;

-- 1) Limpiar el horario actual del usuario
delete from public.horario_bloques
where ramo_id in (
  select id from public.ramos
  where user_id = (select id from auth.users order by created_at limit 1)
);

-- 2) Crear los ramos que falten (por nombre, sin duplicar)
insert into public.ramos (user_id, nombre, sigla, semestre, color)
select u.id, v.nombre, v.sigla, '2026-2', v.color
from (values
  ('Análisis Económico',          'AE',  '#f97316'),
  ('Fundamentos de Finanzas',     'FIN', '#22c55e'),
  ('Cálculo III',                 'C3',  '#3b82f6'),
  ('Dinámica',                    'DIN', '#ef4444'),
  ('Herramientas y Agentes de IA','IA',  '#8b5cf6'),
  ('Fundamentos de Marketing',    'MKT', '#ec4899')
) as v (nombre, sigla, color)
cross join (select id from auth.users order by created_at limit 1) u
where not exists (
  select 1 from public.ramos r
  where r.user_id = u.id and lower(r.nombre) = lower(v.nombre)
);

-- Config de notas por defecto para los ramos recién creados
insert into public.notas_config (ramo_id)
select r.id
from public.ramos r
where r.user_id = (select id from auth.users order by created_at limit 1)
  and not exists (select 1 from public.notas_config nc where nc.ramo_id = r.id);

-- 3) Bloques del horario (sala null = por confirmar)
--    Nota: Herramientas y Agentes de IA (martes mód 1-2) va como un
--    solo bloque continuo 08:20-10:50 porque es la misma clase seguida.
insert into public.horario_bloques (ramo_id, tipo, dia_semana, hora_inicio, hora_fin, sala)
select r.id, v.tipo, v.dia, v.ini::time, v.fin::time, v.sala
from (values
  -- LUNES
  ('Análisis Económico',           'Cátedra',     1, '08:20', '09:30', 'AE207'),
  ('Fundamentos de Finanzas',      'Cátedra',     1, '09:40', '10:50', 'AE108'),
  ('Cálculo III',                  'Cátedra',     1, '11:00', '12:10', 'A1'),
  ('Dinámica',                     'Cátedra',     1, '12:20', '13:30', 'K203'),
  ('Dinámica',                     'Ayudantía',   1, '14:50', '16:00', 'R6'),
  ('Fundamentos de Finanzas',      'Taller',      1, '17:30', '18:40', null),
  -- MARTES
  ('Herramientas y Agentes de IA', 'Cátedra',     2, '08:20', '10:50', 'Crisol B'),
  ('Fundamentos de Marketing',     'Cátedra',     2, '11:00', '12:10', null),
  ('Dinámica',                     'Laboratorio', 2, '12:20', '13:30', null),
  ('Cálculo III',                  'Cátedra',     2, '16:10', '17:20', 'A1'),
  -- MIÉRCOLES
  ('Análisis Económico',           'Cátedra',     3, '08:20', '09:30', 'AE207'),
  ('Fundamentos de Finanzas',      'Cátedra',     3, '09:40', '10:50', 'AE108'),
  ('Cálculo III',                  'Cátedra',     3, '11:00', '12:10', 'A1'),
  ('Dinámica',                     'Cátedra',     3, '12:20', '13:30', 'K203'),
  ('Análisis Económico',           'Taller',      3, '17:30', '18:40', null),
  -- JUEVES
  ('Fundamentos de Marketing',     'Cátedra',     4, '11:00', '12:10', null),
  ('Cálculo III',                  'Cátedra',     4, '14:50', '16:00', 'A1'),
  -- VIERNES
  ('Fundamentos de Finanzas',      'Ayudantía',   5, '08:20', '09:30', 'AE002'),
  ('Fundamentos de Marketing',     'Ayudantía',   5, '09:40', '10:50', 'AE201'),
  ('Análisis Económico',           'Ayudantía',   5, '11:00', '12:10', 'AE204'),
  ('Dinámica',                     'Taller',      5, '12:20', '13:30', 'B23')
) as v (nombre, tipo, dia, ini, fin, sala)
join public.ramos r
  on lower(r.nombre) = lower(v.nombre)
 and r.user_id = (select id from auth.users order by created_at limit 1);

-- 4) Verificación: deberías ver 6 ramos y 21 bloques
select
  (select count(*) from public.ramos
   where user_id = (select id from auth.users order by created_at limit 1)) as ramos,
  (select count(*) from public.horario_bloques) as bloques;
