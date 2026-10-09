import { useEffect, useState } from "react"
import {
  downloadUrl,
  fileSize,
  initialAndroid,
  supabase,
  type Installer,
} from "../lib/supabase"
import "./downloads.css"
import finanzas from "../assets/finanzas.jpeg"

export default function Downloads() {
  const [installers, setInstallers] = useState<Installer[]>(
    supabase ? [] : [initialAndroid],
  )
  const [loading, setLoading] = useState(!!supabase)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase
      .from("installers")
      .select("*")
      .eq("is_published", true)
      .then(({ data, error }) => {
        if (cancelled) return
        setFailed(!!error)
        setInstallers(error ? [] : data as Installer[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  const installer = installers.find((item) => item.platform === "android")
  return (
    <section
      className="downloads"
      id="descargas"
      aria-labelledby="downloads-title"
    >
      <div className="shell downloads-layout">
        <div className="downloads-copy">
        <p className="section-number section-number--dark">
          05 — Conocimiento a tu alcance
        </p>
        <div className="downloads-heading">
          <h2 id="downloads-title">Ágrifos,<br /><em>donde estés.</em></h2>
          <p>
            Descarga la aplicación para Android y lleva la
            inteligencia al campo.
          </p>
        </div>
        {failed && (
          <p role="alert">
            No pudimos consultar las versiones. Intenta recargar la página.
          </p>
        )}
              <article className="download-card">
                <div className="download-card-heading">
                  <div>
                    <span className="download-platform">Aplicación móvil</span>
                    <h3>Android</h3>
                  </div>
                  <span className="download-format">APK <span aria-hidden="true">↓</span></span>
                </div>
                <p className="download-version">
                  {installer
                    ? `v${installer.version} · ${installer.architecture} · ${fileSize(installer.size_bytes)}`
                    : loading
                      ? "Consultando versiones…"
                      : "Sin versión publicada por el momento."}
                </p>
                {installer && (
                  <a
                    className="button button--forest"
                    href={downloadUrl(installer)}
                    rel="noreferrer"
                  >
                    Descargar para Android
                    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                      <path d="M12 4v13m-5-5 5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </a>
                )}
              </article>
        <p className="download-note">
          Instala únicamente versiones compatibles con tu dispositivo.{" "}
          <a
            href="https://github.com/ferjovel06/agrifos/releases/tag/v1.0.0"
            target="_blank"
            rel="noreferrer"
          >
            Ver publicación original ↗
          </a>
        </p>
        </div>
        <figure className="download-visual">
          <div className="download-visual-heading">
            <span>Del dato a tu parcela</span>
            <span aria-hidden="true">↗</span>
          </div>
          <div className="download-phone">
            <img src={finanzas} alt="Pantalla de Finanzas de Ágrifos para Android: balance, ingresos, gastos y flujo de caja." width="785" height="1600" loading="lazy" />
          </div>
          <figcaption>El conocimiento del campo.<br /><em>Ahora, en tu bolsillo.</em></figcaption>
        </figure>
      </div>
    </section>
  )
}
