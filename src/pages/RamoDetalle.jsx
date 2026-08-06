import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatearFecha } from '../lib/fechas'
import { analizarRamo, interpretarNecesaria, formatearNota } from '../lib/notas'
import EvaluacionModal from '../components/EvaluacionModal.jsx'
import Modal from '../components/Modal.jsx'

// Tarjeta que traduce la "nota necesaria" a un mensaje entendible
function TarjetaNecesaria({ titulo, objetivo, necesaria, pesoPendiente }) {
  const info = interpretarNecesaria(necesaria)

  let contenido
  if (pesoPendiente <= 0) {
    contenido = <p className="text-sm text-slate-500">No quedan evaluaciones pendientes.</p>
  } else if (!info) {
    contenido = <p className="text-sm text-slate-500">—</p>
  } else if (info.estado === 'asegurado') {
    contenido = (
      <p className="text-sm font-medium text-green-700">
        ¡Ya lo tienes asegurado! Incluso con un 1,0 en lo pendiente llegas a {formatearNota(objetivo)}.
      </p>
    )
  } else if (info.estado === 'imposible') {
    contenido = (
      <p className="text-sm font-medium text-red-700">
        Necesitarías un {formatearNota(info.valor, 2)} — sobre 7,0, ya no es alcanzable solo con lo pendiente.
      </p>
    )
  } else {
    contenido = (
      <p className="text-sm">
        Necesitas promediar{' '}
        <span className="text-xl font-bold text-indigo-700">
          {formatearNota(info.valor, 2)}
        </span>{' '}
        en el {pesoPendiente}% pendiente.
      </p>
    )
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo} ({formatearNota(objetivo)})
      </p>
      {contenido}
    </div>
  )
}

export default function RamoDetalle() {
  const { id } = useParams()
  const [ramo, setRamo] = useState(null)
  const [evaluaciones, setEvaluaciones] = useState([])
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalEval, setModalEval] = useState(false)
  const [editandoEval, setEditandoEval] = useState(null)
  const [modalConfig, setModalConfig] = useState(false)
  const [formConfig, setFormConfig] = useState({ nota_aprobacion: '4.0', nota_eximicion: '' })
  const [guardandoConfig, setGuardandoConfig] = useState(false)

  const cargar = async () => {
    const [resRamo, resEvals, resConfig] = await Promise.all([
      supabase.from('ramos').select('*').eq('id', id).single(),
      supabase
        .from('evaluaciones')
        .select('*')
        .eq('ramo_id', id)
        .order('fecha', { ascending: true, nullsFirst: false }),
      supabase.from('notas_config').select('*').eq('ramo_id', id).maybeSingle(),
    ])

    if (resRamo.error) {
      setError(resRamo.error.message)
      setCargando(false)
      return
    }
    setRamo(resRamo.data)
    setEvaluaciones(resEvals.data ?? [])
    setConfig(resConfig.data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const abrirConfig = () => {
    setFormConfig({
      nota_aprobacion: String(config?.nota_aprobacion ?? '4.0'),
      nota_eximicion: config?.nota_eximicion ? String(config.nota_eximicion) : '',
    })
    setModalConfig(true)
  }

  const guardarConfig = async (e) => {
    e.preventDefault()
    setGuardandoConfig(true)
    const datos = {
      ramo_id: id,
      nota_aprobacion: Number(formConfig.nota_aprobacion),
      nota_eximicion:
        formConfig.nota_eximicion === '' ? null : Number(formConfig.nota_eximicion),
    }
    const { error } = await supabase
      .from('notas_config')
      .upsert(datos, { onConflict: 'ramo_id' })
    setGuardandoConfig(false)
    if (error) {
      setError(error.message)
      return
    }
    setModalConfig(false)
    cargar()
  }

  const eliminarEval = async (ev) => {
    if (!window.confirm(`¿Eliminar "${ev.nombre}"?`)) return
    const { error } = await supabase.from('evaluaciones').delete().eq('id', ev.id)
    if (error) setError(error.message)
    else cargar()
  }

  if (cargando) return <p className="text-slate-500">Cargando…</p>
  if (error && !ramo) return <p className="text-red-600">{error}</p>

  const analisis = analizarRamo(evaluaciones, config)

  return (
    <div>
      <Link to="/ramos" className="text-sm text-indigo-600 hover:underline">
        ← Volver a ramos
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-2 rounded-full"
            style={{ backgroundColor: ramo.color }}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {ramo.sigla}
            </p>
            <h1 className="text-2xl font-bold leading-tight">{ramo.nombre}</h1>
          </div>
        </div>
        <button
          onClick={abrirConfig}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
        >
          ⚙ Config de notas
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Resumen / calculadora */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Promedio actual
          </p>
          <p className="text-3xl font-bold">
            <span
              className={
                analisis.promedioActual === null
                  ? 'text-slate-400'
                  : analisis.promedioActual >= analisis.notaAprobacion
                    ? 'text-green-600'
                    : 'text-red-600'
              }
            >
              {formatearNota(analisis.promedioActual)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {analisis.pesoRendido}% del ramo rendido
          </p>
        </div>
        <TarjetaNecesaria
          titulo="Para aprobar"
          objetivo={analisis.notaAprobacion}
          necesaria={analisis.necesariaAprobar}
          pesoPendiente={analisis.pesoPendiente}
        />
        {analisis.notaEximicion !== null ? (
          <TarjetaNecesaria
            titulo="Para eximirte"
            objetivo={analisis.notaEximicion}
            necesaria={analisis.necesariaEximir}
            pesoPendiente={analisis.pesoPendiente}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">
            Sin nota de eximición configurada. Agrégala en “Config de notas” para simularla.
          </div>
        )}
      </div>

      {analisis.pesosIncompletos && analisis.pesoTotal > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          ⚠ Los pesos registrados suman {analisis.pesoTotal}% (no 100%). Los cálculos
          se hacen sobre ese total, pero conviene revisar.
        </p>
      )}

      {analisis.todoRendido && (
        <p
          className={`mb-4 rounded-lg px-4 py-2 text-sm font-medium ${
            analisis.promedioActual >= analisis.notaAprobacion
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {analisis.promedioActual >= analisis.notaAprobacion
            ? `✓ Ramo cerrado: aprobado con ${formatearNota(analisis.promedioActual)}.`
            : `✗ Ramo cerrado con ${formatearNota(analisis.promedioActual)} — bajo la nota de aprobación.`}
        </p>
      )}

      {/* Evaluaciones del ramo */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Evaluaciones</h2>
        <button
          onClick={() => {
            setEditandoEval(null)
            setModalEval(true)
          }}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Agregar
        </button>
      </div>

      {evaluaciones.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-slate-500 shadow-sm">
          Sin evaluaciones aún. Agrega la primera para activar la calculadora.
        </p>
      ) : (
        <div className="space-y-2">
          {evaluaciones.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{ev.nombre}</p>
                <p className="text-sm text-slate-500">
                  {ev.tipo} · {ev.peso_pct}%
                  {ev.fecha ? ` · ${formatearFecha(ev.fecha)}` : ''}
                </p>
              </div>
              <span
                className={`rounded-lg px-2.5 py-1 text-sm font-bold ${
                  ev.nota === null
                    ? 'bg-slate-100 text-slate-400'
                    : Number(ev.nota) >= analisis.notaAprobacion
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {ev.nota === null ? 'Pendiente' : formatearNota(ev.nota)}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    setEditandoEval(ev)
                    setModalEval(true)
                  }}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  onClick={() => eliminarEval(ev)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EvaluacionModal
        abierto={modalEval}
        onCerrar={() => setModalEval(false)}
        onGuardado={cargar}
        ramos={ramo ? [ramo] : []}
        evaluacion={editandoEval}
        ramoFijo={id}
      />

      <Modal
        abierto={modalConfig}
        titulo="Configuración de notas"
        onCerrar={() => setModalConfig(false)}
      >
        <form onSubmit={guardarConfig} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nota de aprobación</label>
            <input
              type="number"
              required
              min="1"
              max="7"
              step="0.1"
              value={formConfig.nota_aprobacion}
              onChange={(e) =>
                setFormConfig({ ...formConfig, nota_aprobacion: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nota de eximición{' '}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="number"
              min="1"
              max="7"
              step="0.1"
              value={formConfig.nota_eximicion}
              onChange={(e) =>
                setFormConfig({ ...formConfig, nota_eximicion: e.target.value })
              }
              placeholder="Ej: 5.5 — deja vacío si no aplica"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoConfig}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {guardandoConfig ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
