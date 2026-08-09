import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/fechas'
import { CATEGORIAS_CHECKLIST } from '../lib/constantes'

// To-do del día con categoría (académico / negocio / personal).
// Solo muestra los ítems de hoy: cada día parte con la lista limpia.
export default function ChecklistDiario() {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('academico')
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { data, error } = await supabase
      .from('checklist_diario')
      .select('*')
      .eq('fecha', hoyISO())
      .order('created_at')
    if (error) setError(error.message)
    else setItems(data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const agregar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setGuardando(true)
    setError(null)
    const { error } = await supabase
      .from('checklist_diario')
      .insert({ fecha: hoyISO(), texto: texto.trim(), categoria })
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setTexto('')
    cargar()
  }

  const alternar = async (item) => {
    const { error } = await supabase
      .from('checklist_diario')
      .update({ completado: !item.completado })
      .eq('id', item.id)
    if (error) setError(error.message)
    else cargar()
  }

  const eliminar = async (item) => {
    const { error } = await supabase
      .from('checklist_diario')
      .delete()
      .eq('id', item.id)
    if (error) setError(error.message)
    else cargar()
  }

  const completados = items.filter((i) => i.completado).length

  return (
    <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Checklist de hoy</h2>
        {items.length > 0 && (
          <span
            className={`text-sm font-medium ${
              completados === items.length ? 'text-green-600' : 'text-slate-400'
            }`}
          >
            {completados}/{items.length}
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={agregar} className="mb-3 flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Agregar tarea…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          {CATEGORIAS_CHECKLIST.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={guardando || !texto.trim()}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          +
        </button>
      </form>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">
          Sin tareas para hoy. Anota lo primero que quieras sacar adelante.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const cat = CATEGORIAS_CHECKLIST.find((c) => c.valor === item.categoria)
            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={item.completado}
                  onChange={() => alternar(item)}
                  className="h-4 w-4 shrink-0 accent-indigo-600"
                />
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    item.completado ? 'text-slate-400 line-through' : ''
                  }`}
                >
                  {item.texto}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    cat?.clases ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat?.nombre ?? item.categoria}
                </span>
                <button
                  onClick={() => eliminar(item)}
                  className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  🗑
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
