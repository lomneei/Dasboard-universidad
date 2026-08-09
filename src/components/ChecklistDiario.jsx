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
    <section className="mb-6 panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Checklist de hoy</h2>
        {items.length > 0 && (
          <span
            className={`text-sm font-medium ${
              completados === items.length ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {completados}/{items.length}
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <form onSubmit={agregar} className="mb-3 flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Agregar tarea…"
          className="campo min-w-0 flex-1 text-sm"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="campo px-2 text-sm"
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
          className="btn-primario shrink-0 px-3 py-2 text-sm"
        >
          +
        </button>
      </form>

      {cargando ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Sin tareas para hoy. Anota lo primero que quieras sacar adelante.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const cat = CATEGORIAS_CHECKLIST.find((c) => c.valor === item.categoria)
            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={item.completado}
                  onChange={() => alternar(item)}
                  className="h-4 w-4 shrink-0 accent-violet-500"
                />
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    item.completado ? 'text-zinc-500 line-through' : ''
                  }`}
                >
                  {item.texto}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    cat?.clases ?? 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {cat?.nombre ?? item.categoria}
                </span>
                <button
                  onClick={() => eliminar(item)}
                  className="shrink-0 rounded p-1 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
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
