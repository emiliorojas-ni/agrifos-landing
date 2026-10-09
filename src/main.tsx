import React, { lazy, Suspense, useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "./responsive.css"

const AdminPanel = lazy(() => import("./admin/AdminPanel"))
function Root() {
  const [admin, setAdmin] = useState(
    window.location.hash === "#/admin" || new URLSearchParams(window.location.search).get("recovery") === "1",
  )
  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash === "#/admin" || new URLSearchParams(window.location.search).get("recovery") === "1"
      setAdmin(next)
      if (next || admin) window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [admin])
  return admin ? (
    <Suspense
      fallback={
        <p className="shell" role="status">
          Cargando acceso privado…
        </p>
      }
    >
      <AdminPanel />
    </Suspense>
  ) : (
    <App />
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
