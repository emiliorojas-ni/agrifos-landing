import { useEffect, useRef, useState } from "react"
import { turnstileSiteKey } from "../lib/supabase"

type WidgetApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: WidgetApi
  }
}
let loading: Promise<void> | undefined
function loadWidget() {
  if (window.turnstile) return Promise.resolve()
  if (!loading)
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loading = undefined
        script.remove()
        reject(new Error("Widget unavailable"))
      }
      document.head.append(script)
    })
  return loading
}
export default function Turnstile({
  onToken,
}: {
  onToken: (token: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    let id: string | undefined
    loadWidget()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return
        id = window.turnstile.render(container.current, {
          sitekey: turnstileSiteKey,
          action: "demo-request",
          size: "flexible",
          theme: "light",
          callback: (token: string) => {
            setFailed(false)
            onToken(token)
          },
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("")
            setFailed(true)
          },
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (id) window.turnstile?.remove(id)
    }
  }, [onToken])
  return (
    <div className="demo-verification">
      <div ref={container} />
      {failed && (
        <p role="alert">
          No se pudo cargar la verificación. Recarga la página o escríbenos por
          correo.
        </p>
      )}
    </div>
  )
}
