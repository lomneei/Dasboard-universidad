// Helpers de fechas. Las fechas de la DB llegan como 'YYYY-MM-DD';
// se parsean como fecha local para evitar el corrimiento de un día por UTC.

export function parseFechaLocal(fechaStr) {
  if (!fechaStr) return null
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function hoyInicioDia() {
  const h = new Date()
  h.setHours(0, 0, 0, 0)
  return h
}

export function diasHasta(fechaStr) {
  const fecha = parseFechaLocal(fechaStr)
  if (!fecha) return null
  const diffMs = fecha - hoyInicioDia()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function formatearFecha(fechaStr) {
  const fecha = parseFechaLocal(fechaStr)
  if (!fecha) return ''
  return fecha.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatearFechaLarga(fechaStr) {
  const fecha = parseFechaLocal(fechaStr)
  if (!fecha) return ''
  return fecha.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// 'HH:MM:SS' o 'HH:MM' -> 'HH:MM'
export function formatearHora(horaStr) {
  if (!horaStr) return ''
  return horaStr.slice(0, 5)
}

// 'HH:MM' -> horas decimales (ej: '14:30' -> 14.5)
export function horaADecimal(horaStr) {
  if (!horaStr) return 0
  const [h, m] = horaStr.split(':').map(Number)
  return h + m / 60
}

// Día de semana JS (0=domingo) -> convención de la app (1=lunes ... 5=viernes)
export function diaSemanaApp(date) {
  const d = date.getDay()
  return d === 0 ? 7 : d
}
