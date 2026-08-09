import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/fechas'
import { TIPOS_ASISTENCIA } from '../lib/constantes'

// Checklist rápido de asistencia del día para un ramo, más un resumen
// del historial. Una fila por (ramo, fecha, tipo): marcar de nuevo el
// mismo estado la elimina (deshacer), marcar el contrario la actualiza.
export default function AsistenciaHoy({ ramoId }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = async () => {
    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('ramo_id', ramoId)
    if (error) setError(error.message)
    else setRegistros(data)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ramoId])

  const hoy = hoyISO()
  const deHoy = registros.filter((r) => r.fecha === hoy)

  const marcar = async (tipo, asistio) => {
    setError(null)
    const existente = deHoy.find((r) => r.tipo === tipo)
    let res
    if (existente && existente.asistio === asistio) {
      res = await supabase.from('asistencias').delete().eq('id', existente.id)
    } else {
      res = await supabase
        .from('asistencias')
        .upsert(
          { ramo_id: ramoId, fecha: hoy, tipo, asistio },
          { onConflict: 'ramo_id,fecha,tipo' },
        )
    }
    if (res.error) setError(res.error.message)
    else cargar()
  }

  const total = registros.length
  const asistidas = registros.filter((r) => r.asistio).length
  const pct = total > 0 ? Math.round((asistidas / total) * 100) : null

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Asistencia</h2>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          ¿Fuiste hoy?
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="space-y-2">
            {TIPOS_ASISTENCIA.map(({ valor, nombre }) => {
              const registro = deHoy.find((r) => r.tipo === valor)
              return (
                <div
                  key={valor}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm font-medium">{nombre}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => marcar(valor, true)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium ${
                        registro?.asistio === true
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-green-50'
                      }`}
                    >
                      ✓ Fui
                    </button>
                    <button
                      onClick={() => marcar(valor, false)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium ${
                        registro?.asistio === false
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-red-50'
                      }`}
                    >
                      ✗ No fui
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {pct === null
            ? 'Sin registros aún. Marca tu asistencia de hoy para empezar el historial.'
            : `Historial: fuiste a ${asistidas} de ${total} ${
                total === 1 ? 'actividad registrada' : 'actividades registradas'
              } (${pct}%).`}
        </p>
      </div>
    </div>
  )
}
