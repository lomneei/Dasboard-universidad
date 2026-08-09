import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { MarcaDuni } from '../components/Layout.jsx'

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth()
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMensaje(null)
    setEnviando(true)

    const accion = modo === 'login' ? signIn : signUp
    const { data, error } = await accion(email, password)
    setEnviando(false)

    if (error) {
      setError(error.message)
      return
    }

    // Si Supabase tiene confirmación de email activada, signUp no crea sesión
    if (modo === 'registro' && !data.session) {
      setMensaje('Cuenta creada. Revisa tu correo para confirmar antes de entrar.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm panel p-8">
        <h1 className="mb-1 text-center">
          <MarcaDuni className="text-3xl" />
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-400">
          {modo === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="campo w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="campo w-full"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {mensaje && <p className="text-sm text-emerald-400">{mensaje}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="btn-primario w-full py-2"
          >
            {enviando ? '…' : modo === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === 'login' ? 'registro' : 'login')
            setError(null)
            setMensaje(null)
          }}
          className="mt-4 w-full text-center text-sm text-violet-400 hover:underline"
        >
          {modo === 'login'
            ? '¿No tienes cuenta? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  )
}
