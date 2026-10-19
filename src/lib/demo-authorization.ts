export interface DemoAuthorization {
  request_id: string
  approved_at: string
  approved_by: string
  expires_at: string | null
  revoked_at: string | null
  revoked_by: string | null
}

export interface DemoAuthorizationEvent {
  id: number
  action: "authorized" | "revoked"
  actor_id: string
  occurred_at: string
  expires_at: string | null
}

export interface DemoAuthorizationDetails {
  authorization: DemoAuthorization | null
  history: DemoAuthorizationEvent[]
}

export function authorizationStatus(
  authorization: DemoAuthorization | null | undefined,
  now = Date.now(),
) {
  if (authorization === undefined) return "No disponible"
  if (authorization === null) return "Sin autorización"
  if (authorization.revoked_at) return "Revocada"
  if (authorization.expires_at && Date.parse(authorization.expires_at) <= now)
    return "Vencida"
  return "Autorizada"
}

// datetime-local uses the administrator's local time; send an explicit UTC instant.
export function authorizationExpiry(value: string, now = Date.now()) {
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time) || time <= now)
    throw new Error("Selecciona una fecha y hora futuras para el vencimiento.")
  return new Date(time).toISOString()
}
