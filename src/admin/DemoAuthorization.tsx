import { useEffect, useState, type FormEvent } from "react"
import { supabase } from "../lib/supabase"
import {
  authorizationExpiry,
  authorizationStatus,
  type DemoAuthorization as Authorization,
  type DemoAuthorizationDetails,
} from "../lib/demo-authorization"

const date = (value: string) => new Date(value).toLocaleString("es-NI", {
  dateStyle: "medium", timeStyle: "short",
})

export function useAuthorizationClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

export default function DemoAuthorization({ requestId, disabled, onChange, onBusyChange }: {
  requestId: string
  disabled: boolean
  onChange: (authorization: Authorization | null) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [details, setDetails] = useState<DemoAuthorizationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [expiry, setExpiry] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const now = useAuthorizationClock()

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError("")
    async function load() {
      try {
        const { data, error: failure } = await supabase!.rpc("get_demo_authorization", { p_request_id: requestId })
        if (failure) throw failure
        if (alive) setDetails(data as DemoAuthorizationDetails)
      } catch {
        if (alive) {
          setDetails(null)
          setError("No pudimos consultar la autorización. Intenta de nuevo; si persiste, revisa la configuración del servicio.")
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [requestId, retry])

  async function deliverAccess() {
    const { data, error: failure } = await supabase!.functions.invoke("send-demo-access", {
      body: { request_id: requestId },
    })
    if (failure || data?.success !== true) throw new Error("Access email not confirmed")
  }

  async function resendAccess() {
    if (busy || disabled || loading || authorizationStatus(details?.authorization) !== "Autorizada") return
    setBusy(true); onBusyChange(true); setError(""); setNotice("")
    try {
      await deliverAccess()
      setNotice("Supabase aceptó el envío del enlace de acceso al correo de la solicitud. No confirma su llegada a la bandeja de entrada.")
    } catch {
      setError("La demo sigue autorizada, pero no pudimos confirmar el envío. Espera un minuto y usa Reenviar enlace de acceso.")
    } finally { setBusy(false); onBusyChange(false) }
  }

  async function change(action: "authorize" | "revoke") {
    if (busy || disabled || loading || !details) return
    setError("")
    setNotice("")
    let expiresAt: string | null = null
    try {
      if (action === "authorize") expiresAt = authorizationExpiry(expiry)
    } catch (failure) {
      setError((failure as Error).message)
      return
    }
    setBusy(true)
    onBusyChange(true)
    try {
      const result = action === "authorize"
        ? await supabase!.rpc("authorize_demo", { p_request_id: requestId, p_expires_at: expiresAt })
        : await supabase!.rpc("revoke_demo_authorization", { p_request_id: requestId })
      if (result.error) throw result.error
      const updated = result.data as DemoAuthorizationDetails
      setDetails(updated)
      onChange(updated.authorization)
      setExpiry("")
      if (action === "authorize") {
        try {
          await deliverAccess()
          setNotice("Demo autorizada. Supabase aceptó el envío del enlace de acceso al correo de la solicitud; revisa también spam.")
        } catch {
          setError("La demo quedó autorizada, pero no pudimos confirmar el envío del correo. Usa Reenviar enlace de acceso para reintentarlo.")
        }
      } else setNotice("Autorización revocada.")
    } catch {
      // Reload before allowing another change: a lost response may have committed.
      setDetails(null)
      setError("No pudimos confirmar el cambio. Actualiza la autorización antes de reintentar.")
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }

  function authorize(event: FormEvent) {
    event.preventDefault()
    void change("authorize")
  }
  const authorization = details?.authorization
  return (
    <section className="admin-authorization" aria-labelledby="demo-authorization-title" aria-busy={loading || busy}>
      <h3 id="demo-authorization-title">Autorización de demo</h3>
      {loading ? <p role="status">Consultando autorización…</p> : details && <>
        <p><span className="admin-badge">{authorizationStatus(authorization, now)}</span></p>
        {authorization && <dl>
          <dt>Autorizada el</dt><dd>{date(authorization.approved_at)}</dd>
          <dt>Administrador (ID)</dt><dd>{authorization.approved_by}</dd>
          <dt>Vencimiento</dt><dd>{authorization.expires_at ? date(authorization.expires_at) : "Sin vencimiento"}</dd>
          {authorization.revoked_at && <>
            <dt>Revocada el</dt><dd>{date(authorization.revoked_at)}</dd>
            <dt>Revocada por (ID)</dt><dd>{authorization.revoked_by}</dd>
          </>}
        </dl>}
        <form onSubmit={authorize}>
          <fieldset disabled={busy || disabled}>
            <legend className="admin-sr-only">Autorizar demo</legend>
            <label>Vencimiento opcional
              <input type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} aria-describedby="demo-expiry-help" />
            </label>
            <p className="admin-help" id="demo-expiry-help">
              Hora local de tu dispositivo ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Vacío significa sin vencimiento.
              {authorization && " Al volver a autorizar se reemplaza el vencimiento anterior y se conserva el historial."}
            </p>
            <p className="admin-help">Al autorizar, se envía al correo de esta solicitud un enlace para abrir la pantalla privada de descarga.</p>
            <div className="admin-actions">
              <button type="submit" className="button button--forest">{busy ? "Guardando…" : "Autorizar demo"}</button>
              {authorization && !authorization.revoked_at && <button type="button" onClick={() => void change("revoke")}>Revocar autorización</button>}
              {authorizationStatus(authorization, now) === "Autorizada" && <button type="button" onClick={() => void resendAccess()}>Reenviar enlace de acceso</button>}
            </div>
          </fieldset>
        </form>
        <h4>Historial de autorizaciones</h4>
        {details.history.length ? <ol className="admin-authorization-history">
          {details.history.map((event) => <li key={event.id}>
            <strong>{event.action === "authorized" ? "Autorización" : "Revocación"}</strong> · {date(event.occurred_at)}
            <span>Administrador (ID): {event.actor_id}</span>
            {event.action === "authorized" && <span>Vencimiento: {event.expires_at ? date(event.expires_at) : "Sin vencimiento"}</span>}
          </li>)}
        </ol> : <p>Todavía no hay autorizaciones registradas.</p>}
      </>}
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={loading || busy || disabled} onClick={() => {
        setNotice("")
        setRetry((value) => value + 1)
      }}>{details ? "Actualizar autorización" : "Reintentar consulta"}</button>
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
