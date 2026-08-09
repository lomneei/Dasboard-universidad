import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { diasHasta, formatearFecha } from '../lib/fechas'
import { formatearNota } from '../lib/notas'
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

export default function Evaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [ramos, setRamos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtroRamo, setFiltroRamo] = useState('')
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

  // Pendientes primero (ordenadas por fecha próxima), rendidas después
  const listas = useMemo(() => {
    const filtradas = filtroRamo
      ? evaluaciones.filter((e) => e.ramo_id === filtroRamo)
      : evaluaciones
    return {
      pendientes: filtradas.filter((e) => e.nota === null),
      rendidas: filtradas.filter((e) => e.nota !== null),
    }
  }, [evaluaciones, filtroRamo])

  if (cargando) return <p className="text-zinc-400">Cargando evaluaciones…</p>

  const Fila = ({ ev }) => (
    <div className="flex items-center gap-3 panel p-4">
      <div
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: ev.ramos?.color ?? '#94a3b8' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{ev.nombre}</p>
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
          className="rounded p-1.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
          title="Editar"
        >
          ✎
        </button>
        <button
          onClick={() => eliminar(ev)}
          className="rounded p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
          title="Eliminar"
        >
          🗑
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Evaluaciones</h1>
        <div className="flex items-center gap-2">
          <select
            value={filtroRamo}
            onChange={(e) => setFiltroRamo(e.target.value)}
            className="campo text-sm"
          >
            <option value="">Todos los ramos</option>
            {ramos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditando(null)
              setModalAbierto(true)
            }}
            className="btn-primario px-4 py-2 text-sm"
          >
            + Nueva
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {listas.pendientes.length === 0 && listas.rendidas.length === 0 ? (
        <p className="panel p-8 text-center text-zinc-400">
          No hay evaluaciones{filtroRamo ? ' para este ramo' : ''}. Crea una con “+ Nueva”.
        </p>
      ) : (
        <div className="space-y-6">
          {listas.pendientes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Pendientes
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
