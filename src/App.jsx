import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import EstaSemana from './pages/EstaSemana.jsx'
import Ramos from './pages/Ramos.jsx'
import RamoDetalle from './pages/RamoDetalle.jsx'
import Horario from './pages/Horario.jsx'
import Evaluaciones from './pages/Evaluaciones.jsx'

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
        <Route path="/ramos" element={<Ramos />} />
        <Route path="/ramos/:id" element={<RamoDetalle />} />
        <Route path="/horario" element={<Horario />} />
        <Route path="/evaluaciones" element={<Evaluaciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
