export const COLORES_RAMO = [
  '#ef4444', // rojo
  '#f97316', // naranjo
  '#eab308', // amarillo
  '#22c55e', // verde
  '#14b8a6', // teal
  '#3b82f6', // azul
  '#8b5cf6', // violeta
  '#ec4899', // rosado
  '#06b6d4', // cian (Entrenamiento Selección)
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

// Módulos horarios reales de la universidad (la grilla del horario se
// arma con estas franjas exactas; entre M4 y M5 va el almuerzo)
export const MODULOS = [
  { n: 1, ini: '08:20', fin: '09:30' },
  { n: 2, ini: '09:40', fin: '10:50' },
  { n: 3, ini: '11:00', fin: '12:10' },
  { n: 4, ini: '12:20', fin: '13:30' },
  { n: 5, ini: '14:50', fin: '16:00' },
  { n: 6, ini: '16:10', fin: '17:20' },
  { n: 7, ini: '17:30', fin: '18:40' },
  { n: 8, ini: '18:50', fin: '20:00' },
  { n: 9, ini: '20:10', fin: '21:20' },
]
export const ALMUERZO = { ini: '13:30', fin: '14:50' }

// Tipos de actividad para el registro de asistencia (valores de la DB)
export const TIPOS_ASISTENCIA = [
  { valor: 'clase', nombre: 'Clase' },
  { valor: 'ayudantia', nombre: 'Ayudantía' },
  { valor: 'laboratorio', nombre: 'Laboratorio' },
  { valor: 'taller', nombre: 'Taller' },
  { valor: 'actividad', nombre: 'Actividad en clase' },
]

// Rango del semestre actual: genera las fechas esperadas del control
// de asistencia. Actualizar al cambiar de semestre.
export const SEMESTRE = { inicio: '2026-08-10', fin: '2026-11-27' }

// Actividades que pasan lista (control de asistencia en Horario).
// dia: 1=lunes ... 5=viernes si es semanal; null = puntual (se registra
// a mano cuando ocurre). ramoNombre debe calzar con el nombre del ramo.
export const SEGUIMIENTOS_ASISTENCIA = [
  {
    ramoNombre: 'Análisis Económico',
    tipo: 'ayudantia',
    etiqueta: 'Ayudantía Análisis Económico',
    dia: 5,
  },
  { ramoNombre: 'Dinámica', tipo: 'taller', etiqueta: 'Taller Dinámica', dia: 5 },
  {
    ramoNombre: 'Análisis Económico',
    tipo: 'actividad',
    etiqueta: 'Actividad en clase · Análisis Económico',
    dia: null,
  },
]

export const CATEGORIAS_CHECKLIST = [
  { valor: 'academico', nombre: 'Académico', clases: 'bg-violet-500/15 text-violet-300' },
  { valor: 'negocio', nombre: 'Negocio', clases: 'bg-emerald-500/15 text-emerald-300' },
  { valor: 'personal', nombre: 'Personal', clases: 'bg-amber-500/15 text-amber-300' },
]

// Iconos consistentes por tipo de evento (se usan en Inicio, Calendario, etc.)
export const ICONOS = {
  evaluacion: '📝',
  tarea: '✅',
  voley: '🏐',
}

export const ICONOS_BLOQUE = {
  Cátedra: '📚',
  Ayudantía: '🧑‍🏫',
  Laboratorio: '🧪',
  Taller: '🛠️',
  Otro: '📌',
}

export const TIPOS_VOLLEY = [
  { valor: 'entrenamiento', nombre: 'Entrenamiento', emoji: '🏐' },
  { valor: 'partido', nombre: 'Partido', emoji: '🆚' },
  { valor: 'torneo', nombre: 'Torneo', emoji: '🏆' },
]
