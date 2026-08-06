import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TIPOS_EVALUACION } from '../lib/constantes'
import Modal from './Modal.jsx'

const FORM_VACIO = {
  ramo_id: '',
  nombre: '',
  tipo: TIPOS_EVALUACION[0],
  fecha: '',
  peso_pct: '',
  nota: '',
}

// Modal de crear/editar evaluación, compartido entre la página de
// Evaluaciones y el detalle de un ramo (donde el ramo viene fijo).
export default function EvaluacionModal({
  abierto,
  onCerrar,
  onGuardado,
  ramos,
  evaluacion = null,
  ramoFijo = null,
}) {
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    if (evaluacion) {
      setForm({
        ramo_id: evaluacion.ramo_id,
        nombre: evaluacion.nombre,
        tipo: evaluacion.tipo,
        fecha: evaluacion.fecha ?? '',
        peso_pct: String(evaluacion.peso_pct),
        nota: evaluacion.nota === null ? '' : String(evaluacion.nota),
      })
    } else {
      setForm({ ...FORM_VACIO, ramo_id: ramoFijo ?? '' })
    }
  }, [abierto, evaluacion, ramoFijo])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const datos = {
      ramo_id: form.ramo_id,
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      fecha: form.fecha || null,
      peso_pct: Number(form.peso_pct),
      nota: form.nota === '' ? null : Number(form.nota),
    }

    let err
    if (evaluacion) {
      ;({ error: err } = await supabase
        .from('evaluaciones')
        .update(datos)
        .eq('id', evaluacion.id))
    } else {
      ;({ error: err } = await supabase.from('evaluaciones').insert(datos))
    }

    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    onCerrar()
    onGuardado()
  }

  return (
    <Modal
      abierto={abierto}
      titulo={evaluacion ? 'Editar evaluación' : 'Nueva evaluación'}
      onCerrar={onCerrar}
    >
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Ramo</label>
          <select
            required
            disabled={Boolean(ramoFijo)}
            value={form.ramo_id}
            onChange={(e) => setForm({ ...form, ramo_id: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
          >
            <option value="" disabled>
              Selecciona un ramo
            </option>
            {ramos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Interrogación 1"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            >
              {TIPOS_EVALUACION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Peso (%)</label>
            <input
              type="number"
              required
              min="0.1"
              max="100"
              step="0.1"
              value={form.peso_pct}
              onChange={(e) => setForm({ ...form, peso_pct: e.target.value })}
              placeholder="Ej: 25"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nota <span className="font-normal text-slate-400">(si ya la rendiste)</span>
            </label>
            <input
              type="number"
              min="1"
              max="7"
              step="0.1"
              value={form.nota}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
              placeholder="1.0 - 7.0"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </Modal>
  )
}
