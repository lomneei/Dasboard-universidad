import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  diasHasta,
  fechaISO,
  formatearHora,
  hoyInicioDia,
  diaSemanaApp,
} from '../lib/fechas'
import { formatearNota } from '../lib/notas'
import ChecklistDiario from '../components/ChecklistDiario.jsx'

function etiquetaDia(fecha, indice) {
  if (indice === 0) return 'Hoy'
  if (indice === 1) return 'Mañana'
  return fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function EstaSemana() {
  const [evaluaciones, setEvaluaciones] = useState([])
  const [bloques, setBloques] = useState([])
  const [ramos, setRamos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      const hoy = hoyInicioDia()
      const fin = new Date(hoy)
      fin.setDate(fin.getDate() + 6)

      const [resEvals, resBloques, resRamos] = await Promise.all([
        supabase
          .from('evaluaciones')
          .select('*, ramos (nombre, sigla, color)')
          .gte('fecha', fechaISO(hoy))
          .lte('fecha', fechaISO(fin))
          .order('fecha'),
        supabase
          .from('horario_bloques')
          .select('*, ramos (nombre, sigla, color)')
          .order('hora_inicio'),
        supabase.from('ramos').select('id').limit(1),
      ])

      if (resEvals.error || resBloques.error || resRamos.error) {
        setError((resEvals.error ?? resBloques.error ?? resRamos.error).message)
      } else {
        setEvaluaciones(resEvals.data)
        setBloques(resBloques.data)
        setRamos(resRamos.data)
      }
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) return <p className="text-slate-500">Cargando tu semana…</p>

  // Los próximos 7 días con sus evaluaciones y clases
  const hoy = hoyInicioDia()
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() + i)
    const iso = fechaISO(fecha)
    return {
      fecha,
      indice: i,
      evaluaciones: evaluaciones.filter((e) => e.fecha === iso),
      bloques: bloques.filter((b) => b.dia_semana === diaSemanaApp(fecha)),
    }
  })

  const evalsUrgentes = evaluaciones.filter(
    (e) => e.nota === null && diasHasta(e.fecha) !== null && diasHasta(e.fecha) < 7,
  )

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Esta semana</h1>
      <p className="mb-6 text-sm text-slate-500">
        {hoy.toLocaleDateString('es-CL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {ramos.length === 0 && (
        <div className="mb-6 rounded-xl bg-indigo-50 p-6 text-center">
          <p className="mb-2 font-medium text-indigo-900">
            ¡Bienvenido! Empieza creando tus ramos.
          </p>
          <Link
            to="/ramos"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Ir a Ramos →
          </Link>
        </div>
      )}

      <ChecklistDiario />

      {evalsUrgentes.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">
            ⚠ {evalsUrgentes.length}{' '}
            {evalsUrgentes.length === 1
              ? 'evaluación próxima esta semana'
              : 'evaluaciones próximas esta semana'}
          </p>
          <ul className="space-y-1">
            {evalsUrgentes.map((e) => {
              const dias = diasHasta(e.fecha)
              return (
                <li key={e.id} className="text-sm text-amber-900">
                  <span className="font-medium">{e.nombre}</span> ({e.ramos?.sigla}) —{' '}
                  {dias === 0 ? '¡hoy!' : dias === 1 ? 'mañana' : `en ${dias} días`} ·{' '}
                  {e.peso_pct}%
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {dias.map((dia) => {
          const sinContenido = dia.evaluaciones.length === 0 && dia.bloques.length === 0
          if (sinContenido && dia.indice > 1) return null

          return (
            <section key={dia.indice} className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold capitalize">
                {etiquetaDia(dia.fecha, dia.indice)}
                {dia.indice <= 1 && (
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    {dia.fecha.toLocaleDateString('es-CL', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </h2>

              {sinContenido ? (
                <p className="text-sm text-slate-400">Nada agendado. 🎉</p>
              ) : (
                <div className="space-y-2">
                  {dia.evaluaciones.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                    >
                      <span className="text-lg">📝</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-red-900">
                          {e.nombre}{' '}
                          <span className="font-normal">({e.ramos?.sigla})</span>
                        </p>
                        <p className="text-xs text-red-700">
                          {e.tipo} · {e.peso_pct}%
                          {e.nota !== null && ` · nota: ${formatearNota(e.nota)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {dia.bloques.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div
                        className="h-8 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: b.ramos?.color ?? '#94a3b8' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {b.ramos?.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {b.tipo}
                          {b.sala ? ` · ${b.sala}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm text-slate-500">
                        {formatearHora(b.hora_inicio)}–{formatearHora(b.hora_fin)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
