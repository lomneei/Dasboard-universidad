import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { COLORES_RAMO } from '../lib/constantes'
import Modal from './Modal.jsx'

const FORM_VACIO = { nombre: '', sigla: '', semestre: '', color: COLORES_RAMO[6] }

// Panel de crear/editar/eliminar ramos, embebido como modal en Horario
// (los ramos ya no tienen página propia). onCambio avisa al padre para
// que recargue sus datos.
export default function GestionRamos({ abierto, onCerrar, ramos, onCambio }) {
  const [vista, setVista] = useState('lista') // 'lista' | 'form'
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setError(null)
    setVista('form')
  }

  const abrirEditar = (ramo) => {
    setEditando(ramo)
    setForm({
      nombre: ramo.nombre,
      sigla: ramo.sigla,
      semestre: ramo.semestre ?? '',
      color: ramo.color,
    })
    setError(null)
    setVista('form')
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
    setVista('lista')
    onCambio()
  }

  const eliminar = async (ramo) => {
    const ok = window.confirm(
      `¿Eliminar "${ramo.nombre}"? Se borrarán también sus evaluaciones, bloques de horario y asistencias.`,
    )
    if (!ok) return
    const { error } = await supabase.from('ramos').delete().eq('id', ramo.id)
    if (error) setError(error.message)
    else onCambio()
  }

  const cerrar = () => {
    setVista('lista')
    setError(null)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo={
        vista === 'lista' ? 'Gestionar ramos' : editando ? 'Editar ramo' : 'Nuevo ramo'
      }
      onCerrar={cerrar}
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {vista === 'lista' ? (
        <div className="space-y-3">
          {ramos.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">
              Aún no tienes ramos. Crea el primero para armar tu horario.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {ramos.map((ramo) => (
                <li
                  key={ramo.id}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5"
                >
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ramo.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ramo.nombre}</p>
                    <p className="text-xs text-zinc-500">
                      {ramo.sigla}
                      {ramo.semestre ? ` · ${ramo.semestre}` : ''}
                    </p>
                  </div>
                  <Link
                    to={`/ramos/${ramo.id}`}
                    className="shrink-0 text-xs font-medium text-violet-400 hover:underline"
                    title="Notas y calculadora"
                  >
                    notas →
                  </Link>
                  <button
                    onClick={() => abrirEditar(ramo)}
                    className="shrink-0 rounded p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => eliminar(ramo)}
                    className="shrink-0 rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={abrirCrear} className="btn-primario w-full py-2 text-sm">
            + Nuevo ramo
          </button>
        </div>
      ) : (
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Fundamentos de Finanzas"
              className="campo w-full"
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
                className="campo w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Semestre</label>
              <input
                value={form.semestre}
                onChange={(e) => setForm({ ...form, semestre: e.target.value })}
                placeholder="Ej: 2026-2"
                className="campo w-full"
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
                      ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-noche-900'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVista('lista')}
              className="btn-fantasma px-4 py-2 text-sm"
            >
              ← Volver
            </button>
            <button type="submit" disabled={guardando} className="btn-primario flex-1 py-2">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
