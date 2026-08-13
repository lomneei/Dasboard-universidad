import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ¿El error delata que falta correr schema_v4.sql?
const faltaSchemaV4 = (mensaje) => /relation "public\.ideas"|'ideas'/.test(mensaje ?? '')

// Captura rápida de ideas: se anotan sin fricción y no se borran,
// solo se tachan (se conserva todo lo que se te ha ocurrido).
export default function Ideas() {
  const [ideas, setIdeas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setIdeas(data)
      setError(null)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const agregar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('ideas').insert({ texto: texto.trim() })
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    setTexto('')
    cargar()
  }

  // Tachar / destachar con update optimista
  const alternar = async (idea) => {
    setIdeas((is) =>
      is.map((i) => (i.id === idea.id ? { ...i, completada: !i.completada } : i)),
    )
    const { error } = await supabase
      .from('ideas')
      .update({ completada: !idea.completada })
      .eq('id', idea.id)
    if (error) {
      setError(error.message)
      cargar()
    }
  }

  if (cargando) return <p className="text-zinc-400">Cargando ideas…</p>

  if (error && faltaSchemaV4(error)) {
    return (
      <div className="panel p-8 text-center">
        <p className="mb-2 text-lg font-semibold text-amber-300">Falta un paso en Supabase</p>
        <p className="text-sm text-zinc-400">
          Corre <code className="rounded bg-white/10 px-1.5 py-0.5">supabase/schema_v4.sql</code>{' '}
          en el SQL Editor de Supabase para activar las ideas, y recarga.
        </p>
      </div>
    )
  }

  const activas = ideas.filter((i) => !i.completada)
  const tachadas = ideas.filter((i) => i.completada)

  const Fila = ({ idea }) => (
    <li
      className={`panel flex items-center gap-3 px-4 py-2.5 transition-colors duration-300 ${
        idea.completada ? 'opacity-70' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={idea.completada}
        onChange={() => alternar(idea)}
        className="check-tarea h-4 w-4 shrink-0"
        title={idea.completada ? 'Destachar' : 'Tachar'}
      />
      <span
        className={`min-w-0 flex-1 text-sm transition-colors duration-300 ${
          idea.completada ? 'text-zinc-500 line-through' : ''
        }`}
      >
        {idea.texto}
      </span>
      <span className="shrink-0 text-xs text-zinc-600">
        {new Date(idea.created_at).toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'short',
        })}
      </span>
    </li>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">💡 Ideas</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Anótalas antes de que se escapen. No se borran: se tachan.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <form onSubmit={agregar} className="panel mb-6 flex gap-2 p-4">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué se te ocurrió?"
          autoFocus
          className="campo min-w-0 flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={guardando || !texto.trim()}
          className="btn-primario shrink-0 px-4 py-2 text-sm"
        >
          Anotar
        </button>
      </form>

      {ideas.length === 0 ? (
        <p className="panel p-8 text-center text-zinc-400">
          Todavía no anotas ninguna idea. La primera va arriba ↑
        </p>
      ) : (
        <div className="space-y-6">
          {activas.length > 0 && (
            <ul className="space-y-1.5">
              {activas.map((idea) => (
                <Fila key={idea.id} idea={idea} />
              ))}
            </ul>
          )}
          {tachadas.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Tachadas
              </h2>
              <ul className="space-y-1.5">
                {tachadas.map((idea) => (
                  <Fila key={idea.id} idea={idea} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
