import { useRef, useState, type FormEvent } from "react"
import "./demo-request.css"
import { supabase, turnstileSiteKey } from "../lib/supabase"
import Turnstile from "./Turnstile"

const contactEmail = "agrifos.app@gmail.com"
const demoEndpoint = `https://formsubmit.co/ajax/${contactEmail}`

export default function DemoRequest() {
  const [status, setStatus] =
    useState<"idle" | "sending" | "success" | "error">("idle")
  const inFlight = useRef(false)
  const confirmation = useRef<HTMLDivElement>(null)
  const [verification, setVerification] = useState("")
  const [verificationKey, setVerificationKey] = useState(0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const name = form.elements.namedItem("name") as HTMLInputElement
    if (!name.value.trim()) {
      name.setCustomValidity("Escribe tu nombre completo.")
      name.reportValidity()
      return
    }
    // The service silently ignores honeypot submissions; don't claim success.
    if (data.get("_honey")) return

    inFlight.current = true
    setStatus("sending")
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20000)

    try {
      if (supabase) {
        if (turnstileSiteKey && !verification)
          throw new Error("Verification required")
        const { data: result, error } = await supabase.functions.invoke(
          "submit-demo",
          {
            body: {
              name: String(data.get("name")).trim(),
              email: String(data.get("email")).trim(),
              organization: String(data.get("organization") || "").trim(),
              phone: String(data.get("phone") || "").trim(),
              interest: data.get("interest"),
              message: String(data.get("message") || "").trim(),
              consent: data.get("consent") === "on",
              token: verification,
              website: String(data.get("_honey") || ""),
            },
            signal: controller.signal,
          },
        )
        if (error || result?.success !== true)
          throw new Error("Submission not confirmed")
      } else {
        const response = await fetch(demoEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            name: String(data.get("name")).trim(),
            email: String(data.get("email")).trim(),
            "Finca u organización": String(
              data.get("organization") || "",
            ).trim(),
            Teléfono: String(data.get("phone") || "").trim(),
            "Tema de interés": data.get("interest"),
            message: String(data.get("message") || "").trim(),
            "Autorización de contacto":
              "Sí, para coordinar una demostración de Ágrifos",
            _subject: "Ágrifos — Nueva solicitud de demo",
            _template: "table",
            _honey: "",
          }),
        })
        const result: {
          success?: boolean | string
          message?: string
        } = await response.json()
        if (
          !response.ok ||
          (result.success !== true && result.success !== "true") ||
          /activat|confirm your email/i.test(result.message || "")
        ) {
          throw new Error("Submission not confirmed")
        }
      }
      form.reset()
      setStatus("success")
      // Focus the confirmation after React has committed the new view.
      window.requestAnimationFrame(() => confirmation.current?.focus())
    } catch {
      setStatus("error")
    } finally {
      window.clearTimeout(timeout)
      inFlight.current = false
      setVerification("")
      setVerificationKey((key) => key + 1)
    }
  }

  return (
    <section className="demo-request" id="demo" aria-labelledby="demo-title">
      <div className="shell demo-grid">
        <div className="demo-intro" data-reveal="up">
          <p className="section-number section-number--dark">
            06 — Del dato a tu parcela
          </p>
          <h2 id="demo-title">
            Ve el campo con <em>otra mirada.</em>
          </h2>
          <p className="demo-lead">
            Conoce Ágrifos en una demostración y descubre cómo conectar las
            señales de tu cultivo con decisiones más precisas.
          </p>
          <ol className="demo-steps">
            <li>
              <span>01</span>
              <div>
                <strong>Cuéntanos sobre tu realidad</strong>
                <p>Tu cultivo, tus retos y lo que te gustaría conocer.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Coordinemos una demostración</strong>
                <p>
                  Te contactaremos para encontrar un momento para conversar.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Exploremos la solución</strong>
                <p>
                  Lecturas del suelo, seguimiento del cultivo y conocimiento
                  útil.
                </p>
              </div>
            </li>
          </ol>
          <p className="demo-direct">
            ¿Prefieres escribirnos?{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        </div>

        <div className="demo-card" data-reveal="up">
          {status === "success" ? (
            <div
              className="demo-confirmation"
              ref={confirmation}
              tabIndex={-1}
              role="status"
            >
              <span className="demo-confirmation-mark" aria-hidden="true">
                ✓
              </span>
              <p className="demo-card-eyebrow">El primer paso está dado</p>
              <h3>Gracias por acercarte al campo.</h3>
              <p>
                Tu solicitud fue enviada. Te contactaremos al correo que nos
                compartiste para coordinar la demostración.
              </p>
              <button
                className="button button--forest"
                type="button"
                onClick={() => setStatus("idle")}
              >
                Enviar otra solicitud <span aria-hidden="true">↗</span>
              </button>
            </div>
          ) : (
            <form
              className="demo-form"
              onSubmit={handleSubmit}
              aria-labelledby="demo-form-title"
              aria-busy={status === "sending"}
            >
              <div className="demo-form-heading">
                <p className="demo-card-eyebrow">Conversemos</p>
                <h3 id="demo-form-title">Solicita tu demo</h3>
                <p>
                  Los campos con <span aria-hidden="true">*</span> son
                  obligatorios.
                </p>
              </div>
              <fieldset disabled={status === "sending"}>
                <legend className="demo-sr-only">
                  Datos para coordinar tu demostración
                </legend>
                <div className="demo-fields">
                  <label htmlFor="demo-name">
                    Nombre completo <span aria-hidden="true">*</span>
                    <input
                      id="demo-name"
                      name="name"
                      autoComplete="name"
                      placeholder="Tu nombre y apellido"
                      required
                      maxLength={120}
                      onInput={(event) =>
                        event.currentTarget.setCustomValidity("")
                      }
                    />
                  </label>
                  <label htmlFor="demo-email">
                    Correo electrónico <span aria-hidden="true">*</span>
                    <input
                      id="demo-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nombre@ejemplo.com"
                      required
                      maxLength={254}
                    />
                  </label>
                  <label htmlFor="demo-organization">
                    Finca u organización <small>Opcional</small>
                    <input
                      id="demo-organization"
                      name="organization"
                      autoComplete="organization"
                      placeholder="Nombre de tu finca o equipo"
                      maxLength={160}
                    />
                  </label>
                  <label htmlFor="demo-phone">
                    Teléfono <small>Opcional</small>
                    <input
                      id="demo-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Incluye el código de país"
                      maxLength={40}
                    />
                  </label>
                  <label className="demo-field-full" htmlFor="demo-interest">
                    ¿Qué te gustaría conocer? <span aria-hidden="true">*</span>
                    <select
                      id="demo-interest"
                      name="interest"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecciona un tema de interés
                      </option>
                      <option>Monitoreo del suelo</option>
                      <option>Seguimiento del cultivo</option>
                      <option>Recomendaciones para tomar decisiones</option>
                    </select>
                  </label>
                  <label className="demo-field-full" htmlFor="demo-message">
                    Cuéntanos un poco más <small>Opcional</small>
                    <textarea
                      id="demo-message"
                      name="message"
                      rows={3}
                      maxLength={1500}
                      placeholder="¿Qué cultivas o qué reto te gustaría resolver?"
                    />
                  </label>
                </div>
                <div className="demo-honeypot" aria-hidden="true">
                  <label htmlFor="demo-website">Deja este campo vacío</label>
                  <input
                    id="demo-website"
                    name="_honey"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                <label className="demo-consent" htmlFor="demo-consent">
                  <input
                    id="demo-consent"
                    name="consent"
                    type="checkbox"
                    required
                  />
                  <span>
                    Acepto que Ágrifos me contacte para coordinar la
                    demostración.
                  </span>
                </label>
                {status === "error" && (
                  <p className="demo-error" role="alert">
                    No pudimos confirmar el envío. Tus datos siguen aquí:
                    intenta de nuevo o escríbenos a{" "}
                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                  </p>
                )}
                {supabase && turnstileSiteKey && (
                  <Turnstile key={verificationKey} onToken={setVerification} />
                )}
                <button
                  className="button button--forest demo-submit"
                  type="submit"
                  disabled={!!supabase && !!turnstileSiteKey && !verification}
                >
                  {status === "sending"
                    ? "Enviando solicitud…"
                    : "Solicitar demostración"}
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M7 17 17 7M8 7h9v9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </button>
              </fieldset>
              <p className="demo-form-note">
                Usaremos estos datos para responder a tu solicitud.{" "}
                {supabase ? (
                  "Tu solicitud será gestionada por el equipo de Ágrifos."
                ) : (
                  <>
                    El envío se procesa mediante{" "}
                    <a
                      href="https://formsubmit.co/privacy.pdf"
                      target="_blank"
                      rel="noreferrer"
                    >
                      FormSubmit
                    </a>
                    .
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
