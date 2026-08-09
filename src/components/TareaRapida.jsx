import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/fechas'
import { avisarTareasCambiaron, faltaSchemaV3 } from '../lib/tareas'
import Modal from './Modal.jsx'

// Botón flotante global: agrega una tarea (de hoy o recurrente) desde
// cualquier página. Al guardar avisa vía evento para que Inicio/Tareas
// recarguen si están montadas.
export default function TareaRapida() {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [esRecurrente, setEsRecurrente] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const abrir = () => {
    setTexto('')
    setEsRecurrente(false)
    setError(null)
    setAbierto(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setGuardando(true)
    setError(null)

    let err
    if (esRecurrente) {
      const { error } = await supabase
        .from('tareas_recurrentes')
        .insert({ texto: texto.trim() })
      err = error
    } else {
      const { error } = await supabase
        .from('checklist_diario')
        .insert({ fecha: hoyISO(), texto: texto.trim() })
      err = error
    }

    setGuardando(false)
    if (err) {
      setError(
        faltaSchemaV3(err.message)
          ? 'Corre supabase/schema_v3.sql en Supabase para activar las tareas.'
          : err.message,
      )
      return
    }
    setAbierto(false)
    avisarTareasCambiaron()
  }

  return (
    <>
      <button
        onClick={abrir}
        aria-label="Agregar tarea rápida"
        title="Agregar tarea rápida"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl font-bold text-white shadow-[0_0_24px_rgba(139,92,246,0.45)] transition-all duration-200 hover:scale-105 hover:shadow-[0_0_34px_rgba(139,92,246,0.65)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        +
      </button>

      <Modal abierto={abierto} titulo="Tarea rápida" onCerrar={() => setAbierto(false)}>
        <form onSubmit={guardar} className="space-y-4">
          <input
            type="text"
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            className="campo w-full"
          />
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <button
              type="button"
              role="switch"
              aria-checked={esRecurrente}
              onClick={() => setEsRecurrente(!esRecurrente)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                esRecurrente ? 'bg-violet-500' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  esRecurrente ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
            ¿Se repite todos los días?
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={guardando || !texto.trim()}
            className="btn-primario w-full py-2"
          >
            {guardando ? 'Guardando…' : 'Agregar'}
          </button>
        </form>
      </Modal>
    </>
  )
}
