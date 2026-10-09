import { useEffect, useState } from "react"
import {
  downloadUrl,
  fileSize,
  initialAndroid,
  platforms,
  supabase,
  type Installer,
  type Platform,
} from "../lib/supabase"
import "./downloads.css"

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
  return (
    <section
      className="downloads"
      id="descargas"
      aria-labelledby="downloads-title"
    >
      <div className="shell">
        <p className="section-number section-number--dark">
          05 — Conocimiento a tu alcance
        </p>
        <div className="downloads-heading">
          <h2 id="downloads-title">Ágrifos, donde estés.</h2>
          <p>
            Encuentra la versión disponible para tu dispositivo y lleva la
            inteligencia al campo.
          </p>
        </div>
        {failed && (
          <p role="alert">
            No pudimos consultar las versiones. Intenta recargar la página.
          </p>
        )}
        <div className="download-grid">
          {(Object.keys(platforms) as Platform[]).map((platform) => {
            const installer = installers.find(
              (item) => item.platform === platform,
            )
            return (
              <article className="download-card" key={platform}>
                <span className="download-platform">
                  {platform === "android"
                    ? "APK"
                    : platform === "macos"
                      ? "DMG"
                      : "EXE"}
                </span>
                <h3>{platforms[platform]}</h3>
                <p>
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
                    Descargar {platforms[platform]}{" "}
                    <span aria-hidden="true">↓</span>
                  </a>
                )}
              </article>
            )
          })}
        </div>
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
    </section>
  )
}
