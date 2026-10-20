import DemoDownloadAccess from "./DemoDownloadAccess"
import "./downloads.css"
import finanzas from "../assets/finanzas.jpeg"
import logo from "../assets/agrifos-logotipo.svg"

export default function DownloadPage() {
  return (
    <main className="download-page">
      <header className="download-page-header shell">
        <a href="#inicio" aria-label="Ágrifos — inicio">
          <img src={logo} alt="Ágrifos" />
        </a>
        <a href="#inicio">Volver al sitio ↗</a>
      </header>
      <section
        className="downloads"
        id="descargas"
        aria-labelledby="downloads-title"
      >
        <div className="shell downloads-layout">
          <div className="downloads-copy">
            <p className="section-number section-number--dark">
              Acceso a tu demo
            </p>
            <div className="downloads-heading">
              <h1 id="downloads-title">
                Tu demo
                <br />
                <em>de Ágrifos.</em>
              </h1>
              <p>
                Aquí puedes descargar la aplicación para Android cuando tu demo
                esté autorizada y tu correo verificado.
              </p>
            </div>
            <article className="download-card">
              <div className="download-card-heading">
                <div>
                  <span className="download-platform">Aplicación móvil</span>
                  <h3>Android</h3>
                </div>
                <span className="download-format">
                  APK <span aria-hidden="true">↓</span>
                </span>
              </div>
              <DemoDownloadAccess />
            </article>
            <p className="download-note">
              Instala únicamente versiones compatibles con tu dispositivo.
            </p>
          </div>
          <figure className="download-visual">
            <div className="download-visual-heading">
              <span>Del dato a tu parcela</span>
              <span aria-hidden="true">↗</span>
            </div>
            <div className="download-phone">
              <img
                src={finanzas}
                alt="Pantalla de Finanzas de Ágrifos para Android: balance, ingresos, gastos y flujo de caja."
                width="785"
                height="1600"
                loading="lazy"
              />
            </div>
            <figcaption>
              El conocimiento del campo.
              <br />
              <em>Ahora, en tu bolsillo.</em>
            </figcaption>
          </figure>
        </div>
      </section>
    </main>
  )
}
