import React, { lazy, Suspense, useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "./responsive.css"
import { pageRoute } from "./lib/routes"

const AdminPanel = lazy(() => import("./admin/AdminPanel"))
const DownloadPage = lazy(() => import("./components/DownloadPage"))
function Root() {
  const [page, setPage] = useState(
    () => pageRoute(window.location.hash, window.location.search),
  )
  useEffect(() => {
    const onHash = () => {
      const next = pageRoute(window.location.hash, window.location.search)
      setPage(next)
      if (next !== page) window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [page])
  return page !== "landing" ? (
    <Suspense
      fallback={
        <p className="shell" role="status">
          Cargando acceso privado…
        </p>
      }
    >
      {page === "admin" ? <AdminPanel /> : <DownloadPage />}
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
