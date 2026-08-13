import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  diasHasta,
  fechaISO,
  formatearHora,
  hoyInicioDia,
  hoyISO,
  diaSemanaApp,
} from '../lib/fechas'
import { ICONOS, ICONOS_BLOQUE, TIPOS_VOLLEY } from '../lib/constantes'
import {
  materializarTareasHoy,
  agruparPorDia,
  calcularRacha,
  faltaSchemaV3,
  EVENTO_TAREAS,
} from '../lib/tareas'

function etiquetaDia(fecha, indice) {
  if (indice === 0) return 'Hoy'
  if (indice === 1) return 'Mañana'
  return fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })
}

// Tile de estadística del hero
function Stat({ etiqueta, children }) {
  return (
    <div className="panel p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {etiqueta}
      </p>
      {children}
    </div>
  )
}

export default function Inicio() {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [proximaEval, setProximaEval] = useState(null)
  const [bloques, setBloques] = useState([])
  const [volley, setVolley] = useState([])
  const [tareas, setTareas] = useState([])
  const [sinSchemaTareas, setSinSchemaTareas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = async () => {
    const hoy = hoyInicioDia()
    const fin = new Date(hoy)
    fin.setDate(fin.getDate() + 6)
    const inicioRacha = new Date(hoy)
    inicioRacha.setDate(inicioRacha.getDate() - 120)

    // Tareas: materializar recurrentes de hoy; si falta schema_v3, se degrada
    const { error: errMat } = await materializarTareasHoy()
    const schemaListo = !(errMat && faltaSchemaV3(errMat.message))
    if (errMat && schemaListo) setError(errMat.message)
    setSinSchemaTareas(!schemaListo)

    const [resEvals, resProx, resBloques, resVolley, resTareas] = await Promise.all([
      supabase
        .from('evaluaciones')
        .select('*, ramos (nombre, sigla, color)')
        .gte('fecha', fechaISO(hoy))
        .lte('fecha', fechaISO(fin))
        .order('fecha'),
      supabase
        .from('evaluaciones')
        .select('*, ramos (sigla)')
        .is('nota', null)
        .gte('fecha', fechaISO(hoy))
        .order('fecha')
        .limit(1),
      supabase
        .from('horario_bloques')
        .select('*, ramos (nombre, sigla, color)')
        .order('hora_inicio'),
      supabase
        .from('volley_eventos')
        .select('*')
        .gte('fecha', fechaISO(hoy))
        .lte('fecha', fechaISO(fin))
        .order('fecha'),
      schemaListo
        ? supabase
            .from('checklist_diario')
            .select('*')
            .gte('fecha', fechaISO(inicioRacha))
            .order('created_at')
        : Promise.resolve({ data: [], error: null }),
    ])

    const err =
      resEvals.error ?? resProx.error ?? resBloques.error ?? resVolley.error ?? resTareas.error
    if (err) {
      setError(err.message)
    } else {
      setEvaluaciones(resEvals.data)
      setProximaEval(resProx.data[0] ?? null)
      setBloques(resBloques.data)
      setVolley(resVolley.data)
      setTareas(resTareas.data)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    window.addEventListener(EVENTO_TAREAS, cargar)
    return () => window.removeEventListener(EVENTO_TAREAS, cargar)
  }, [])

  // Update optimista: el check y las stats reaccionan al instante;
  // si Supabase falla se revierte recargando todo.
  const alternarTarea = async (tarea) => {
    setTareas((ts) =>
      ts.map((t) => (t.id === tarea.id ? { ...t, completado: !t.completado } : t)),
    )
    const { error } = await supabase
      .from('checklist_diario')
      .update({ completado: !tarea.completado })
      .eq('id', tarea.id)
    if (error) {
      setError(error.message)
      cargar()
    }
  }

  if (cargando) return <p className="text-zinc-400">Preparando tu día…</p>

  const hoy = hoyInicioDia()
  const hoyStr = hoyISO()

  // Próximos 7 días: evaluaciones + horario + vóley en orden cronológico
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() + i)
    const iso = fechaISO(fecha)
    return {
      fecha,
      indice: i,
      evaluaciones: evaluaciones.filter((e) => e.fecha === iso),
      bloques: bloques.filter((b) => b.dia_semana === diaSemanaApp(fecha)),
      volley: volley.filter((v) => v.fecha === iso),
    }
  })

  // Tareas
  const tareasHoy = tareas.filter((t) => t.fecha === hoyStr)
  const pendientesHoy = tareasHoy.filter((t) => !t.completado)
  const completadasHoy = tareasHoy.length - pendientesHoy.length
  const porDia = agruparPorDia(tareas)
  const racha = calcularRacha(porDia)

  // Progreso semanal: tareas completadas en los últimos 7 días
  let totalSemana = 0
  let completadasSemana = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    const dia = porDia.get(fechaISO(d))
    if (dia) {
      totalSemana += dia.total
      completadasSemana += dia.completadas
    }
  }
  const pctSemana = totalSemana > 0 ? Math.round((completadasSemana / totalSemana) * 100) : null

  const diasProxEval = proximaEval ? diasHasta(proximaEval.fecha) : null

  return (
    <div>
      <h1 className="mb-1 text-3xl font-bold">
        Hola{' '}
        <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
          👋
        </span>
      </h1>
      <p className="mb-6 text-sm capitalize text-zinc-400">
        {hoy.toLocaleDateString('es-CL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {sinSchemaTareas && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          ⚠ Corre <code className="rounded bg-white/10 px-1">supabase/schema_v3.sql</code> en
          Supabase para activar tareas recurrentes, racha y progreso.
        </p>
      )}

      {/* Hero: stats de un vistazo */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat etiqueta={`${ICONOS.tarea} Tareas de hoy`}>
          <p className="text-2xl font-bold">
            <span className={pendientesHoy.length === 0 && tareasHoy.length > 0 ? 'text-emerald-400' : ''}>
              {completadasHoy}
            </span>
            <span className="text-base font-normal text-zinc-500"> / {tareasHoy.length}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{
                width: tareasHoy.length > 0 ? `${(completadasHoy / tareasHoy.length) * 100}%` : '0%',
              }}
            />
          </div>
        </Stat>
        <Stat etiqueta="🔥 Racha">
          <p className="text-2xl font-bold text-amber-300">
            {racha}
            <span className="text-base font-normal text-zinc-500">
              {' '}
              {racha === 1 ? 'día' : 'días'}
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">con al menos 1 tarea completada</p>
        </Stat>
        <Stat etiqueta={`${ICONOS.evaluacion} Próxima evaluación`}>
          {proximaEval ? (
            <>
              <p className="truncate text-lg font-bold leading-tight">
                {proximaEval.nombre}{' '}
                <span className="font-normal text-zinc-500">({proximaEval.ramos?.sigla})</span>
              </p>
              <p
                className={`mt-1 text-xs font-medium ${
                  diasProxEval !== null && diasProxEval <= 2 ? 'text-red-300' : 'text-zinc-400'
                }`}
              >
                {diasProxEval === 0
                  ? '¡Es hoy!'
                  : diasProxEval === 1
                    ? 'Mañana'
                    : `En ${diasProxEval} días`}{' '}
                · {proximaEval.peso_pct}%
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Sin evaluaciones pendientes con fecha. 🎉</p>
          )}
        </Stat>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Próximos 7 días */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Próximos 7 días</h2>
          <div className="space-y-3">
            {dias.map((dia) => {
              const sinContenido =
                dia.evaluaciones.length === 0 && dia.bloques.length === 0 && dia.volley.length === 0
              if (sinContenido && dia.indice > 1) return null

              return (
                <section key={dia.indice} className="panel p-4">
                  <h3 className="mb-3 font-semibold capitalize">
                    {etiquetaDia(dia.fecha, dia.indice)}
                    {dia.indice <= 1 && (
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        {dia.fecha.toLocaleDateString('es-CL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </h3>

                  {sinContenido ? (
                    <p className="text-sm text-zinc-500">Nada agendado. 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {dia.evaluaciones.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2"
                        >
                          <span className="text-lg">{ICONOS.evaluacion}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-red-200">
                              {e.nombre}{' '}
                              <span className="font-normal">({e.ramos?.sigla})</span>
                            </p>
                            <p className="text-xs text-red-300">
                              {e.tipo} · {e.peso_pct}%
                            </p>
                          </div>
                        </div>
                      ))}
                      {dia.bloques.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
                        >
                          <span className="text-base">
                            {ICONOS_BLOQUE[b.tipo] ?? ICONOS_BLOQUE.Otro}
                          </span>
                          <div
                            className="h-8 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: b.ramos?.color ?? '#8b5cf6' }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{b.ramos?.nombre}</p>
                            <p className="text-xs text-zinc-400">
                              {b.tipo}
                              {b.sala ? ` · ${b.sala}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm text-zinc-400">
                            {formatearHora(b.hora_inicio)}–{formatearHora(b.hora_fin)}
                          </span>
                        </div>
                      ))}
                      {dia.volley.map((v) => {
                        const tipo = TIPOS_VOLLEY.find((t) => t.valor === v.tipo)
                        return (
                          <div
                            key={v.id}
                            className="flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2"
                          >
                            <span className="text-lg">{ICONOS.voley}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium capitalize text-cyan-100">
                                {tipo?.nombre ?? v.tipo}
                              </p>
                              {v.notas && <p className="truncate text-xs text-cyan-300">{v.notas}</p>}
                            </div>
                            <Link
                              to="/voley"
                              className="shrink-0 text-xs text-cyan-300 hover:underline"
                            >
                              ver →
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </section>

        {/* Columna derecha: pendientes de hoy + progreso semanal */}
        <div className="space-y-6">
          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pendientes hoy</h2>
              <Link to="/tareas" className="text-xs font-medium text-violet-400 hover:underline">
                ver todas →
              </Link>
            </div>
            {sinSchemaTareas ? (
              <p className="text-sm text-zinc-500">Activa las tareas corriendo schema_v3.sql.</p>
            ) : tareasHoy.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Sin tareas para hoy. Agrégalas en Tareas o con el botón +.
              </p>
            ) : (
              <>
                {/* Las completadas se quedan tachadas, no desaparecen */}
                <ul className="space-y-1">
                  {tareasHoy.map((tarea) => (
                    <li
                      key={tarea.id}
                      className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors duration-300 hover:bg-white/[0.04] ${
                        tarea.completado ? 'bg-emerald-500/[0.05]' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tarea.completado}
                        onChange={() => alternarTarea(tarea)}
                        className="check-tarea h-4 w-4 shrink-0"
                      />
                      <span
                        className={`min-w-0 flex-1 text-sm transition-colors duration-300 ${
                          tarea.completado ? 'text-zinc-500 line-through' : ''
                        }`}
                      >
                        {tarea.texto}
                      </span>
                      {tarea.recurrente_id && (
                        <span className="shrink-0 text-xs text-violet-400" title="Tarea diaria">
                          🔁
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {pendientesHoy.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-emerald-400">
                    ✓ Todo completado. Día redondo.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="panel p-4">
            <h2 className="mb-3 text-lg font-semibold">Semana</h2>
            {pctSemana === null ? (
              <p className="text-sm text-zinc-500">
                Cuando completes tareas esta semana, aquí verás tu progreso.
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-violet-300">{pctSemana}%</span>
                  <span className="text-xs text-zinc-500">
                    {completadasSemana}/{totalSemana} tareas · últimos 7 días
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                    style={{ width: `${pctSemana}%` }}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
