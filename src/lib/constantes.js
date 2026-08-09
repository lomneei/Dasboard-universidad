export const COLORES_RAMO = [
  '#ef4444', // rojo
  '#f97316', // naranjo
  '#eab308', // amarillo
  '#22c55e', // verde
  '#14b8a6', // teal
  '#3b82f6', // azul
  '#8b5cf6', // violeta
  '#ec4899', // rosado
]

export const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes', corto: 'Lun' },
  { valor: 2, nombre: 'Martes', corto: 'Mar' },
  { valor: 3, nombre: 'Miércoles', corto: 'Mié' },
  { valor: 4, nombre: 'Jueves', corto: 'Jue' },
  { valor: 5, nombre: 'Viernes', corto: 'Vie' },
]

export const TIPOS_BLOQUE = ['Cátedra', 'Ayudantía', 'Laboratorio', 'Taller', 'Otro']

export const TIPOS_EVALUACION = [
  'Prueba',
  'Control',
  'Tarea',
  'Trabajo',
  'Presentación',
  'Examen',
  'Otro',
]

// Rango del calendario semanal (horas)
export const HORA_MIN = 8
export const HORA_MAX = 21

// Tipos de actividad para el registro de asistencia (valores de la DB)
export const TIPOS_ASISTENCIA = [
  { valor: 'clase', nombre: 'Clase' },
  { valor: 'ayudantia', nombre: 'Ayudantía' },
  { valor: 'laboratorio', nombre: 'Laboratorio' },
  { valor: 'taller', nombre: 'Taller' },
]

export const CATEGORIAS_CHECKLIST = [
  { valor: 'academico', nombre: 'Académico', clases: 'bg-indigo-100 text-indigo-700' },
  { valor: 'negocio', nombre: 'Negocio', clases: 'bg-emerald-100 text-emerald-700' },
  { valor: 'personal', nombre: 'Personal', clases: 'bg-amber-100 text-amber-700' },
]

export const TIPOS_VOLLEY = [
  { valor: 'entrenamiento', nombre: 'Entrenamiento', emoji: '🏐' },
  { valor: 'partido', nombre: 'Partido', emoji: '🆚' },
  { valor: 'torneo', nombre: 'Torneo', emoji: '🏆' },
]
