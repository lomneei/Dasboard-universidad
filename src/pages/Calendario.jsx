import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { diasHasta, formatearFecha, hoyISO, fechaISO } from '../lib/fechas'
import { formatearNota } from '../lib/notas'
import { DIAS_SEMANA } from '../lib/constantes'
import EvaluacionModal from '../components/EvaluacionModal.jsx'

// Etiqueta de urgencia para evaluaciones pendientes
function BadgeUrgencia({ fecha, nota }) {
  if (nota !== null) return null
  const dias = diasHasta(fecha)
  if (dias === null || dias < 0 || dias >= 7) return null

  const texto = dias === 0 ? '¡Hoy!' : dias === 1 ? 'Mañana' : `En ${dias} días`
  const estilo =
    dias <= 2 ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estilo}`}>
      {texto}
    </span>
  )
}

// Calendario mensual: marca los días que tienen evaluaciones
function VistaMensual({ evaluaciones }) {
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const porFecha = useMemo(() => {
    const mapa = new Map()
    for (const ev of evaluaciones) {
      if (!ev.fecha) continue
      const lista = mapa.get(ev.fecha) ?? []
      lista.push(ev)
      mapa.set(ev.fecha, lista)
    }
    return mapa
  }, [evaluaciones])

  const hoy = hoyISO()
  const offset = (mes.getDay() + 6) % 7 // lunes = 0
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++)
    celdas.push(new Date(mes.getFullYear(), mes.getMonth(), d))

  const cambiarMes = (delta) =>
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1))

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => cambiarMes(-1)}
          className="btn-fantasma px-2.5 py-1 text-sm"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <h2 className="font-semibold capitalize">
          {mes.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => cambiarMes(1)}
          className="btn-fantasma px-2.5 py-1 text-sm"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {[...DIAS_SEMANA.map((d) => d.corto), 'Sáb', 'Dom'].map((nombre) => (
          <div
            key={nombre}
            className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
          >
            {nombre}
          </div>
        ))}
        {celdas.map((fecha, i) => {
          if (!fecha) return <div key={`v${i}`} />
          const iso = fechaISO(fecha)
          const evs = porFecha.get(iso) ?? []
          const esHoy = iso === hoy
          return (
            <div
              key={iso}
              title={
                evs.length > 0
                  ? evs.map((e) => `${e.nombre} (${e.ramos?.sigla})`).join('\n')
                  : undefined
              }
              className={`flex min-h-11 flex-col items-center rounded-lg py-1 text-sm transition-colors ${
                esHoy
                  ? 'bg-violet-600/25 font-bold text-violet-200 ring-1 ring-violet-500/50'
                  : evs.length > 0
                    ? 'bg-white/[0.06] hover:bg-white/10'
                    : 'text-zinc-400'
              }`}
            >
              {fecha.getDate()}
              {evs.length > 0 && (
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: e.ramos?.color ?? '#8b5cf6' }}
                    />
                  ))}
                  {evs.length > 3 && (
                    <span className="text-[8px] leading-none text-zinc-400">
                      +{evs.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Calendario() {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [ramos, setRamos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)

  const cargar = async () => {
    const [resEvals, resRamos] = await Promise.all([
      supabase
        .from('evaluaciones')
        .select('*, ramos (nombre, sigla, color)')
        .order('fecha', { ascending: true, nullsFirst: false }),
      supabase.from('ramos').select('*').order('created_at'),
    ])
    if (resEvals.error || resRamos.error) {
      setError((resEvals.error ?? resRamos.error).message)
    } else {
      setEvaluaciones(resEvals.data)
      setRamos(resRamos.data)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const eliminar = async (ev) => {
    if (!window.confirm(`¿Eliminar "${ev.nombre}"?`)) return
    const { error } = await supabase.from('evaluaciones').delete().eq('id', ev.id)
    if (error) setError(error.message)
    else cargar()
  }

  const listas = useMemo(
    () => ({
      pendientes: evaluaciones.filter((e) => e.nota === null),
      rendidas: evaluaciones.filter((e) => e.nota !== null),
    }),
    [evaluaciones],
  )

  if (cargando) return <p className="text-zinc-400">Cargando calendario…</p>

  const Fila = ({ ev }) => (
    <div className="panel flex items-center gap-3 p-4">
      <div
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: ev.ramos?.color ?? '#8b5cf6' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">📝 {ev.nombre}</p>
          <BadgeUrgencia fecha={ev.fecha} nota={ev.nota} />
        </div>
        <p className="truncate text-sm text-zinc-400">
          {ev.ramos?.sigla} · {ev.tipo} · {ev.peso_pct}%
          {ev.fecha ? ` · ${formatearFecha(ev.fecha)}` : ' · sin fecha'}
        </p>
      </div>
      {ev.nota !== null && (
        <span
          className={`rounded-lg px-2.5 py-1 text-sm font-bold ${
            Number(ev.nota) >= 4
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-red-500/15 text-red-300'
          }`}
        >
          {formatearNota(ev.nota)}
        </span>
      )}
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => {
            setEditando(ev)
            setModalAbierto(true)
          }}
          className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
          title="Editar"
        >
          ✎
        </button>
        <button
          onClick={() => eliminar(ev)}
          className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Eliminar"
        >
          🗑
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <button
          onClick={() => {
            setEditando(null)
            setModalAbierto(true)
          }}
          className="btn-primario px-4 py-2 text-sm"
        >
          + Nueva evaluación
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <VistaMensual evaluaciones={evaluaciones} />

        {/* Placeholder para la futura integración con Google Calendar */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-6 text-center">
          <span className="mb-2 text-3xl">📆</span>
          <p className="font-semibold text-zinc-300">
            Google Calendar{' '}
            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-300">
              próximamente
            </span>
          </p>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Aquí se sincronizarán tus eventos de Google Calendar junto a tus
            evaluaciones.
          </p>
        </div>
      </div>

      {listas.pendientes.length === 0 && listas.rendidas.length === 0 ? (
        <p className="panel p-8 text-center text-zinc-400">
          No hay evaluaciones. Crea la primera con “+ Nueva evaluación”.
        </p>
      ) : (
        <div className="space-y-6">
          {listas.pendientes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Próximas
              </h2>
              <div className="space-y-2">
                {listas.pendientes.map((ev) => (
                  <Fila key={ev.id} ev={ev} />
                ))}
              </div>
            </section>
          )}
          {listas.rendidas.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Rendidas
              </h2>
              <div className="space-y-2">
                {listas.rendidas.map((ev) => (
                  <Fila key={ev.id} ev={ev} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <EvaluacionModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onGuardado={cargar}
        ramos={ramos}
        evaluacion={editando}
      />
    </div>
  )
}
