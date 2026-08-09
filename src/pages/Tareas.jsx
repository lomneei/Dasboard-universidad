import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO, fechaISO, hoyInicioDia } from '../lib/fechas'
import {
  materializarTareasHoy,
  agruparPorDia,
  calcularRacha,
  faltaSchemaV3,
  EVENTO_TAREAS,
} from '../lib/tareas'

const SEMANAS_GRID = 16

// Lunes de la semana de `fecha`
function lunesDe(fecha) {
  const d = new Date(fecha)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return d
}

function colorCelda(dia) {
  if (!dia || dia.total === 0) return 'bg-white/[0.05]'
  const pct = dia.completadas / dia.total
  if (pct === 0) return 'bg-white/[0.09]'
  if (pct < 0.34) return 'bg-violet-900'
  if (pct < 0.67) return 'bg-violet-600/70'
  if (pct < 1) return 'bg-violet-500'
  return 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.55)]'
}

// Grid tipo "contribution graph": una columna por semana, lunes arriba
function GridConsistencia({ porDia }) {
  const hoy = hoyInicioDia()
  const inicio = lunesDe(hoy)
  inicio.setDate(inicio.getDate() - (SEMANAS_GRID - 1) * 7)

  const semanas = Array.from({ length: SEMANAS_GRID }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => {
      const fecha = new Date(inicio)
      fecha.setDate(fecha.getDate() + s * 7 + d)
      return fecha
    }),
  )

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        <div className="mr-1 flex flex-col gap-[3px] text-[9px] leading-none text-zinc-500">
          {['lun', '', 'mié', '', 'vie', '', 'dom'].map((etiqueta, i) => (
            <span key={i} className="flex h-[13px] items-center">
              {etiqueta}
            </span>
          ))}
        </div>
        {semanas.map((semana, s) => (
          <div key={s} className="flex flex-col gap-[3px]">
            {semana.map((fecha) => {
              const futuro = fecha > hoy
              const iso = fechaISO(fecha)
              const dia = porDia.get(iso)
              const titulo = dia
                ? `${fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}: ${dia.completadas}/${dia.total} tareas`
                : fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
              return (
                <div
                  key={iso}
                  title={futuro ? undefined : titulo}
                  className={`h-[13px] w-[13px] rounded-[3px] transition-colors ${
                    futuro ? 'bg-transparent' : colorCelda(dia)
                  } ${iso === hoyISO() ? 'ring-1 ring-violet-300/60' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span>menos</span>
        <div className="h-[10px] w-[10px] rounded-[3px] bg-white/[0.05]" />
        <div className="h-[10px] w-[10px] rounded-[3px] bg-violet-900" />
        <div className="h-[10px] w-[10px] rounded-[3px] bg-violet-600/70" />
        <div className="h-[10px] w-[10px] rounded-[3px] bg-violet-500" />
        <div className="h-[10px] w-[10px] rounded-[3px] bg-violet-400" />
        <span>más</span>
      </div>
    </div>
  )
}

export default function Tareas() {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [texto, setTexto] = useState('')
  const [esRecurrente, setEsRecurrente] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { error: errMat } = await materializarTareasHoy()
    if (errMat) {
      setError(errMat.message)
      setCargando(false)
      return
    }
    const inicio = lunesDe(hoyInicioDia())
    inicio.setDate(inicio.getDate() - (SEMANAS_GRID - 1) * 7)
    const { data, error } = await supabase
      .from('checklist_diario')
      .select('*')
      .gte('fecha', fechaISO(inicio))
      .order('created_at')
    if (error) setError(error.message)
    else {
      setFilas(data)
      setError(null)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    window.addEventListener(EVENTO_TAREAS, cargar)
    return () => window.removeEventListener(EVENTO_TAREAS, cargar)
  }, [])

  const agregar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setGuardando(true)
    let err
    if (esRecurrente) {
      // Se crea la definición; la instancia de hoy la crea materializar
      const { error } = await supabase
        .from('tareas_recurrentes')
        .insert({ texto: texto.trim() })
      err = error
    } else {
      const { error } = await supabase
        .from('checklist_diario')
        .insert({ fecha: hoyISO(), texto: texto.trim() })
      err = error
    }
    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    setTexto('')
    setEsRecurrente(false)
    cargar()
  }

  const alternar = async (tarea) => {
    const { error } = await supabase
      .from('checklist_diario')
      .update({ completado: !tarea.completado })
      .eq('id', tarea.id)
    if (error) setError(error.message)
    else cargar()
  }

  const eliminar = async (tarea) => {
    if (tarea.recurrente_id) {
      if (
        !window.confirm(
          `"${tarea.texto}" es una tarea recurrente. ¿Desactivarla y quitarla de hoy? (el historial se conserva)`,
        )
      )
        return
      const [resDesactivar, resBorrar] = await Promise.all([
        supabase
          .from('tareas_recurrentes')
          .update({ activa: false })
          .eq('id', tarea.recurrente_id),
        supabase.from('checklist_diario').delete().eq('id', tarea.id),
      ])
      const err = resDesactivar.error ?? resBorrar.error
      if (err) setError(err.message)
      else cargar()
    } else {
      if (!window.confirm(`¿Eliminar "${tarea.texto}"?`)) return
      const { error } = await supabase
        .from('checklist_diario')
        .delete()
        .eq('id', tarea.id)
      if (error) setError(error.message)
      else cargar()
    }
  }

  if (cargando) return <p className="text-zinc-400">Cargando tareas…</p>

  if (error && faltaSchemaV3(error)) {
    return (
      <div className="panel p-8 text-center">
        <p className="mb-2 text-lg font-semibold text-amber-300">
          Falta un paso en Supabase
        </p>
        <p className="text-sm text-zinc-400">
          Corre <code className="rounded bg-white/10 px-1.5 py-0.5">supabase/schema_v3.sql</code>{' '}
          en el SQL Editor de Supabase para activar las tareas recurrentes, y recarga.
        </p>
      </div>
    )
  }

  const porDia = agruparPorDia(filas)
  const racha = calcularRacha(porDia)
  const hoy = hoyISO()
  const deHoy = filas.filter((f) => f.fecha === hoy)
  const completadasHoy = deHoy.filter((f) => f.completado).length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tareas</h1>
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2">
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-lg font-bold leading-none text-amber-300">{racha}</p>
            <p className="text-[10px] uppercase tracking-wide text-amber-300/70">
              {racha === 1 ? 'día de racha' : 'días de racha'}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Grid de consistencia */}
      <div className="panel mb-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Consistencia · últimas {SEMANAS_GRID} semanas
          </h2>
          <span className="text-xs text-zinc-500">
            hoy: {completadasHoy}/{deHoy.length}
          </span>
        </div>
        <GridConsistencia porDia={porDia} />
      </div>

      {/* Agregar tarea */}
      <form onSubmit={agregar} className="panel mb-6 space-y-3 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nueva tarea… (ej: meditar, elongar, avanzar tesis)"
            className="campo min-w-0 flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={guardando || !texto.trim()}
            className="btn-primario shrink-0 px-4 py-2 text-sm"
          >
            Agregar
          </button>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <button
            type="button"
            role="switch"
            aria-checked={esRecurrente}
            onClick={() => setEsRecurrente(!esRecurrente)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              esRecurrente ? 'bg-violet-500' : 'bg-white/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                esRecurrente ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
          ¿Se repite todos los días?
          <span className="text-xs text-zinc-500">
            {esRecurrente ? 'Sí — aparecerá cada día hasta que la desactives' : 'No — solo hoy'}
          </span>
        </label>
      </form>

      {/* Tareas de hoy */}
      <h2 className="mb-3 text-lg font-semibold">Hoy</h2>
      {deHoy.length === 0 ? (
        <p className="panel p-6 text-center text-zinc-400">
          Sin tareas para hoy. Agrega la primera arriba.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {deHoy.map((tarea) => (
            <li key={tarea.id} className="panel flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={tarea.completado}
                onChange={() => alternar(tarea)}
                className="h-4.5 w-4.5 shrink-0 accent-violet-500"
              />
              <span
                className={`min-w-0 flex-1 text-sm ${
                  tarea.completado ? 'text-zinc-500 line-through' : ''
                }`}
              >
                {tarea.texto}
              </span>
              {tarea.recurrente_id && (
                <span
                  className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300"
                  title="Se repite todos los días"
                >
                  🔁 diaria
                </span>
              )}
              <button
                onClick={() => eliminar(tarea)}
                className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title={tarea.recurrente_id ? 'Desactivar recurrente' : 'Eliminar'}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
