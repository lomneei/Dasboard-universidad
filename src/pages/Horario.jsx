import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DIAS_SEMANA, TIPOS_BLOQUE, MODULOS, ALMUERZO } from '../lib/constantes'
import { formatearHora, horaADecimal } from '../lib/fechas'
import Modal from '../components/Modal.jsx'
import GestionRamos from '../components/GestionRamos.jsx'
import ControlAsistencia from '../components/ControlAsistencia.jsx'

// Segmentos verticales de la grilla: los 9 módulos reales + la franja
// de almuerzo (13:30-14:50) entre M4 y M5. Alturas en px.
const SEGMENTOS = (() => {
  const seg = MODULOS.map((m) => ({ ...m, alto: 56 }))
  seg.splice(4, 0, { ...ALMUERZO, almuerzo: true, alto: 34 })
  return seg
})()
const topSegmento = (i) => SEGMENTOS.slice(0, i).reduce((suma, s) => suma + s.alto, 0)
const ALTO_GRILLA = topSegmento(SEGMENTOS.length)

// Posiciona un bloque cubriendo los segmentos que toca (los horarios
// reales calzan con los módulos; un bloque largo abarca varios seguidos)
function ubicarBloque(iniDec, finDec) {
  let desde = SEGMENTOS.findIndex((s) => horaADecimal(s.fin) > iniDec)
  if (desde === -1) desde = SEGMENTOS.length - 1
  let hasta = desde
  for (let i = SEGMENTOS.length - 1; i >= desde; i--) {
    if (horaADecimal(SEGMENTOS[i].ini) < finDec) {
      hasta = i
      break
    }
  }
  return { top: topSegmento(desde), alto: topSegmento(hasta + 1) - topSegmento(desde) }
}
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
          <div className="grid grid-cols-[4.5rem_repeat(5,1fr)] gap-1">
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

          {/* Grilla por módulos */}
          <div className="grid grid-cols-[4.5rem_repeat(5,1fr)] gap-1">
            {/* Columna de módulos */}
            <div className="relative" style={{ height: ALTO_GRILLA }}>
              {SEGMENTOS.map((s, i) => (
                <div
                  key={i}
                  className="absolute right-2 flex flex-col items-end justify-center"
                  style={{ top: topSegmento(i), height: s.alto }}
                >
                  {s.almuerzo ? (
                    <span className="text-[9px] text-zinc-600">🍴 almuerzo</span>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold leading-tight text-zinc-400">
                        M{s.n}
                      </span>
                      <span className="text-[9px] leading-tight text-zinc-600">
                        {s.ini}–{s.fin}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Columnas por día */}
            {DIAS_SEMANA.map((d) => (
              <div
                key={d.valor}
                className="relative rounded-lg bg-white/[0.04]"
                style={{ height: ALTO_GRILLA }}
              >
                {SEGMENTOS.map((s, i) => (
                  <div
                    key={i}
                    className={`absolute inset-x-0 ${i > 0 ? 'border-t border-white/10' : ''} ${
                      s.almuerzo ? 'franja-almuerzo' : ''
                    }`}
                    style={{ top: topSegmento(i), height: s.alto }}
                  />
                ))}
                {bloques
                  .filter((b) => b.dia_semana === d.valor)
                  .map((b) => {
                    const { top, alto } = ubicarBloque(
                      horaADecimal(formatearHora(b.hora_inicio)),
                      horaADecimal(formatearHora(b.hora_fin)),
                    )
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
                        title={`${b.ramos?.nombre} · ${b.tipo} · ${formatearHora(b.hora_inicio)}–${formatearHora(b.hora_fin)}${b.sala ? ` · ${b.sala}` : ' · sala por confirmar'}`}
                      >
                        {/* Nombre de la actividad (no la sigla); en no-cátedras
                            se antepone el tipo, como "Ayudantía Dinámica" */}
                        <p className="line-clamp-2 text-[11px] font-bold leading-tight">
                          {b.tipo !== 'Cátedra' && b.tipo !== 'Otro' ? `${b.tipo} ` : ''}
                          {b.ramos?.nombre}
                        </p>
                        <p className="truncate text-[10px] leading-tight opacity-80">
                          {b.sala || <span className="opacity-60">sala por confirmar</span>}
                        </p>
                      </button>
                    )
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ControlAsistencia ramos={ramos} />

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
