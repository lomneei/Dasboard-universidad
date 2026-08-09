import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DIAS_SEMANA, TIPOS_BLOQUE, HORA_MIN, HORA_MAX } from '../lib/constantes'
import { formatearHora, horaADecimal } from '../lib/fechas'
import Modal from '../components/Modal.jsx'
import GestionRamos from '../components/GestionRamos.jsx'

const ALTO_HORA = 52 // px por hora en la grilla
const FORM_VACIO = {
  ramo_id: '',
  tipo: TIPOS_BLOQUE[0],
  dia_semana: 1,
  hora_inicio: '08:20',
  hora_fin: '09:30',
  sala: '',
}

export default function Horario() {
  const [bloques, setBloques] = useState([])
  const [ramos, setRamos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalRamos, setModalRamos] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const [resBloques, resRamos] = await Promise.all([
      supabase
        .from('horario_bloques')
        .select('*, ramos (nombre, sigla, color)')
        .order('hora_inicio'),
      supabase.from('ramos').select('*').order('created_at'),
    ])
    if (resBloques.error || resRamos.error) {
      setError((resBloques.error ?? resRamos.error).message)
    } else {
      setBloques(resBloques.data)
      setRamos(resRamos.data)
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const abrirCrear = () => {
    setEditando(null)
    setForm({ ...FORM_VACIO, ramo_id: ramos[0]?.id ?? '' })
    setModalAbierto(true)
  }

  const abrirEditar = (bloque) => {
    setEditando(bloque)
    setForm({
      ramo_id: bloque.ramo_id,
      tipo: bloque.tipo,
      dia_semana: bloque.dia_semana,
      hora_inicio: formatearHora(bloque.hora_inicio),
      hora_fin: formatearHora(bloque.hora_fin),
      sala: bloque.sala ?? '',
    })
    setModalAbierto(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (form.hora_fin <= form.hora_inicio) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    setGuardando(true)
    setError(null)

    const datos = {
      ramo_id: form.ramo_id,
      tipo: form.tipo,
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      sala: form.sala.trim() || null,
    }

    let err
    if (editando) {
      ;({ error: err } = await supabase
        .from('horario_bloques')
        .update(datos)
        .eq('id', editando.id))
    } else {
      ;({ error: err } = await supabase.from('horario_bloques').insert(datos))
    }

    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    setModalAbierto(false)
    cargar()
  }

  const eliminar = async () => {
    if (!editando) return
    if (!window.confirm('¿Eliminar este bloque del horario?')) return
    const { error } = await supabase
      .from('horario_bloques')
      .delete()
      .eq('id', editando.id)
    if (error) {
      setError(error.message)
      return
    }
    setModalAbierto(false)
    cargar()
  }

  if (cargando) return <p className="text-zinc-400">Cargando horario…</p>

  const horas = []
  for (let h = HORA_MIN; h < HORA_MAX; h++) horas.push(h)
  const altoGrilla = (HORA_MAX - HORA_MIN) * ALTO_HORA

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Horario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setModalRamos(true)}
            className="btn-fantasma px-4 py-2 text-sm"
          >
            📚 Gestionar ramos
          </button>
          <button
            onClick={abrirCrear}
            disabled={ramos.length === 0}
            className="btn-primario px-4 py-2 text-sm disabled:opacity-50"
          >
            + Nuevo bloque
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {ramos.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Primero crea tus ramos (botón “Gestionar ramos”) para poder armar el horario.
        </p>
      )}

      <div className="overflow-x-auto panel p-4">
        <div className="min-w-[640px]">
          {/* Encabezado de días */}
          <div className="grid grid-cols-[3rem_repeat(5,1fr)] gap-1">
            <div />
            {DIAS_SEMANA.map((d) => (
              <div
                key={d.valor}
                className="pb-2 text-center text-sm font-semibold text-zinc-300"
              >
                {d.nombre}
              </div>
            ))}
          </div>

          {/* Grilla */}
          <div className="grid grid-cols-[3rem_repeat(5,1fr)] gap-1">
            {/* Columna de horas */}
            <div className="relative" style={{ height: altoGrilla }}>
              {horas.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-xs text-zinc-500"
                  style={{ top: (h - HORA_MIN) * ALTO_HORA }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Columnas por día */}
            {DIAS_SEMANA.map((d) => (
              <div
                key={d.valor}
                className="relative rounded-lg bg-white/[0.04]"
                style={{ height: altoGrilla }}
              >
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-white/10"
                    style={{ top: (h - HORA_MIN) * ALTO_HORA }}
                  />
                ))}
                {bloques
                  .filter((b) => b.dia_semana === d.valor)
                  .map((b) => {
                    const inicio = horaADecimal(formatearHora(b.hora_inicio))
                    const fin = horaADecimal(formatearHora(b.hora_fin))
                    const top = (inicio - HORA_MIN) * ALTO_HORA
                    const alto = Math.max((fin - inicio) * ALTO_HORA, 24)
                    return (
                      <button
                        key={b.id}
                        onClick={() => abrirEditar(b)}
                        className="absolute inset-x-0.5 overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm transition hover:brightness-110"
                        style={{
                          top,
                          height: alto,
                          backgroundColor: b.ramos?.color ?? '#64748b',
                        }}
                        title={`${b.ramos?.nombre} · ${b.tipo}${b.sala ? ` · ${b.sala}` : ''}`}
                      >
                        <p className="truncate text-xs font-bold leading-tight">
                          {b.ramos?.sigla}
                        </p>
                        <p className="truncate text-[10px] leading-tight opacity-90">
                          {b.tipo}
                          {b.sala ? ` · ${b.sala}` : ''}
                        </p>
                        <p className="truncate text-[10px] leading-tight opacity-75">
                          {formatearHora(b.hora_inicio)}–{formatearHora(b.hora_fin)}
                        </p>
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        abierto={modalAbierto}
        titulo={editando ? 'Editar bloque' : 'Nuevo bloque'}
        onCerrar={() => setModalAbierto(false)}
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Ramo</label>
            <select
              required
              value={form.ramo_id}
              onChange={(e) => setForm({ ...form, ramo_id: e.target.value })}
              className="campo w-full"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="campo w-full"
              >
                {TIPOS_BLOQUE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Día</label>
              <select
                value={form.dia_semana}
                onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
                className="campo w-full"
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Inicio</label>
              <input
                type="time"
                required
                value={form.hora_inicio}
                onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                className="campo w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fin</label>
              <input
                type="time"
                required
                value={form.hora_fin}
                onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                className="campo w-full"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Sala <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              value={form.sala}
              onChange={(e) => setForm({ ...form, sala: e.target.value })}
              placeholder="Ej: A2, Lab 3"
              className="campo w-full"
            />
          </div>
          <div className="flex gap-2">
            {editando && (
              <button
                type="button"
                onClick={eliminar}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                Eliminar
              </button>
            )}
            <button
              type="submit"
              disabled={guardando}
              className="btn-primario flex-1 py-2"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <GestionRamos
        abierto={modalRamos}
        onCerrar={() => setModalRamos(false)}
        ramos={ramos}
        onCambio={cargar}
      />
    </div>
  )
}
