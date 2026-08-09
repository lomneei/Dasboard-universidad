import ChecklistDiario from '../components/ChecklistDiario.jsx'

// Página puente: se reemplaza por el sistema de tareas recurrentes + grid
export default function Tareas() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Tareas</h1>
      <ChecklistDiario />
    </div>
  )
}
