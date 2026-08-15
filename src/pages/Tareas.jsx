import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  hoyISO,
  fechaISO,
  hoyInicioDia,
  parseFechaLocal,
  formatearFechaLarga,
} from '../lib/fechas'
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

// Heatmap unificado: una fila por tarea recurrente activa, una columna
// por día (últimas 4 semanas). De un vistazo se ve qué tareas se
// cumplen consistentemente y cuáles no.
const DIAS_HEATMAP = 28

function GridPorTarea({ recurrentes, filas, onMarcar }) {
  if (recurrentes.length === 0)
    return (
      <p className="py-4 text-center text-sm text-zinc-500">
        No tienes tareas diarias activas. Crea una con el switch “¿Se repite todos los días?”.
      </p>
    )

  const hoy = hoyInicioDia()
  const dias = Array.from({ length: DIAS_HEATMAP }, (_, i) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - (DIAS_HEATMAP - 1 - i))
    return d
  })

  // (recurrente, fecha) -> instancia del checklist (para poder togglearla)
  const instancias = new Map()
  for (const f of filas) {
    if (f.recurrente_id) instancias.set(`${f.recurrente_id}|${f.fecha}`, f)
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        {/* Encabezado: número de día, lunes destacado */}
        <div className="mb-1 flex items-center gap-[3px]">
          <span className="w-28 shrink-0" />
          {dias.map((d) => {
            const iso = fechaISO(d)
            return (
              <span
                key={iso}
                className={`w-[18px] shrink-0 text-center text-[9px] leading-none ${
                  iso === hoyISO()
                    ? 'font-bold text-violet-300'
                    : d.getDay() === 1
                      ? 'text-zinc-400'
                      : 'text-zinc-600'
                }`}
              >
                {d.getDate()}
              </span>
            )
          })}
          <span className="ml-1 w-9 shrink-0" />
        </div>

        {recurrentes.map((rec) => {
          const celdas = dias.map((d) => {
            const inst = instancias.get(`${rec.id}|${fechaISO(d)}`)
            return { iso: fechaISO(d), inst, completado: inst?.completado }
          })
          const conInstancia = celdas.filter((c) => c.completado !== undefined)
          const hechas = conInstancia.filter((c) => c.completado).length
          const pct =
            conInstancia.length > 0 ? Math.round((hechas / conInstancia.length) * 100) : null

          return (
            <div key={rec.id} className="flex items-center gap-[3px] py-[2px]">
              <span
                className="w-28 shrink-0 truncate text-xs text-zinc-300"
                title={rec.texto}
              >
                {rec.texto}
              </span>
              {celdas.map((c) => (
                <button
                  key={c.iso}
                  onClick={() => onMarcar(rec, c.iso, c.inst)}
                  title={`${rec.texto} · ${c.iso}${
                    c.completado === true
                      ? ': hecha ✓'
                      : c.completado === false
                        ? ': no hecha'
                        : ''
                  } — click para cambiar`}
                  className={`h-[18px] w-[18px] shrink-0 rounded-[4px] transition-all hover:ring-1 hover:ring-violet-400/60 active:scale-90 ${
                    c.completado === true
                      ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]'
                      : c.completado === false
                        ? 'bg-white/[0.09]'
                        : 'bg-white/[0.03]'
                  } ${c.iso === hoyISO() ? 'ring-1 ring-violet-400/60' : ''}`}
                />
              ))}
              <span className="ml-1 w-9 shrink-0 text-right text-[10px] text-zinc-500">
                {pct !== null ? `${pct}%` : '—'}
              </span>
            </div>
          )
        })}

        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="h-[10px] w-[10px] rounded-[3px] bg-emerald-500" /> hecha
          <span className="ml-2 h-[10px] w-[10px] rounded-[3px] bg-white/[0.09]" /> no hecha
          <span className="ml-2 h-[10px] w-[10px] rounded-[3px] bg-white/[0.03]" /> sin registro
          <span className="ml-3 text-zinc-600">
            click en una celda para marcar/desmarcar ese día
          </span>
        </div>
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
  const [recurrentes, setRecurrentes] = useState([])
  // pestaña del panel de consistencia: 'general' | 'tareas'
  const [vistaGrid, setVistaGrid] = useState('general')
  // día que se está viendo/editando en la lista (permite corregir días
  // pasados si se te olvidó marcar; nunca es futuro)
  const [fechaVista, setFechaVista] = useState(hoyISO())

  const cargar = async () => {
    const { error: errMat } = await materializarTareasHoy()
    if (errMat) {
      setError(errMat.message)
      setCargando(false)
      return
    }
    const inicio = lunesDe(hoyInicioDia())
    inicio.setDate(inicio.getDate() - (SEMANAS_GRID - 1) * 7)
    const [resFilas, resRec] = await Promise.all([
      supabase
        .from('checklist_diario')
        .select('*')
        .gte('fecha', fechaISO(inicio))
        .order('created_at'),
      supabase
        .from('tareas_recurrentes')
        .select('*')
        .eq('activa', true)
        .order('created_at'),
    ])
    const error = resFilas.error ?? resRec.error
    if (error) setError(error.message)
    else {
      setFilas(resFilas.data)
      setRecurrentes(resRec.data)
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
      // La puntual cae en el día que se está viendo (hoy por defecto)
      const { error } = await supabase
        .from('checklist_diario')
        .insert({ fecha: fechaVista, texto: texto.trim() })
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

  // Update optimista: la fila cambia al instante (animación del check
  // incluida) y si Supabase falla se revierte recargando.
  const alternar = async (tarea) => {
    setFilas((fs) =>
      fs.map((f) => (f.id === tarea.id ? { ...f, completado: !f.completado } : f)),
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

  // Marca una recurrente en una fecha específica (heatmap o día pasado).
  // Si ese día no tiene instancia, la crea ya completada.
  const marcarRecurrente = async (rec, fecha, instancia) => {
    if (instancia) {
      alternar(instancia)
      return
    }
    const { data, error } = await supabase
      .from('checklist_diario')
      .insert({ fecha, texto: rec.texto, recurrente_id: rec.id, completado: true })
      .select()
      .single()
    if (error) setError(error.message)
    else setFilas((fs) => [...fs, data])
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
  const esHoy = fechaVista === hoy
  const deVista = filas.filter((f) => f.fecha === fechaVista)
  // Recurrentes activas sin instancia en el día visto: se listan igual
  // para poder marcarlas retroactivamente (solo en días pasados; hoy las
  // crea la materialización)
  const recurrentesFaltantes = esHoy
    ? []
    : recurrentes.filter((r) => !deVista.some((f) => f.recurrente_id === r.id))

  const cambiarDia = (delta) => {
    const d = parseFechaLocal(fechaVista)
    d.setDate(d.getDate() + delta)
    const iso = fechaISO(d)
    if (iso <= hoy) setFechaVista(iso)
  }

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

      {/* Consistencia: vista general (todas las tareas) o por tarea */}
      <div className="panel mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Consistencia
          </h2>
          <div className="flex rounded-lg bg-white/[0.05] p-0.5">
            {[
              { id: 'general', nombre: 'General' },
              { id: 'tareas', nombre: 'Por tarea' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVistaGrid(tab.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  vistaGrid === tab.id
                    ? 'bg-violet-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.nombre}
              </button>
            ))}
          </div>
        </div>
        {vistaGrid === 'general' ? (
          <GridConsistencia porDia={porDia} />
        ) : (
          <GridPorTarea recurrentes={recurrentes} filas={filas} onMarcar={marcarRecurrente} />
        )}
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
            {esRecurrente
              ? 'Sí — aparecerá cada día hasta que la desactives'
              : `No — solo ${esHoy ? 'hoy' : 'el día seleccionado'}`}
          </span>
        </label>
      </form>

      {/* Tareas del día visto (hoy por defecto; se puede volver atrás
          para marcar lo que se te olvidó) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize">
          {esHoy ? 'Hoy' : formatearFechaLarga(fechaVista)}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => cambiarDia(-1)}
            className="btn-fantasma px-2.5 py-1 text-sm"
            aria-label="Día anterior"
          >
            ←
          </button>
          <input
            type="date"
            value={fechaVista}
            max={hoy}
            onChange={(e) => e.target.value && e.target.value <= hoy && setFechaVista(e.target.value)}
            className="campo px-2 py-1 text-xs"
          />
          <button
            onClick={() => cambiarDia(1)}
            disabled={esHoy}
            className="btn-fantasma px-2.5 py-1 text-sm disabled:opacity-40"
            aria-label="Día siguiente"
          >
            →
          </button>
          {!esHoy && (
            <button
              onClick={() => setFechaVista(hoy)}
              className="btn-primario px-3 py-1 text-xs"
            >
              Hoy
            </button>
          )}
        </div>
      </div>
      {deVista.length === 0 && recurrentesFaltantes.length === 0 ? (
        <p className="panel p-6 text-center text-zinc-400">
          {esHoy ? 'Sin tareas para hoy. Agrega la primera arriba.' : 'Sin tareas ese día.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {deVista.map((tarea) => (
            <li key={tarea.id} className="panel overflow-hidden">
              <div
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-300 ${
                  tarea.completado ? 'bg-emerald-500/[0.05]' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={tarea.completado}
                  onChange={() => alternar(tarea)}
                  className="check-tarea h-4.5 w-4.5 shrink-0"
                />
                <span
                  className={`min-w-0 flex-1 text-sm transition-colors duration-300 ${
                    tarea.completado ? 'text-zinc-500 line-through' : ''
                  }`}
                >
                  {tarea.texto}
                </span>
                {tarea.recurrente_id && (
                  <span
                    className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300"
                    title="Se repite todos los días (su historial está en Consistencia → Por tarea)"
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
              </div>
            </li>
          ))}
          {/* Recurrentes sin registro ese día: marcar crea la instancia */}
          {recurrentesFaltantes.map((rec) => (
            <li key={`rec-${rec.id}`} className="panel overflow-hidden opacity-75">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => marcarRecurrente(rec, fechaVista, null)}
                  className="check-tarea h-4.5 w-4.5 shrink-0"
                />
                <span className="min-w-0 flex-1 text-sm text-zinc-400">{rec.texto}</span>
                <span
                  className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-500"
                  title="Ese día no quedó registro de esta tarea; márcala si la hiciste"
                >
                  🔁 sin registro
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
