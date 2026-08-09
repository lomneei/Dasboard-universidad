import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatearFecha, hoyISO } from '../lib/fechas'
import { TIPOS_VOLLEY } from '../lib/constantes'
import Modal from '../components/Modal.jsx'

const FORM_VACIO = { tipo: 'entrenamiento', fecha: '', notas: '', planificado: true }

function TarjetaEvento({ evento, onMarcar, onEliminar }) {
  const tipo = TIPOS_VOLLEY.find((t) => t.valor === evento.tipo)
  return (
    <div className="flex items-center gap-3 panel p-4">
      <span className="text-2xl">{tipo?.emoji ?? '🏐'}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium capitalize">
          {tipo?.nombre ?? evento.tipo}
          {!evento.planificado && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-zinc-400">
              no planificado
            </span>
          )}
        </p>
        <p className="text-sm text-zinc-400">
          {formatearFecha(evento.fecha)}
          {evento.notas ? ` · ${evento.notas}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => onMarcar(evento, true)}
          className={`rounded-lg px-3 py-1 text-sm font-medium ${
            evento.asistio === true
              ? 'bg-emerald-500 text-white'
              : 'bg-white/10 text-zinc-400 hover:bg-emerald-500/10'
          }`}
        >
          ✓ Fui
        </button>
        <button
          onClick={() => onMarcar(evento, false)}
          className={`rounded-lg px-3 py-1 text-sm font-medium ${
            evento.asistio === false
              ? 'bg-red-600 text-white'
              : 'bg-white/10 text-zinc-400 hover:bg-red-500/10'
          }`}
        >
          ✗ No fui
        </button>
        <button
          onClick={() => onEliminar(evento)}
          className="rounded p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
          title="Eliminar"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export default function Voley() {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { data, error } = await supabase
      .from('volley_eventos')
      .select('*')
      .order('fecha', { ascending: false })
    if (error) setError(error.message)
    else setEventos(data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirModal = () => {
    setForm({ ...FORM_VACIO, fecha: hoyISO() })
    setModal(true)
  }

  const crear = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const { error } = await supabase.from('volley_eventos').insert({
      tipo: form.tipo,
      fecha: form.fecha,
      notas: form.notas.trim() || null,
      planificado: form.planificado,
    })
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setModal(false)
    cargar()
  }

  // Marcar de nuevo el mismo estado lo limpia (vuelve a "sin marcar")
  const marcar = async (evento, asistio) => {
    const nuevo = evento.asistio === asistio ? null : asistio
    const { error } = await supabase
      .from('volley_eventos')
      .update({ asistio: nuevo })
      .eq('id', evento.id)
    if (error) setError(error.message)
    else cargar()
  }

  const eliminar = async (evento) => {
    if (!window.confirm('¿Eliminar este evento?')) return
    const { error } = await supabase
      .from('volley_eventos')
      .delete()
      .eq('id', evento.id)
    if (error) setError(error.message)
    else cargar()
  }

  const hoy = hoyISO()
  const proximos = eventos.filter((e) => e.fecha >= hoy).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const pasados = eventos.filter((e) => e.fecha < hoy)

  // Consistencia: de los eventos planificados ya marcados, ¿a cuántos fui?
  const planificadosMarcados = eventos.filter((e) => e.planificado && e.asistio !== null)
  const cumplidos = planificadosMarcados.filter((e) => e.asistio).length
  const pctConsistencia =
    planificadosMarcados.length > 0
      ? Math.round((cumplidos / planificadosMarcados.length) * 100)
      : null

  if (cargando) return <p className="text-zinc-400">Cargando…</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vóley 🏐</h1>
        <button
          onClick={abrirModal}
          className="btn-primario px-3 py-1.5 text-sm"
        >
          + Agregar evento
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-6 panel p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Consistencia
        </p>
        {pctConsistencia === null ? (
          <p className="text-sm text-zinc-400">
            Cuando marques asistencia en eventos planificados, aquí verás cuántos cumpliste.
          </p>
        ) : (
          <p className="text-sm">
            Fuiste a{' '}
            <span
              className={`text-xl font-bold ${
                pctConsistencia >= 80 ? 'text-emerald-400' : pctConsistencia >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {cumplidos} de {planificadosMarcados.length}
            </span>{' '}
            eventos planificados ({pctConsistencia}%).
          </p>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Próximos</h2>
      {proximos.length === 0 ? (
        <p className="mb-6 panel p-6 text-center text-zinc-400">
          Nada agendado. Agrega tu próximo entrenamiento o partido.
        </p>
      ) : (
        <div className="mb-6 space-y-2">
          {proximos.map((ev) => (
            <TarjetaEvento key={ev.id} evento={ev} onMarcar={marcar} onEliminar={eliminar} />
          ))}
        </div>
      )}

      {pasados.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Pasados</h2>
          <div className="space-y-2">
            {pasados.map((ev) => (
              <TarjetaEvento key={ev.id} evento={ev} onMarcar={marcar} onEliminar={eliminar} />
            ))}
          </div>
        </>
      )}

      <Modal abierto={modal} titulo="Nuevo evento" onCerrar={() => setModal(false)}>
        <form onSubmit={crear} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="campo w-full"
            >
              {TIPOS_VOLLEY.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.emoji} {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha</label>
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="campo w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Notas <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Ej: cancha 2, llevar rodilleras"
              className="campo w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.planificado}
              onChange={(e) => setForm({ ...form, planificado: e.target.checked })}
              className="h-4 w-4 accent-violet-500"
            />
            Planificado con anticipación
          </label>
          <button
            type="submit"
            disabled={guardando}
            className="btn-primario w-full py-2"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
