import { useEffect, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { demoAccessRequested, demoSupabase, downloadInstaller, fileSize, recoveryRequested, type Installer } from "../lib/supabase"

type Version = Pick<Installer, "id" | "version" | "architecture" | "size_bytes">

export default function DemoDownloadAccess() {
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [access, setAccess] = useState<"checking" | "allowed" | "denied" | "error">("checking")
  const [installer, setInstaller] = useState<Version | null>(null)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!demoSupabase) { setCheckingSession(false); return }
    let alive = true
    const { data } = demoSupabase.auth.onAuthStateChange((_event, next) => {
      if (alive) { setSession(next); setCheckingSession(false) }
    })
    async function loadSession() {
      try {
        const { data, error: failure } = await demoSupabase!.auth.getSession()
        if (!alive) return
        if (failure) throw failure
        setSession(data.session)
        if (demoAccessRequested && !recoveryRequested) {
          const failedLink = new URLSearchParams(window.location.hash.slice(1)).has("error")
          if (!data.session || failedLink) setError("El enlace de acceso no es válido o venció. Solicita uno nuevo.")
        }
      } catch {
        if (alive) setError("No pudimos verificar tu sesión. Solicita un nuevo enlace de acceso.")
      } finally {
        if (alive) {
          setCheckingSession(false)
          if (demoAccessRequested && !recoveryRequested) {
            const clean = new URL(window.location.href)
            clean.searchParams.delete("demo_access")
            clean.hash = "descargas"
            window.history.replaceState(null, "", clean.pathname + clean.search + clean.hash)
            window.requestAnimationFrame(() => document.getElementById("descargas")?.scrollIntoView())
          }
        }
      }
    }
    void loadSession()
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    setInstaller(null)
    setAccess("checking")
    if (!session || !demoSupabase) return
    let alive = true
    let inFlight = false
    async function check() {
      if (inFlight) return
      inFlight = true
      try {
        const { data, error: failure } = await demoSupabase!.rpc("can_download_demo")
        if (failure) throw failure
        if (!alive) return
        if (data !== true) { setAccess("denied"); setInstaller(null); return }
        const result = await demoSupabase!.from("installers")
          .select("id,version,architecture,size_bytes")
          .eq("is_published", true).eq("platform", "android").eq("source", "storage").limit(1).maybeSingle()
        if (result.error) throw result.error
        if (alive) { setAccess("allowed"); setInstaller(result.data as Version | null) }
      } catch {
        if (alive) { setAccess("error"); setInstaller(null) }
      } finally { inFlight = false }
    }
    void check()
    const timer = window.setInterval(() => void check(), 30000)
    const onFocus = () => void check()
    window.addEventListener("focus", onFocus)
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus) }
  }, [session, reload])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!demoSupabase || busy) return
    setBusy(true); setError(""); setNotice("")
    try {
      // Leave the fragment free for the tokens returned by Supabase Auth.
      const redirect = `${window.location.origin}${window.location.pathname}?demo_access=1`
      const { error: failure } = await demoSupabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: redirect, shouldCreateUser: true },
      })
      if (failure) throw failure
      setNotice("Revisa tu correo y abre el enlace de acceso en este navegador. Revisa también spam. Verificar el correo no autoriza la demo: requiere aprobación del administrador.")
    } catch {
      setError("No pudimos enviar el enlace. Espera unos minutos e intenta de nuevo.")
    } finally { setBusy(false) }
  }

  async function signOut() {
    if (!demoSupabase || busy) return
    setBusy(true); setError(""); setNotice("")
    try {
      const { error: failure } = await demoSupabase.auth.signOut({ scope: "local" })
      if (failure) throw failure
      setSession(null); setInstaller(null)
    } catch { setError("No pudimos cerrar tu sesión. Intenta de nuevo.") }
    finally { setBusy(false) }
  }

  async function download() {
    if (!demoSupabase || !installer || busy) return
    setBusy(true); setError(""); setNotice("")
    try { await downloadInstaller(demoSupabase, installer.id) }
    catch {
      setInstaller(null); setAccess("error")
      setError("No pudimos preparar la descarga. Actualiza tu acceso para comprobar la sesión y la autorización.")
    } finally { setBusy(false) }
  }

  if (!demoSupabase) return <div className="download-access"><p>El acceso a descargas todavía no está disponible.</p><a href="#demo">Solicitar una demo ↗</a></div>
  return (
    <div className="download-access" aria-busy={busy || checkingSession || (!!session && access === "checking")}>
      {checkingSession ? <p role="status">Comprobando sesión…</p> : !session ? <form onSubmit={signIn}>
        <p>La descarga requiere una demo autorizada. Verifica el correo que usaste al solicitarla.</p>
        <label htmlFor="demo-access-email">Correo electrónico</label>
        <input id="demo-access-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} />
        <button className="button button--forest" disabled={busy || !email.trim()} type="submit">{busy ? "Enviando…" : "Recibir enlace de acceso"}</button>
        <a href="#demo">Solicitar una demo ↗</a>
      </form> : <>
        <p className="download-identity">Sesión: {session.user.email}</p>
        {access === "checking" && <p role="status">Comprobando autorización…</p>}
        {access === "denied" && <p>No tienes una demo autorizada vigente para este correo. Solicita una demo o contacta al administrador.</p>}
        {access === "error" && <p role="alert">No pudimos comprobar tu acceso a las descargas.</p>}
        {access === "allowed" && (installer ? <>
          <p className="download-version">v{installer.version} · {installer.architecture} · {fileSize(installer.size_bytes)}</p>
          <button className="button button--forest" type="button" disabled={busy} onClick={() => void download()}>{busy ? "Preparando descarga…" : "Descargar para Android ↓"}</button>
        </> : <p>Tu demo está autorizada. No hay una versión disponible por el momento.</p>)}
        <div className="download-access-actions">
          <button type="button" disabled={busy || access === "checking"} onClick={() => { setError(""); setReload((value) => value + 1) }}>Actualizar acceso</button>
          <button type="button" disabled={busy} onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
        {access === "denied" && <a href="#demo">Solicitar una demo ↗</a>}
      </>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
