import logotipo from "./assets/agrifos-logotipo.svg"
import isotipo from "./assets/agrifos-isotipo.svg"
import panelGeneral from "./assets/panel-general.png"
import { useEffect, useState, type CSSProperties } from "react"

const ArrowUpRight = ({ className = "" }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

const FieldMark = () => (
  <img className="field-mark" src={isotipo} alt="" aria-hidden="true" />
)

const Brand = ({ light = false }: { light?: boolean }) => (
  <a className={`brand ${light ? "brand--light" : ""}`} href="#inicio" aria-label="Ágrifos — inicio">
    <img className="brand-isotype" src={isotipo} alt="" aria-hidden="true" />
    <img className="brand-logo" src={logotipo} alt="Ágrifos" />
  </a>
)

const HeroVisual = () => (
  <div className="hero-visual">
    <figure className="hero-photo">
      <img
        alt="Agricultores trabajando juntos en un cultivo"
        src="https://images.unsplash.com/photo-1760549255949-767d18981890?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200"
      />
      <figcaption>
        <span>Territorio / 12.4370° N</span>
        <a
          href="https://unsplash.com/@abrahamnoah"
          target="_blank"
          rel="noreferrer"
        >
          Foto: Mizanudin
        </a>
      </figcaption>
    </figure>
    <figure className="hero-detail-photo">
      <img
        alt="Frutos de café sostenidos por una mano"
        src="https://images.unsplash.com/photo-1670758611084-e216510c5433?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=700"
      />
      <figcaption>
        <a
          href="https://unsplash.com/@dagerotip"
          target="_blank"
          rel="noreferrer"
        >
          Foto: George Dagerotip
        </a>
      </figcaption>
    </figure>
    <div className="phone" aria-label="Vista previa de la aplicación Ágrifos">
      <div className="phone-frame">
        <div className="phone-speaker" />
        <div className="phone-screen phone-screen--capture">
          <img className="phone-interface" src={panelGeneral} alt="Panel General de Ágrifos: condiciones actuales, lluvia prevista y última lectura global del suelo" width="738" height="1600" />
        </div>
      </div>
      <span className="phone-tag">Monitoreo en tiempo real</span>
    </div>
    <div className="hero-reading">
      <span className="reading-pulse" />
      <div>
        <small>Lectura activa</small>
        <strong>Suelo estable</strong>
      </div>
      <span>84%</span>
    </div>
  </div>
)

const DataGlyph = ({ variant }: { variant: number }) => {
  if (variant === 1) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 64 64">
        <path d="M7 26h50M7 39h50M7 52h50" />
        <path d="M32 56V20m0 18-9-8m9 17 10-9M32 27c-8-2-13-7-14-14 8 0 13 4 14 14Zm0-5c3-8 8-12 15-12 0 8-5 13-15 16" />
        <circle className="glyph-accent" cx="49" cy="33" r="4" />
      </svg>
    )
  }

  if (variant === 2) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 64 64">
        <path d="M32 6c10 13 16 22 16 31a16 16 0 0 1-32 0c0-9 6-18 16-31Z" />
        <path d="M12 55c13-5 27-5 40 0M17 60c10-3 20-3 30 0M25 39c1 5 4 8 9 9" />
        <circle className="glyph-accent" cx="45" cy="23" r="4" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 64 64">
      <path d="M32 57V23M32 43c-12-2-19-8-21-19 12-1 20 5 21 19ZM32 34c4-13 11-20 22-21 0 12-7 20-22 21Z" />
      <path d="M15 53c10-4 21-6 34-3M19 59c9-3 18-4 27-2" />
      <circle className="glyph-accent" cx="32" cy="12" r="4" />
    </svg>
  )
}

const pillars = [
  {
    number: "01",
    title: "Precisión analítica",
    text: "Convertimos información compleja en criterios claros para actuar con oportunidad y fundamento.",
  },
  {
    number: "02",
    title: "Confiabilidad técnica",
    text: "Combinamos rigor metodológico y conocimiento agronómico en cada recomendación.",
  },
  {
    number: "03",
    title: "Cercanía empática",
    text: "Escuchamos el campo, comprendemos su contexto y acompañamos decisiones que perduran.",
  },
]

const stories = [
  {
    kicker: "Lectura del suelo",
    title: "La precisión empieza debajo de nuestros pies.",
    text: "Interpretamos humedad, estructura y comportamiento del suelo para recomendar acciones oportunas, no recetas genéricas.",
    metric: "84%",
    metricLabel: "estabilidad observada",
    image:
      "https://images.unsplash.com/photo-1492496913980-501348b61469?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Agricultor sosteniendo tierra fértil entre sus manos",
    credit: "Gabriel Jimenez",
    creditUrl: "https://unsplash.com/@gabrielj_photography",
  },
  {
    kicker: "Cosecha consciente",
    title: "Cada decisión se refleja en lo que cultivamos.",
    text: "Acompañamos el ciclo productivo con información que conecta calidad, eficiencia y respeto por los ritmos naturales.",
    metric: "27%",
    metricLabel: "mejor uso de recursos",
    image:
      "https://images.unsplash.com/photo-1746623691157-c4c7a3bad0c4?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Cosecha manual de frutos de café maduros",
    credit: "Luba Glazunova",
    creditUrl: "https://unsplash.com/@l_glazunova",
  },
  {
    kicker: "Regeneración activa",
    title: "Producir mejor también significa devolver vida.",
    text: "Traducimos indicadores ambientales en prácticas regenerativas que fortalecen la parcela y su capacidad de futuro.",
    metric: "360°",
    metricLabel: "visión del ecosistema",
    image:
      "https://images.unsplash.com/photo-1597868165956-03a6827955b1?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Manos plantando una nueva planta en suelo oscuro",
    credit: "Jonathan Kemper",
    creditUrl: "https://unsplash.com/@jupp",
  },
]

const cropStages = [
  { label: "Suelo", value: "Preparado" },
  { label: "Siembra", value: "Trazada" },
  { label: "Cultivo", value: "Monitoreado" },
]

const territoryReadings = [
  {
    label: "Índice vegetal",
    value: "+0.18",
    status: "Zona saludable",
    className: "map-point--one",
  },
  {
    label: "Humedad",
    value: "72%",
    status: "Nivel óptimo",
    className: "map-point--two",
  },
  {
    label: "Vigor del lote",
    value: "84%",
    status: "Crecimiento estable",
    className: "map-point--three",
  },
]

const StoriesCarousel = () => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return

    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % stories.length)
    }, 6500)

    return () => window.clearInterval(interval)
  }, [paused])

  const goTo = (index: number) => {
    setActive((index + stories.length) % stories.length)
  }

  const story = stories[active]

  return (
    <section className="stories" id="historias" aria-labelledby="stories-title">
      <div className="shell">
        <div className="stories-heading" data-reveal="up">
          <div>
            <p className="section-number">03 — Historias del campo</p>
            <h2 id="stories-title">Datos que se convierten en acción.</h2>
          </div>
          <p>
            Un recorrido por las señales que observamos y las decisiones que
            ayudamos a construir.
          </p>
        </div>

        <div
          className="carousel"
          data-reveal="up"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="carousel-stage" aria-live="polite">
            <figure className="carousel-image" key={story.image}>
              <img alt={story.alt} src={story.image} />
              <figcaption>
                <span>
                  0{active + 1} / 0{stories.length}
                </span>
                <a href={story.creditUrl} target="_blank" rel="noreferrer">
                  Foto: {story.credit}
                </a>
              </figcaption>
            </figure>
            <article className="carousel-content" key={story.title}>
              <p className="carousel-kicker">{story.kicker}</p>
              <h3>{story.title}</h3>
              <p className="carousel-text">{story.text}</p>
              <div className="carousel-metric">
                <strong>{story.metric}</strong>
                <span>{story.metricLabel}</span>
              </div>
            </article>
            <div className="carousel-controls">
              <button
                aria-label="Historia anterior"
                onClick={() => goTo(active - 1)}
                type="button"
              >
                ←
              </button>
              <div className="carousel-dots">
                {stories.map((item, index) => (
                  <button
                    aria-label={`Ver ${item.kicker}`}
                    aria-current={index === active ? "true" : undefined}
                    key={item.kicker}
                    onClick={() => goTo(index)}
                    type="button"
                  >
                    <span />
                  </button>
                ))}
              </div>
              <button
                aria-label="Siguiente historia"
                onClick={() => goTo(active + 1)}
                type="button"
              >
                →
              </button>
            </div>
          </div>

          <div className="carousel-previews">
            {stories.map((item, index) => (
              <button
                aria-current={index === active ? "true" : undefined}
                className="preview-card"
                key={item.kicker}
                onClick={() => goTo(index)}
                type="button"
              >
                <img alt="" src={item.image} />
                <span>0{index + 1}</span>
                <strong>{item.kicker}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [activeObject, setActiveObject] = useState(0)
  const [activeReading, setActiveReading] = useState(0)

  useEffect(() => {
    const root = document.documentElement
    const revealItems = document.querySelectorAll<HTMLElement>("[data-reveal]")
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"))
      return
    }

    root.classList.add("reveal-ready")

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    )

    revealItems.forEach((item) => observer.observe(item))

    const updateProgress = () => {
      const distance =
        document.documentElement.scrollHeight - window.innerHeight
      const progress = distance > 0 ? window.scrollY / distance : 0
      root.style.setProperty("--scroll-progress", `${progress}`)
    }

    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", updateProgress)
      root.classList.remove("reveal-ready")
      root.style.removeProperty("--scroll-progress")
    }
  }, [])

  return (
    <main id="inicio">
      <header className="site-header">
        <span className="scroll-progress" aria-hidden="true" />
        <div className="shell nav-shell">
          <Brand />
          <nav aria-label="Navegación principal">
            <a href="#proposito">Propósito</a>
            <a href="#pilares">Nuestros pilares</a>
            <a href="#historias">Historias</a>
          </nav>
          <a className="button button--forest button--small" href="#contacto">
            Hablemos
            <ArrowUpRight />
          </a>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-word" aria-hidden="true">
          ÁGRIFOS
        </div>
        <svg
          className="hero-contours"
          aria-hidden="true"
          fill="none"
          viewBox="0 0 500 850"
        >
          <path d="M492 58C331 21 176 100 163 226S308 397 242 512 54 616 9 837" />
          <path d="M510 101C358 62 219 128 208 237s137 157 77 267S94 639 59 850" />
          <path d="M520 150C390 108 269 159 257 250s124 143 73 246S146 663 116 850" />
        </svg>
        <div className="shell hero-grid">
          <div className="hero-copy" data-reveal="left">
            <div className="eyebrow">
              <span>Inteligencia para el campo</span>
              <span className="eyebrow-line" />
            </div>
            <h1 id="hero-title">
              Transformamos los datos agrícolas en <em>conocimiento útil.</em>
            </h1>
            <p>
              Somos el puente entre la experiencia que nace de la tierra y la
              tecnología que permite verla con mayor precisión.
            </p>
            <div className="hero-actions">
              <a className="button button--ochre" href="#proposito">
                Conoce más
                <ArrowUpRight />
              </a>
              <span>Decisiones con raíz y dirección.</span>
            </div>
          </div>
          <div className="hero-visual-wrap" data-reveal="right">
            <HeroVisual />
          </div>
        </div>
        <div className="hero-index" aria-hidden="true">
          <span>Campo</span>
          <span>Datos</span>
          <span>Futuro</span>
        </div>
      </section>

      <div
        className="signal-strip"
        aria-label="Indicadores de asistencia agrícola"
      >
        <div className="signal-track">
          {[0, 1].map((group) => (
            <div aria-hidden={group === 1} className="signal-group" key={group}>
              <span>Suelo vivo</span>
              <i />
              <strong>Humedad 72%</strong>
              <i />
              <span>Decisiones precisas</span>
              <i />
              <strong>pH 6.4</strong>
              <i />
              <span>Agricultura regenerativa</span>
              <i />
              <strong>León — Nicaragua</strong>
              <i />
            </div>
          ))}
        </div>
      </div>

      <section
        className="purpose"
        id="proposito"
        aria-labelledby="purpose-title"
      >
        <div className="shell purpose-grid">
          <div className="purpose-intro" data-reveal="left">
            <p className="section-number">01 — Nuestro ADN</p>
            <h2 id="purpose-title">
              Cultivamos decisiones que respetan el origen y mejoran el futuro.
            </h2>
            <figure className="purpose-image">
              <img
                alt="Manos trabajando con una nueva planta en el suelo"
                src="https://images.unsplash.com/photo-1590682680695-43b964a3ae17?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200"
              />
              <figcaption>
                <span>El suelo es memoria</span>
                <a
                  href="https://unsplash.com/@greenforce_staffing"
                  target="_blank"
                  rel="noreferrer"
                >
                  Foto: GreenForce Staffing
                </a>
              </figcaption>
            </figure>
          </div>
          <div className="purpose-content" data-reveal="right">
            <p className="purpose-lead">
              Nuestra misión es facilitar decisiones precisas y promover una
              agricultura regenerativa.
            </p>
            <p>
              Integramos datos, observación y experiencia local para que cada
              decisión productiva también contribuya a la salud del suelo, la
              eficiencia de los recursos y la resiliencia de los territorios.
            </p>
            <div className="purpose-facts">
              <div>
                <span>Mirada</span>
                <strong>Integral</strong>
              </div>
              <div>
                <span>Compromiso</span>
                <strong>Regenerativo</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="shell field-objects-heading" data-reveal="up">
          <div>
            <span>Un sistema, cuatro miradas</span>
            <p>Las capas de nuestro ADN</p>
          </div>
          <div className="dna-heading-side">
            <span>
              Selecciona una capa para descubrir cómo conectamos tecnología,
              cultivo, experiencia y resultado.
            </span>
            <div className="dna-sequence" aria-label="Capas del sistema">
              {["Tecnología", "Cultivo", "Experiencia", "Resultado"].map(
                (label, index) => (
                  <button
                    aria-label={`Mostrar capa: ${label}`}
                    aria-pressed={activeObject === index}
                    key={label}
                    onClick={() => setActiveObject(index)}
                    type="button"
                  >
                    <i />
                    <small>0{index + 1}</small>
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
        <div className="shell field-objects" data-reveal="up">
          <article
            className={`object-card object-card--sensor ${
              activeObject === 0 ? "is-expanded" : ""
            }`}
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest("a, button")) {
                setActiveObject(activeObject === 0 ? -1 : 0)
              }
            }}
          >
            <div className="sensor-scene" aria-hidden="true">
              <span className="sensor-antenna" />
              <div className="sensor-device">
                <span className="sensor-brand"><FieldMark /></span>
                <div className="sensor-display">
                  <small>Suelo</small>
                  <strong>72%</strong>
                  <i />
                </div>
                <span className="sensor-port" />
              </div>
              <span className="sensor-probe sensor-probe--one" />
              <span className="sensor-probe sensor-probe--two" />
            </div>
            <div className="object-signal object-signal--live">
              <i />
              <span>En línea</span>
              <strong>03 señales</strong>
            </div>
            <div className="object-copy">
              <span>01 / Tecnología</span>
              <div className="object-title">
                <strong>Sensor multiparamétrico</strong>
                <button
                  aria-expanded={activeObject === 0}
                  aria-label="Ver más sobre el sensor multiparamétrico"
                  onClick={() => setActiveObject(activeObject === 0 ? -1 : 0)}
                  type="button"
                >
                  <i />
                </button>
              </div>
              <small>Humedad · pH · Temperatura</small>
              <p className="object-detail">
                Captura señales del suelo en tiempo real para detectar cambios
                antes de que sean visibles en el cultivo.
              </p>
            </div>
          </article>

          <article
            className={`object-card ${activeObject === 1 ? "is-expanded" : ""}`}
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest("a, button")) {
                setActiveObject(activeObject === 1 ? -1 : 1)
              }
            }}
          >
            <figure>
              <img
                alt="Frutos maduros creciendo en una planta de café"
                src="https://images.unsplash.com/photo-1612668196612-70262cad2ad7?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"
              />
              <figcaption>
                <a
                  href="https://unsplash.com/@juliebaa"
                  target="_blank"
                  rel="noreferrer"
                >
                  Juliana Barquero
                </a>
              </figcaption>
            </figure>
            <div className="object-signal">
              <span>Etapa actual</span>
              <strong>04 / 07</strong>
            </div>
            <div className="object-copy">
              <span>02 / Cultivo</span>
              <div className="object-title">
                <strong>Plantas productoras</strong>
                <button
                  aria-expanded={activeObject === 1}
                  aria-label="Ver más sobre plantas productoras"
                  onClick={() => setActiveObject(activeObject === 1 ? -1 : 1)}
                  type="button"
                >
                  <i />
                </button>
              </div>
              <small>Seguimiento por etapa fenológica</small>
              <p className="object-detail">
                Leemos el comportamiento de cada etapa para anticipar
                necesidades y acompañar un desarrollo más uniforme.
              </p>
            </div>
          </article>

          <article
            className={`object-card ${activeObject === 2 ? "is-expanded" : ""}`}
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest("a, button")) {
                setActiveObject(activeObject === 2 ? -1 : 2)
              }
            }}
          >
            <figure>
              <img
                alt="Agricultora entre plantas de una finca de café"
                src="https://images.unsplash.com/photo-1597816760638-406d7271105c?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"
              />
              <figcaption>
                <a
                  href="https://unsplash.com/@delightindee"
                  target="_blank"
                  rel="noreferrer"
                >
                  Delightin Dee
                </a>
              </figcaption>
            </figure>
            <div className="object-signal">
              <span>Memoria local</span>
              <strong>12 años</strong>
            </div>
            <div className="object-copy">
              <span>03 / Personas</span>
              <div className="object-title">
                <strong>Experiencia local</strong>
                <button
                  aria-expanded={activeObject === 2}
                  aria-label="Ver más sobre experiencia local"
                  onClick={() => setActiveObject(activeObject === 2 ? -1 : 2)}
                  type="button"
                >
                  <i />
                </button>
              </div>
              <small>Decisiones junto al productor</small>
              <p className="object-detail">
                Los datos no reemplazan la intuición del campo: la hacen
                visible, comparable y más fácil de compartir.
              </p>
            </div>
          </article>

          <article
            className={`object-card ${activeObject === 3 ? "is-expanded" : ""}`}
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest("a, button")) {
                setActiveObject(activeObject === 3 ? -1 : 3)
              }
            }}
          >
            <figure>
              <img
                alt="Granos de café tostado vistos en detalle"
                src="https://images.unsplash.com/photo-1620842947093-284677c6c658?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"
              />
              <figcaption>
                <a
                  href="https://unsplash.com/@lazares"
                  target="_blank"
                  rel="noreferrer"
                >
                  Lazarescu Alexandra
                </a>
              </figcaption>
            </figure>
            <div className="object-signal">
              <span>Trazabilidad</span>
              <strong>100%</strong>
            </div>
            <div className="object-copy">
              <span>04 / Resultado</span>
              <div className="object-title">
                <strong>Calidad medible</strong>
                <button
                  aria-expanded={activeObject === 3}
                  aria-label="Ver más sobre calidad medible"
                  onClick={() => setActiveObject(activeObject === 3 ? -1 : 3)}
                  type="button"
                >
                  <i />
                </button>
              </div>
              <small>Del territorio al grano</small>
              <p className="object-detail">
                Convertimos el seguimiento de la parcela en trazabilidad,
                consistencia y evidencia para mejorar cada cosecha.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="territory" aria-labelledby="territory-title">
        <div className="shell territory-grid">
          <div className="territory-content" data-reveal="right">
            <p className="section-number section-number--dark">
              02 — Cartografía viva
            </p>
            <h2 id="territory-title">
              Cada parcela cuenta una historia. Los datos nos ayudan a leerla.
            </h2>
            <div className="territory-copy">
              <p>
                Observamos patrones que no siempre son visibles y los
                convertimos en acciones concretas, comprensibles y medibles.
              </p>
              <div
                className="territory-metrics"
                aria-label="Indicadores de análisis"
              >
                <div>
                  <strong>07</strong>
                  <span>Capas de información</span>
                </div>
                <div>
                  <strong>360°</strong>
                  <span>Lectura del sistema</span>
                </div>
              </div>
              <div className="crop-cycle" aria-label="Ciclo de acompañamiento">
                {cropStages.map((stage, index) => (
                  <div key={stage.label}>
                    <span>0{index + 1}</span>
                    <i aria-hidden="true" />
                    <p>
                      <small>{stage.label}</small>
                      <strong>{stage.value}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <figure className="territory-atlas" data-reveal="left">
            <div className="atlas-toolbar">
              <div>
                <i aria-hidden="true" />
                <span>Monitoreo activo</span>
              </div>
              <span>Sector norte · 07:42</span>
            </div>

            <div className="parcel-views">
              {[
                {
                  alt: "Tractor monitoreando un cultivo visto desde el aire",
                  photographer: "Marios Gkortsilas",
                  src: "https://images.unsplash.com/photo-1656407410275-e63e689bcd90?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
                },
                {
                  alt: "Geometría de parcelas agrícolas desde el aire",
                  photographer: "Yulian Alexeyev",
                  src: "https://images.unsplash.com/photo-1508175688576-0c076b47b5b5?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
                },
                {
                  alt: "Surcos verdes de un cultivo vistos desde arriba",
                  photographer: "Tim Foster",
                  src: "https://images.unsplash.com/photo-1599138900450-3d06e89ad309?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
                },
              ].map((parcel, index) => (
                <button
                  aria-label={`Explorar ${territoryReadings[index].label}`}
                  aria-pressed={activeReading === index}
                  className="parcel-view"
                  key={territoryReadings[index].label}
                  onClick={() => setActiveReading(index)}
                  onFocus={() => setActiveReading(index)}
                  onMouseEnter={() => setActiveReading(index)}
                  type="button"
                >
                  <img alt={parcel.alt} src={parcel.src} />
                  <span className="parcel-shade" aria-hidden="true" />
                  <span className="parcel-index">0{index + 1}</span>
                  <span className="parcel-label">
                    <small>Capa de lectura</small>
                    <strong>{territoryReadings[index].label}</strong>
                  </span>
                  <span className="parcel-credit">
                    Foto: {parcel.photographer}
                  </span>
                </button>
              ))}
            </div>

            <figcaption className="atlas-reading" aria-live="polite">
              <span>
                <small>Lectura seleccionada</small>
                <strong>{territoryReadings[activeReading].label}</strong>
              </span>
              <strong>{territoryReadings[activeReading].value}</strong>
              <span>
                <i aria-hidden="true" />
                {territoryReadings[activeReading].status}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <StoriesCarousel />

      <section className="pillars" id="pilares" aria-labelledby="pillars-title">
        <span
          className="section-ghost section-ghost--pillars"
          aria-hidden="true"
        >
          CULTIVAR
        </span>
        <div className="shell">
          <div className="section-heading" data-reveal="up">
            <div>
              <p className="section-number section-number--dark">
                04 — Lo que nos guía
              </p>
              <h2 id="pillars-title">
                Rigor técnico.
                <br />
                Sentido humano.
              </h2>
            </div>
            <p>
              Tres principios sostienen nuestra manera de comprender, acompañar
              y transformar el trabajo agrícola.
            </p>
          </div>
          <div className="pillar-grid">
            {pillars.map((pillar) => (
              <article
                className="pillar-card"
                data-reveal="up"
                key={pillar.number}
              >
                <div className="pillar-top">
                  <span>{pillar.number}</span>
                  <div className="pillar-symbol" aria-hidden="true">
                    <DataGlyph variant={Number(pillar.number)} />
                  </div>
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer id="contacto">
        <div className="footer-sun" aria-hidden="true">
          <span />
        </div>
        <div className="shell">
          <div className="footer-top">
            <Brand light />
            <p>Asistencia agrícola inteligente</p>
          </div>
          <div className="footer-main" data-reveal="up">
            <h2>
              Conocimiento que
              <br />
              vuelve a la tierra.
            </h2>
            <div className="footer-contact">
              <p className="footer-label">Encontremos una mejor dirección</p>
              <a href="mailto:agrifos.app@gmail.com">agrifos.app@gmail.com</a>
              <p>León, Nicaragua</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Ágrifos. Todos los derechos reservados.</p>
            <div>
              <a href="#linkedin">LinkedIn</a>
              <a href="#instagram">Instagram</a>
            </div>
            <a href="#inicio">Volver arriba ↑</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
