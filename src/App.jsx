import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import EstaSemana from './pages/EstaSemana.jsx'
import Tareas from './pages/Tareas.jsx'
import Calendario from './pages/Calendario.jsx'
import Ramos from './pages/Ramos.jsx'
import RamoDetalle from './pages/RamoDetalle.jsx'
import Horario from './pages/Horario.jsx'
import Voley from './pages/Voley.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<EstaSemana />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/horario" element={<Horario />} />
        <Route path="/voley" element={<Voley />} />
        <Route path="/ramos" element={<Ramos />} />
        <Route path="/ramos/:id" element={<RamoDetalle />} />
        <Route path="/evaluaciones" element={<Navigate to="/calendario" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
