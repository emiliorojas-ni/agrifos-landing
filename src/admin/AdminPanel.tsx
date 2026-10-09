import { useEffect, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import {
  downloadUrl,
  extensions,
  fileSize,
  platforms,
  requestStatuses,
  supabase,
  type DemoRecord,
  type Installer,
  type Platform,
  type RequestStatus,
} from "../lib/supabase"
import logo from "../assets/agrifos-logotipo.svg"
import "./admin.css"

function date(value: string) {
  return new Date(value).toLocaleString("es-NI", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function AdminPanel() {
  const recoveryRequested = new URLSearchParams(window.location.search).get("recovery") === "1"
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [denied, setDenied] = useState(false)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [recovery, setRecovery] = useState(recoveryRequested)
  const [forgotPassword, setForgotPassword] = useState(recoveryRequested)
  const [tab, setTab] = useState<"requests" | "installers">("requests")
  const [requests, setRequests] = useState<DemoRecord[]>([])
  const [total, setTotal] = useState(0)
  const [installers, setInstallers] = useState<Installer[]>([])
  const [selected, setSelected] = useState<DemoRecord | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("")
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      return
    }
    let alive = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return
      if (error)
        setNotice(
          "No pudimos comprobar la sesión. Intenta iniciar sesión de nuevo.",
        )
      setSession(data.session)
      if (!data.session) setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true)
      setSession(next)
      if (!next) {
        setAllowed(false)
        setChecking(false)
        setRequests([])
        setInstallers([])
        setSelected(null)
      }
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session || !supabase) return
    let alive = true
    setChecking(true)
    setAllowed(false)
    setDenied(false)
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (!alive) return
      setAllowed(!error && data === true)
      setDenied(!!error || data !== true)
      setChecking(false)
    })
    return () => {
      alive = false
    }
  }, [session?.user.id])

  useEffect(() => {
    if (!allowed || !supabase || recovery) return
    let alive = true
    setLoadingData(true)
    const timer = window.setTimeout(async () => {
      try {
        const client = supabase!
        const [requestResult, fileResult] = await Promise.all([
          client.rpc("list_demo_requests", {
            p_search: search.trim(),
            p_status: filter,
            p_page: page,
          }),
          client
            .from("installers")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
        ])
        if (!alive) return
        if (requestResult.error || fileResult.error)
          throw new Error("Query failed")
        setRequests(requestResult.data.items)
        setTotal(requestResult.data.total)
        setInstallers(fileResult.data as Installer[])
      } catch {
        if (alive) {
          setRequests([])
          setInstallers([])
          setNotice(
            "No pudimos cargar los datos. Usa Actualizar para reintentar.",
          )
        }
      } finally {
        if (alive) setLoadingData(false)
      }
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [allowed, recovery, search, filter, page, reload])

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setNotice("")
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        String(values.get("email")).trim(),
        { redirectTo: `${window.location.origin}${window.location.pathname}?recovery=1` },
      )
      if (error) throw error
      setNotice("Si el correo tiene una cuenta, recibirás un enlace para elegir tu nueva contraseña. Revisa también spam.")
    } catch {
      setNotice("No pudimos enviar el enlace. Espera unos minutos e intenta de nuevo.")
    } finally {
      setBusy(false)
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy || !session) return
    const form = event.currentTarget
    const values = new FormData(form)
    const password = String(values.get("password"))
    if (password.length < 12 || password !== values.get("confirmation")) {
      setNotice("Usa al menos 12 caracteres y escribe la misma contraseña en ambos campos.")
      return
    }
    setBusy(true)
    setNotice("")
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      form.reset()
      window.history.replaceState(null, "", `${window.location.pathname}#/admin`)
      setRecovery(false)
      setForgotPassword(false)
      setNotice("Contraseña actualizada. Usa la nueva contraseña también en la aplicación Ágrifos.")
    } catch {
      setNotice("No pudimos cambiar la contraseña. Usa una contraseña diferente o solicita un enlace nuevo.")
    } finally {
      setBusy(false)
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setNotice("")
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(values.get("email")).trim(),
        password: String(values.get("password")),
      })
      if (error) throw error
      form.reset()
    } catch {
      setNotice(
        "No pudimos iniciar sesión. Revisa tus credenciales o intenta de nuevo.",
      )
    } finally {
      setBusy(false)
    }
  }
  async function logout() {
    setBusy(true)
    const { error } = await supabase!.auth.signOut({ scope: "local" })
    if (error) setNotice("No pudimos cerrar la sesión. Intenta de nuevo.")
    else {
      setSession(null)
      setAllowed(false)
      setNotice("")
      setDenied(false)
    }
    setBusy(false)
  }
  async function publish(installer: Installer) {
    if (busy) return
    setBusy(true)
    setNotice("")
    try {
      const result = installer.is_published
        ? await supabase!
            .from("installers")
            .update({ is_published: false })
            .eq("id", installer.id)
            .select("id")
            .single()
        : await supabase!.rpc("publish_installer", { p_id: installer.id })
      if (result.error) throw result.error
      setNotice(
        installer.is_published
          ? "Versión retirada de las descargas públicas."
          : "Versión publicada. Reemplaza la descarga anterior de esta plataforma.",
      )
      setReload((value) => value + 1)
    } catch {
      setNotice(
        "No pudimos cambiar la publicación. Revisa tu acceso e intenta de nuevo.",
      )
    } finally {
      setBusy(false)
    }
  }
  async function preview(installer: Installer) {
    if (installer.is_published || installer.source === "github") {
      window.location.assign(downloadUrl(installer))
      return
    }
    const { data, error } = await supabase!.storage
      .from("installers")
      .createSignedUrl(installer.storage_path!, 60)
    if (error) setNotice("No pudimos preparar la descarga privada.")
    else window.location.assign(data.signedUrl)
  }

  const authView = !allowed || recovery
  return (
    <main className={`admin-page${authView ? " admin-page--auth" : ""}`}>
      <header className="admin-header shell">
        <a href="#inicio" aria-label="Ágrifos — volver al sitio">
          <img src={logo} alt="Ágrifos" />
        </a>
        <div>
          <a href="#inicio">Ver sitio ↗</a>
          {session && (
            <button disabled={busy} onClick={logout} type="button">
              Cerrar sesión
            </button>
          )}
        </div>
      </header>
      <div className={`shell admin-content${authView ? " admin-content--auth" : ""}`}>
        <div className="admin-intro">
        <p className="section-number section-number--dark">Gestión del campo</p>
        <h1>Panel <em>administrativo.</em></h1>
        <p className="admin-lead">
          Solicitudes de demostración y versiones de Ágrifos, en un mismo lugar.
        </p>
        {authView && <p className="admin-signature">Ágrifos · Inteligencia para el campo</p>}
        </div>
        <div className="admin-workspace">
        {notice && (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        )}
        {!supabase ? (
          <div className="admin-card">
            <h2>Acceso pendiente de configuración</h2>
            <p>
              El servicio privado todavía no está conectado. Contacta a la
              persona responsable de administrar Ágrifos.
            </p>
            <a href="#inicio">Volver a la landing ↗</a>
          </div>
        ) : checking ? (
          <p role="status">Comprobando acceso…</p>
        ) : recovery && session ? (
          <form className="admin-card admin-login" onSubmit={changePassword}>
            <p className="admin-form-eyebrow">Tu cuenta, a salvo</p>
            <h2>Elige una nueva contraseña</h2>
            <p>Este cambio también se aplica a tu cuenta en la aplicación Ágrifos.</p>
            <label>
              Nueva contraseña
              <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
            </label>
            <label>
              Repite la contraseña
              <input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} required />
            </label>
            <button className="button button--forest" type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Guardar contraseña"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        ) : !session && forgotPassword ? (
          <form className="admin-card admin-login" onSubmit={requestRecovery}>
            <p className="admin-form-eyebrow">Recuperación de acceso</p>
            <h2>Recupera tu acceso</h2>
            <p>Recibirás un enlace para elegir una nueva contraseña. Si tu enlace venció, solicita otro aquí.</p>
            <label>
              Correo electrónico
              <input name="email" type="email" autoComplete="username" maxLength={254} required />
            </label>
            <button className="button button--forest" type="submit" disabled={busy}>
              {busy ? "Enviando…" : "Enviar enlace"}
              <span aria-hidden="true">↗</span>
            </button>
            <button className="admin-text-button" type="button" disabled={busy} onClick={() => {
              window.history.replaceState(null, "", `${window.location.pathname}#/admin`)
              setRecovery(false)
              setForgotPassword(false)
              setNotice("")
            }}>Volver al acceso</button>
          </form>
        ) : !session ? (
          <form className="admin-card admin-login" onSubmit={login}>
            <p className="admin-form-eyebrow">Acceso del equipo</p>
            <h2>Acceso privado</h2>
            <p>Inicia sesión con tu cuenta administrativa.</p>
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
              />
            </label>
            <button
              className="button button--forest"
              disabled={busy}
              type="submit"
            >
              {busy ? "Iniciando sesión…" : "Entrar al panel"}
              <span aria-hidden="true">↗</span>
            </button>
            <button className="admin-text-button" type="button" disabled={busy} onClick={() => {
              setForgotPassword(true)
              setNotice("")
            }}>Olvidé mi contraseña</button>
          </form>
        ) : denied ? (
          <div className="admin-card">
            <h2>Esta cuenta no tiene acceso</h2>
            <p>
              Necesitas una cuenta autorizada para gestionar solicitudes e
              instaladores.
            </p>
            <button
              className="button button--forest"
              onClick={logout}
              disabled={busy}
              type="button"
            >
              Cambiar de cuenta
            </button>
          </div>
        ) : (
          allowed && (
            <>
              <div className="admin-toolbar">
                <div className="admin-tabs" aria-label="Secciones del panel">
                  <button
                    type="button"
                    aria-pressed={tab === "requests"}
                    onClick={() => setTab("requests")}
                  >
                    Solicitudes
                  </button>
                  <button
                    type="button"
                    aria-pressed={tab === "installers"}
                    onClick={() => setTab("installers")}
                  >
                    Instaladores
                  </button>
                </div>
                <button
                  type="button"
                  disabled={loadingData}
                  onClick={() => {
                    setNotice("")
                    setReload((value) => value + 1)
                  }}
                >
                  {loadingData ? "Actualizando…" : "Actualizar ↻"}
                </button>
              </div>
              {tab === "requests" ? (
                <>
                  <div className="admin-filters">
                    <label>
                      Buscar por nombre, correo o finca
                      <input
                        type="search"
                        value={search}
                        maxLength={200}
                        onChange={(event) => {
                          setSearch(event.target.value)
                          setPage(0)
                        }}
                      />
                    </label>
                    <label>
                      Estado
                      <select
                        value={filter}
                        onChange={(event) => {
                          setFilter(event.target.value)
                          setPage(0)
                        }}
                      >
                        <option value="">Todos los estados</option>
                        {Object.entries(requestStatuses).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <div
                    className="admin-card admin-table-card"
                    aria-busy={loadingData}
                  >
                    <h2>
                      Solicitudes de demo <small>{total}</small>
                    </h2>
                    <div className="admin-table-wrap">
                      <table>
                        <caption className="admin-sr-only">
                          Solicitudes recibidas
                        </caption>
                        <thead>
                          <tr>
                            <th>Persona</th>
                            <th>Interés</th>
                            <th>Estado</th>
                            <th>Recibida</th>
                            <th>Gestión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map((request) => (
                            <tr key={request.id}>
                              <td>
                                <strong>{request.name}</strong>
                                <span>{request.email}</span>
                              </td>
                              <td>{request.interest}</td>
                              <td>
                                <span className="admin-badge">
                                  {requestStatuses[request.status]}
                                </span>
                              </td>
                              <td>{date(request.created_at)}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setSelected(request)}
                                >
                                  Ver solicitud
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!loadingData && !requests.length && (
                      <p className="admin-empty">
                        No hay solicitudes con estos filtros.
                      </p>
                    )}
                    <div className="admin-pagination">
                      <button
                        disabled={page === 0 || loadingData}
                        onClick={() => setPage((value) => value - 1)}
                        type="button"
                      >
                        ← Anterior
                      </button>
                      <span>
                        Página {page + 1} de{" "}
                        {Math.max(1, Math.ceil(total / 25))}
                      </span>
                      <button
                        disabled={(page + 1) * 25 >= total || loadingData}
                        onClick={() => setPage((value) => value + 1)}
                        type="button"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                  {selected && (
                    <RequestDetails
                      key={selected.id}
                      request={selected}
                      onClose={() => setSelected(null)}
                      onSave={(updated) => {
                        setSelected(updated)
                        setReload((value) => value + 1)
                        setNotice("Solicitud actualizada.")
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  <InstallerUpload
                    onSaved={() => {
                      setReload((value) => value + 1)
                      setNotice(
                        "Instalador cargado como borrador. Publícalo cuando esté listo.",
                      )
                    }}
                  />
                  <div className="admin-card admin-table-card">
                    <h2>Versiones de la aplicación</h2>
                    <p>
                      Las últimas 100 versiones. Solo una descarga publicada por
                      plataforma.
                    </p>
                    <div className="admin-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Plataforma / versión</th>
                            <th>Archivo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {installers.map((installer) => (
                            <tr key={installer.id}>
                              <td>
                                <strong>
                                  {platforms[installer.platform]} · v
                                  {installer.version}
                                </strong>
                                <span>{installer.architecture}</span>
                              </td>
                              <td>
                                <strong>{installer.file_name}</strong>
                                <span>
                                  {fileSize(installer.size_bytes)} ·{" "}
                                  {installer.source === "github"
                                    ? "GitHub Releases"
                                    : "Archivo cargado"}
                                </span>
                              </td>
                              <td>
                                <span className="admin-badge">
                                  {installer.is_published
                                    ? "Publicada"
                                    : "Borrador"}
                                </span>
                              </td>
                              <td>
                                <div className="admin-actions">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => publish(installer)}
                                  >
                                    {installer.is_published
                                      ? "Retirar publicación"
                                      : "Publicar"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => preview(installer)}
                                  >
                                    Descargar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!loadingData && !installers.length && (
                      <p>No hay instaladores cargados.</p>
                    )}
                  </div>
                </>
              )}
            </>
          )
        )}
        </div>
      </div>
    </main>
  )
}

function RequestDetails({
  request,
  onClose,
  onSave,
}: {
  request: DemoRecord
  onClose: () => void
  onSave: (request: DemoRecord) => void
}) {
  const [status, setStatus] = useState(request.status)
  const [notes, setNotes] = useState(request.notes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      const result = await supabase!
        .from("demo_requests")
        .update({ status, notes })
        .eq("id", request.id)
        .select()
        .single()
      if (result.error) throw result.error
      onSave(result.data as DemoRecord)
    } catch {
      setError("No pudimos guardar los cambios. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }
  return (
    <section
      className="admin-card admin-detail"
      aria-labelledby="request-detail-title"
    >
      <div className="admin-toolbar">
        <h2 id="request-detail-title">{request.name}</h2>
        <button disabled={saving} type="button" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
      <dl>
        <dt>Correo</dt>
        <dd>
          <a href={`mailto:${request.email}`}>{request.email}</a>
        </dd>
        <dt>Teléfono</dt>
        <dd>{request.phone || "No indicado"}</dd>
        <dt>Finca u organización</dt>
        <dd>{request.organization || "No indicada"}</dd>
        <dt>Interés</dt>
        <dd>{request.interest}</dd>
        <dt>Mensaje</dt>
        <dd className="admin-message">
          {request.message || "Sin mensaje adicional"}
        </dd>
      </dl>
      <form onSubmit={save}>
        <label>
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as RequestStatus)}
          >
            {Object.entries(requestStatuses).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notas internas
          <textarea
            value={notes}
            maxLength={5000}
            rows={4}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button
          type="submit"
          className="button button--forest"
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </section>
  )
}

function InstallerUpload({ onSaved }: { onSaved: () => void }) {
  const platform: Platform = "android"
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [fileKey, setFileKey] = useState(0)
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get("file") as File
    if (
      !file.size ||
      file.size > 50 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith(extensions[platform])
    ) {
      setError(
        "Selecciona un archivo APK válido de hasta 50 MB.",
      )
      return
    }
    const version = String(data.get("version")).trim()
    if (!/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(version)) {
      setError("Usa una versión como 1.0.0 o 1.1.0-beta.")
      return
    }
    setSaving(true)
    setError("")
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/\.\./g, "-")
      .slice(-160)
    const path = `${platform}/${crypto.randomUUID()}/${safeName}`
    let stored = false
    try {
      const storage = await supabase!.storage
        .from("installers")
        .upload(path, file, {
          contentType: "application/octet-stream",
          upsert: false,
        })
      if (storage.error) throw storage.error
      stored = true
      const record = await supabase!
        .from("installers")
        .insert({
          platform,
          version,
          architecture: String(data.get("architecture")),
          file_name: file.name,
          size_bytes: file.size,
          storage_path: path,
          source: "storage",
          is_published: false,
        })
      if (record.error) throw record.error
      form.reset()
      setFileKey((value) => value + 1)
      onSaved()
    } catch {
      if (stored)
        await supabase!.storage
          .from("installers")
          .remove([path])
          .catch(() => undefined)
      setError(
        "No pudimos guardar el instalador. Revisa el límite de almacenamiento e intenta de nuevo.",
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <form className="admin-card" onSubmit={upload}>
      <h2>Cargar un instalador</h2>
      <p>
        Se guarda como borrador. Publicarlo sustituye la descarga actual de esa
        plataforma.
      </p>
      <fieldset disabled={saving}>
        <legend className="admin-sr-only">Datos de la versión</legend>
        <div className="admin-upload-grid">
          <label>
            Plataforma
            <input value="Android" readOnly />
          </label>
          <label>
            Versión
            <input name="version" placeholder="1.0.0" required maxLength={64} />
          </label>
          <label>
            Arquitectura
            <select name="architecture">
              <option>ARM64</option>
              <option>ARM32</option>
              <option>Universal</option>
            </select>
          </label>
          <label>
            Instalador {extensions[platform].toUpperCase()}
            <input
              key={fileKey}
              type="file"
              name="file"
              accept={extensions[platform]}
              required
            />
          </label>
        </div>
        <p className="admin-help">
          Hasta 50 MB. Usa
          compilaciones verificadas de la aplicación.
        </p>
        {error && <p role="alert">{error}</p>}
        <button
          className="button button--forest"
          type="submit"
          disabled={saving}
        >
          {saving ? "Subiendo instalador…" : "Cargar borrador"}
          <span aria-hidden="true">↑</span>
        </button>
      </fieldset>
    </form>
  )
}
