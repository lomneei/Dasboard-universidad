import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SEMESTRE, SEGUIMIENTOS_ASISTENCIA } from '../lib/constantes'
import { fechaISO, hoyISO, parseFechaLocal, formatearFecha } from '../lib/fechas'

// Todas las fechas del semestre que caen en `dia` (1=lunes ... 5=viernes)
function fechasSemanales(dia) {
  const fin = parseFechaLocal(SEMESTRE.fin)
  const f = parseFechaLocal(SEMESTRE.inicio)
  const diaJs = f.getDay() === 0 ? 7 : f.getDay()
  f.setDate(f.getDate() + ((dia - diaJs + 7) % 7))
  const fechas = []
  while (f <= fin) {
    fechas.push(fechaISO(f))
    f.setDate(f.getDate() + 7)
  }
  return fechas
}

// ¿El error delata que falta correr schema_v4.sql?
function faltaSchemaV4(mensaje) {
  return /asistencias_tipo_check|relation "public\.ideas"/.test(mensaje ?? '')
}

// Punto clickeable de una fecha: verde=fui, rojo=falté, gris=sin marcar
function Punto({ fecha, asistio, futuro, onCiclar }) {
  const dia = parseFechaLocal(fecha)
  const clases =
    asistio === true
      ? 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.45)]'
      : asistio === false
        ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]'
        : futuro
          ? 'bg-white/[0.04] text-zinc-600'
          : 'bg-white/10 text-zinc-400 hover:bg-white/20'
  return (
    <button
      disabled={futuro}
      onClick={onCiclar}
      title={`${formatearFecha(fecha)}${
        asistio === true ? ' · fuiste' : asistio === false ? ' · faltaste' : futuro ? ' · aún no pasa' : ' · sin marcar'
      }`}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold transition-all ${clases} ${
        fecha === hoyISO() ? 'ring-1 ring-violet-400/70' : ''
      } ${futuro ? 'cursor-default' : 'active:scale-90'}`}
    >
      {dia.getDate()}
    </button>
  )
}

// Control de asistencia real (persistente todo el semestre) para las
// actividades que pasan lista. Click en un punto cicla:
// sin marcar -> fui -> falté -> sin marcar.
export default function ControlAsistencia({ ramos }) {
  const [registros, setRegistros] = useState(new Map())
  const [error, setError] = useState(null)
  const [fechaPuntual, setFechaPuntual] = useState(hoyISO())

  // Resolver cada seguimiento a su ramo real (por nombre)
  const seguimientos = useMemo(
    () =>
      SEGUIMIENTOS_ASISTENCIA.map((s) => ({
        ...s,
        ramo: ramos.find((r) => r.nombre.toLowerCase() === s.ramoNombre.toLowerCase()),
      })),
    [ramos],
  )

  const clave = (ramoId, tipo, fecha) => `${ramoId}|${tipo}|${fecha}`

  const cargar = async () => {
    const ids = [...new Set(seguimientos.filter((s) => s.ramo).map((s) => s.ramo.id))]
    if (ids.length === 0) return
    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .in('ramo_id', ids)
      .gte('fecha', SEMESTRE.inicio)
    if (error) {
      setError(error.message)
      return
    }
    setRegistros(new Map(data.map((a) => [clave(a.ramo_id, a.tipo, a.fecha), a.asistio])))
    setError(null)
  }

  useEffect(() => {
    cargar()
  }, [ramos])

  // sin marcar -> fui -> falté -> sin marcar
  const ciclar = async (seg, fecha) => {
    const k = clave(seg.ramo.id, seg.tipo, fecha)
    const actual = registros.get(k)
    let err
    if (actual === undefined || actual === true) {
      const { error } = await supabase
        .from('asistencias')
        .upsert(
          { ramo_id: seg.ramo.id, tipo: seg.tipo, fecha, asistio: actual === undefined },
          { onConflict: 'ramo_id,fecha,tipo' },
        )
      err = error
    } else {
      const { error } = await supabase
        .from('asistencias')
        .delete()
        .match({ ramo_id: seg.ramo.id, tipo: seg.tipo, fecha })
      err = error
    }
    if (err) {
      setError(err.message)
      return
    }
    // update optimista del mapa local
    const nuevo = new Map(registros)
    if (actual === undefined) nuevo.set(k, true)
    else if (actual === true) nuevo.set(k, false)
    else nuevo.delete(k)
    setRegistros(nuevo)
    setError(null)
  }

  const hoy = hoyISO()

  return (
    <section className="panel mt-6 p-4">
      <h2 className="mb-1 text-lg font-semibold">Control de asistencia</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Actividades que pasan lista. El historial se conserva todo el semestre:
        toca un día para ciclar entre <span className="text-emerald-400">fui</span> →{' '}
        <span className="text-red-400">falté</span> → sin marcar.
      </p>

      {error &&
        (faltaSchemaV4(error) ? (
          <p className="mb-4 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            ⚠ Corre <code className="rounded bg-white/10 px-1">supabase/schema_v4.sql</code> en
            Supabase para habilitar las actividades puntuales.
          </p>
        ) : (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        ))}

      <div className="space-y-5">
        {seguimientos.map((seg) => {
          if (!seg.ramo)
            return (
              <p key={seg.etiqueta} className="text-sm text-zinc-500">
                No encontré el ramo “{seg.ramoNombre}” — crea los ramos (o corre el seed)
                para activar “{seg.etiqueta}”.
              </p>
            )

          const fechas = seg.dia
            ? fechasSemanales(seg.dia)
            : [...registros.keys()]
                .filter((k) => k.startsWith(`${seg.ramo.id}|${seg.tipo}|`))
                .map((k) => k.split('|')[2])
                .sort()
          const marcadas = fechas.filter(
            (f) => registros.get(clave(seg.ramo.id, seg.tipo, f)) !== undefined,
          )
          const asistidas = fechas.filter(
            (f) => registros.get(clave(seg.ramo.id, seg.tipo, f)) === true,
          )

          return (
            <div key={seg.etiqueta}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="h-3.5 w-1.5 rounded-full"
                  style={{ backgroundColor: seg.ramo.color }}
                />
                <h3 className="text-sm font-semibold">{seg.etiqueta}</h3>
                {marcadas.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    fuiste a {asistidas.length} de {marcadas.length} (
                    {Math.round((asistidas.length / marcadas.length) * 100)}%)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {fechas.length === 0 && (
                  <span className="text-xs text-zinc-600">sin registros todavía</span>
                )}
                {fechas.map((f) => (
                  <Punto
                    key={f}
                    fecha={f}
                    asistio={registros.get(clave(seg.ramo.id, seg.tipo, f))}
                    futuro={f > hoy}
                    onCiclar={() => ciclar(seg, f)}
                  />
                ))}
                {/* Las actividades puntuales se registran a mano cuando ocurren */}
                {!seg.dia && (
                  <span className="ml-1 flex items-center gap-1.5">
                    <input
                      type="date"
                      value={fechaPuntual}
                      max={hoy}
                      onChange={(e) => setFechaPuntual(e.target.value)}
                      className="campo px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => fechaPuntual && ciclar(seg, fechaPuntual)}
                      className="btn-fantasma px-2.5 py-1 text-xs"
                      title="Registrar esta fecha (parte como 'fui'; tócala para cambiar)"
                    >
                      + registrar
                    </button>
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> fui
        <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-red-500" /> falté
        <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-white/10" /> sin marcar
        <span className="ml-2 h-2.5 w-2.5 rounded-sm bg-white/[0.04]" /> aún no pasa
      </div>
    </section>
  )
}
