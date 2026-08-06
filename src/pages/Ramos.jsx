import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { COLORES_RAMO } from '../lib/constantes'
import Modal from '../components/Modal.jsx'

const FORM_VACIO = { nombre: '', sigla: '', semestre: '', color: COLORES_RAMO[5] }

export default function Ramos() {
  const [ramos, setRamos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null) // ramo en edición o null
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const cargarRamos = async () => {
    const { data, error } = await supabase
      .from('ramos')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setRamos(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarRamos()
  }, [])

  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setModalAbierto(true)
  }

  const abrirEditar = (ramo) => {
    setEditando(ramo)
    setForm({
      nombre: ramo.nombre,
      sigla: ramo.sigla,
      semestre: ramo.semestre ?? '',
      color: ramo.color,
    })
    setModalAbierto(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const datos = {
      nombre: form.nombre.trim(),
      sigla: form.sigla.trim().toUpperCase(),
      semestre: form.semestre.trim() || null,
      color: form.color,
    }

    let err
    if (editando) {
      ;({ error: err } = await supabase.from('ramos').update(datos).eq('id', editando.id))
    } else {
      const { data: nuevo, error: errInsert } = await supabase
        .from('ramos')
        .insert(datos)
        .select()
        .single()
      err = errInsert
      // Config de notas por defecto (aprobación 4.0) para el ramo nuevo
      if (!err && nuevo) {
        await supabase.from('notas_config').insert({ ramo_id: nuevo.id })
      }
    }

    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    setModalAbierto(false)
    cargarRamos()
  }

  const eliminar = async (ramo) => {
    const ok = window.confirm(
      `¿Eliminar "${ramo.nombre}"? Se borrarán también sus evaluaciones y bloques de horario.`,
    )
    if (!ok) return
    const { error } = await supabase.from('ramos').delete().eq('id', ramo.id)
    if (error) setError(error.message)
    else cargarRamos()
  }

  if (cargando) return <p className="text-slate-500">Cargando ramos…</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ramos</h1>
        <button
          onClick={abrirCrear}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nuevo ramo
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {ramos.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
          Aún no tienes ramos. Crea el primero con “+ Nuevo ramo”.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ramos.map((ramo) => (
            <div
              key={ramo.id}
              className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="h-2" style={{ backgroundColor: ramo.color }} />
              <div className="p-4">
                <Link to={`/ramos/${ramo.id}`} className="block">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {ramo.sigla}
                  </p>
                  <h2 className="mt-0.5 font-semibold leading-snug hover:text-indigo-600">
                    {ramo.nombre}
                  </h2>
                  {ramo.semestre && (
                    <p className="mt-1 text-xs text-slate-500">{ramo.semestre}</p>
                  )}
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <Link
                    to={`/ramos/${ramo.id}`}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Notas y calculadora →
                  </Link>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEditar(ramo)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => eliminar(ramo)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        abierto={modalAbierto}
        titulo={editando ? 'Editar ramo' : 'Nuevo ramo'}
        onCerrar={() => setModalAbierto(false)}
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Fundamentos de Finanzas"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Sigla</label>
              <input
                required
                value={form.sigla}
                onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                placeholder="Ej: EAA1510"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Semestre</label>
              <input
                value={form.semestre}
                onChange={(e) => setForm({ ...form, semestre: e.target.value })}
                placeholder="Ej: 2026-2"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORES_RAMO.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`h-8 w-8 rounded-full transition ${
                    form.color === color
                      ? 'ring-2 ring-slate-800 ring-offset-2'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
