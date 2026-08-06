// Lógica de cálculo de notas (escala chilena 1.0 - 7.0).
//
// Modelo: cada evaluación tiene un peso en % (idealmente suman 100 por ramo).
// - Promedio actual: promedio ponderado de las evaluaciones ya rendidas,
//   normalizado por el peso rendido.
// - Nota necesaria: la nota uniforme que habría que sacar en TODO lo pendiente
//   para que el promedio final ponderado (sobre el peso total registrado)
//   alcance la nota objetivo.

export const NOTA_MIN = 1.0
export const NOTA_MAX = 7.0

export function analizarRamo(evaluaciones, config) {
  const notaAprobacion = config?.nota_aprobacion ?? 4.0
  const notaEximicion = config?.nota_eximicion ?? null

  const rendidas = evaluaciones.filter((e) => e.nota !== null && e.nota !== undefined)
  const pendientes = evaluaciones.filter((e) => e.nota === null || e.nota === undefined)

  const pesoRendido = rendidas.reduce((acc, e) => acc + Number(e.peso_pct), 0)
  const pesoPendiente = pendientes.reduce((acc, e) => acc + Number(e.peso_pct), 0)
  const pesoTotal = pesoRendido + pesoPendiente

  // Puntos acumulados: sum(nota * peso) — se divide por peso para promediar
  const puntos = rendidas.reduce((acc, e) => acc + Number(e.nota) * Number(e.peso_pct), 0)

  const promedioActual = pesoRendido > 0 ? puntos / pesoRendido : null

  // Nota final proyectada si el objetivo se mide sobre el peso total registrado:
  // (puntos + x * pesoPendiente) / pesoTotal = objetivo
  const notaNecesariaPara = (objetivo) => {
    if (objetivo === null || objetivo === undefined) return null
    if (pesoPendiente <= 0) return null
    return (objetivo * pesoTotal - puntos) / pesoPendiente
  }

  return {
    notaAprobacion,
    notaEximicion,
    rendidas,
    pendientes,
    pesoRendido,
    pesoPendiente,
    pesoTotal,
    promedioActual,
    necesariaAprobar: notaNecesariaPara(notaAprobacion),
    necesariaEximir: notaNecesariaPara(notaEximicion),
    pesosIncompletos: Math.abs(pesoTotal - 100) > 0.01,
    todoRendido: pesoPendiente <= 0 && pesoRendido > 0,
  }
}

// Interpreta una "nota necesaria" cruda y la traduce a un estado presentable
export function interpretarNecesaria(necesaria) {
  if (necesaria === null || necesaria === undefined) return null
  if (necesaria <= NOTA_MIN) return { estado: 'asegurado', valor: NOTA_MIN }
  if (necesaria > NOTA_MAX) return { estado: 'imposible', valor: necesaria }
  return { estado: 'alcanzable', valor: necesaria }
}

export function formatearNota(nota, decimales = 1) {
  if (nota === null || nota === undefined) return '—'
  return Number(nota).toFixed(decimales).replace('.', ',')
}
