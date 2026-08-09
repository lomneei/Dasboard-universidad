import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const links = [
  { to: '/', label: 'Esta semana' },
  { to: '/ramos', label: 'Ramos' },
  { to: '/horario', label: 'Horario' },
  { to: '/evaluaciones', label: 'Evaluaciones' },
  { to: '/voley', label: 'Vóley' },
]

// Marca DUNI: gradiente violeta + punto cian, como el ícono de la app
export function MarcaDuni({ className = 'text-xl' }) {
  return (
    <span
      className={`font-display font-bold tracking-tight ${className}`}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <span className="bg-gradient-to-r from-violet-300 to-violet-500 bg-clip-text text-transparent">
        DUNI
      </span>
      <span className="text-cyan-400">.</span>
    </span>
  )
}

export default function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-noche-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <MarcaDuni />
          <button
            onClick={signOut}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
          >
            Salir
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600 text-white glow-activo'
                    : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      {/* key por ruta: re-monta el contenido y dispara la animación de entrada */}
      <main key={location.pathname} className="pagina-entrada mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
