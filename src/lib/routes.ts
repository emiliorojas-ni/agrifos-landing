export function pageRoute(hash: string, search: string) {
  const params = new URLSearchParams(search)
  if (params.get("recovery") === "1" || hash === "#/admin") return "admin"
  if (params.get("demo_access") === "1" || hash === "#/descargar") return "download"
  return "landing"
}
