import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

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
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-center text-2xl font-bold text-indigo-600">
          DUNI
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {mensaje && <p className="text-sm text-green-600">{mensaje}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
          className="mt-4 w-full text-center text-sm text-indigo-600 hover:underline"
        >
          {modo === 'login'
            ? '¿No tienes cuenta? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  )
}
