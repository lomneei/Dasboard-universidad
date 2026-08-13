// Integración de SOLO LECTURA con Google Calendar.
// Usa Google Identity Services (token OAuth en el navegador, sin backend):
// el usuario aprueba en un popup de Google y guardamos el access token
// en localStorage. El token dura ~1 hora; al expirar se pide reconectar.

import { fechaISO } from './fechas'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const CLAVE_TOKEN = 'duni_gcal_token'

// ¿Está el client ID en .env? (sin él no se puede ni intentar)
export function gcalConfigurado() {
  return Boolean(CLIENT_ID)
}

function leerToken() {
  try {
    const crudo = localStorage.getItem(CLAVE_TOKEN)
    if (!crudo) return null
    const token = JSON.parse(crudo)
    if (!token.access_token || Date.now() > token.expira) return null
    return token
  } catch {
    return null
  }
}

export function gcalConectado() {
  return leerToken() !== null
}

// Carga el script de Google Identity Services una sola vez
let promesaGis = null
function cargarGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!promesaGis) {
    promesaGis = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = resolve
      script.onerror = () =>
        reject(new Error('No se pudo cargar el script de Google (¿sin internet?)'))
      document.head.appendChild(script)
    })
  }
  return promesaGis
}

// Abre el popup de Google y guarda el token al aprobar
export async function conectarGcal() {
  if (!CLIENT_ID) throw new Error('Falta VITE_GOOGLE_CLIENT_ID en el archivo .env')
  await cargarGis()
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error))
          return
        }
        // 60 s de colchón para no usar un token a punto de expirar
        const token = {
          access_token: resp.access_token,
          expira: Date.now() + (Number(resp.expires_in) - 60) * 1000,
        }
        localStorage.setItem(CLAVE_TOKEN, JSON.stringify(token))
        resolve(token)
      },
      error_callback: () => reject(new Error('Conexión con Google cancelada')),
    })
    cliente.requestAccessToken()
  })
}

export function desconectarGcal() {
  const token = leerToken()
  localStorage.removeItem(CLAVE_TOKEN)
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {})
  }
}

// Eventos del calendario principal entre dos Date.
// Lanza Error('gcal-desconectado') si no hay token válido, para que la
// UI vuelva a mostrar el botón de conectar.
export async function listarEventosGcal(desde, hasta) {
  const token = leerToken()
  if (!token) throw new Error('gcal-desconectado')

  const params = new URLSearchParams({
    timeMin: desde.toISOString(),
    timeMax: hasta.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  )
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem(CLAVE_TOKEN)
    throw new Error('gcal-desconectado')
  }
  if (!res.ok) throw new Error(`Google Calendar respondió ${res.status}`)

  const json = await res.json()
  return (json.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.start?.date || e.start?.dateTime))
    .map((e) => {
      const todoElDia = Boolean(e.start?.date)
      return {
        id: e.id,
        titulo: e.summary ?? '(sin título)',
        fecha: todoElDia ? e.start.date : fechaISO(new Date(e.start.dateTime)),
        hora: todoElDia ? null : new Date(e.start.dateTime).toTimeString().slice(0, 5),
        todoElDia,
      }
    })
}
