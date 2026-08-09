import { supabase } from './supabase'
import { hoyISO, fechaISO, parseFechaLocal, hoyInicioDia } from './fechas'

// Crea en checklist_diario la instancia de hoy de cada tarea recurrente
// activa que aún no la tenga. Idempotente (índice único por tarea+fecha).
export async function materializarTareasHoy() {
  const hoy = hoyISO()
  const [resRec, resInst] = await Promise.all([
    supabase.from('tareas_recurrentes').select('*').eq('activa', true),
    supabase
      .from('checklist_diario')
      .select('recurrente_id')
      .eq('fecha', hoy)
      .not('recurrente_id', 'is', null),
  ])
  const error = resRec.error ?? resInst.error
  if (error) return { error }

  const yaCreadas = new Set(resInst.data.map((r) => r.recurrente_id))
  const faltantes = resRec.data.filter((t) => !yaCreadas.has(t.id))
  if (faltantes.length === 0) return { error: null }

  const { error: errInsert } = await supabase.from('checklist_diario').insert(
    faltantes.map((t) => ({ fecha: hoy, texto: t.texto, recurrente_id: t.id })),
  )
  return { error: errInsert }
}

// Agrupa filas del checklist por fecha: { fecha: { total, completadas } }
export function agruparPorDia(filas) {
  const porDia = new Map()
  for (const fila of filas) {
    const dia = porDia.get(fila.fecha) ?? { total: 0, completadas: 0 }
    dia.total += 1
    if (fila.completado) dia.completadas += 1
    porDia.set(fila.fecha, dia)
  }
  return porDia
}

// Racha: días consecutivos con al menos 1 tarea completada, contando
// hacia atrás desde hoy. Si hoy aún no completas nada, no rompe la
// racha (parte desde ayer), solo que hoy todavía no suma.
export function calcularRacha(porDia) {
  const hoy = hoyInicioDia()
  let racha = 0
  let cursor = new Date(hoy)

  const completoEse = (d) => (porDia.get(fechaISO(d))?.completadas ?? 0) > 0

  if (!completoEse(cursor)) cursor.setDate(cursor.getDate() - 1)
  while (completoEse(cursor)) {
    racha += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return racha
}

// ¿El error de Supabase delata que falta correr schema_v3.sql?
export function faltaSchemaV3(mensaje) {
  return /tareas_recurrentes|recurrente_id/.test(mensaje ?? '')
}

// Aviso global de que las tareas cambiaron (lo usa el botón flotante);
// las páginas que muestran tareas escuchan este evento y recargan.
export const EVENTO_TAREAS = 'duni:tareas-cambiaron'

export function avisarTareasCambiaron() {
  window.dispatchEvent(new Event(EVENTO_TAREAS))
}

export { parseFechaLocal }
