import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

// Nav: 2 secciones a cada lado de INICIO (que va destacado al centro)
const linksIzquierda = [
  { to: '/tareas', label: 'Tareas' },
  { to: '/calendario', label: 'Calendario' },
]
const linksDerecha = [
  { to: '/horario', label: 'Horario' },
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

function PillNav({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 sm:px-3 sm:text-sm ${
          isActive
            ? 'bg-violet-600 text-white glow-activo'
            : 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
        }`
      }
    >
      {label}
    </NavLink>
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
        <nav className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 pb-2.5 sm:justify-center sm:gap-2">
          {linksIzquierda.map((l) => (
            <PillNav key={l.to} {...l} />
          ))}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold tracking-wide transition-all duration-200 sm:px-6 sm:text-base ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_rgba(139,92,246,0.5)]'
                  : 'bg-white/5 text-violet-300 hover:bg-violet-600/30 hover:text-white'
              }`
            }
            style={{ fontFamily: 'var(--font-display)' }}
          >
            INICIO
          </NavLink>
          {linksDerecha.map((l) => (
            <PillNav key={l.to} {...l} />
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
