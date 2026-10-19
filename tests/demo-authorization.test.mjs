import { test } from "node:test"
import assert from "node:assert/strict"
import { authorizationExpiry, authorizationStatus } from "../src/lib/demo-authorization.ts"

const now = Date.parse("2026-10-19T18:00:00Z")
const authorization = {
  request_id: "request", approved_at: "2026-10-19T17:00:00Z", approved_by: "admin",
  expires_at: null, revoked_at: null, revoked_by: null,
}

test("approval states distinguish absent data, pending, current, expired and revoked", () => {
  assert.equal(authorizationStatus(undefined, now), "No disponible")
  assert.equal(authorizationStatus(null, now), "Sin autorización")
  assert.equal(authorizationStatus(authorization, now), "Autorizada")
  assert.equal(authorizationStatus({ ...authorization, expires_at: "2026-10-19T18:00:01Z" }, now), "Autorizada")
  assert.equal(authorizationStatus({ ...authorization, expires_at: "2026-10-19T18:00:00Z" }, now), "Vencida")
  assert.equal(authorizationStatus({ ...authorization, expires_at: "2026-10-19T17:59:59Z" }, now), "Vencida")
  assert.equal(authorizationStatus({ ...authorization, expires_at: "2026-10-19T17:59:59Z", revoked_at: "2026-10-19T17:30:00Z" }, now), "Revocada")
})

test("expiration is optional, rejects past/invalid values and serializes to UTC", () => {
  assert.equal(authorizationExpiry("", now), null)
  for (const value of ["invalid", "2026-10-19T18:00:00Z", "2026-10-19T17:00:00Z"]) {
    assert.throws(() => authorizationExpiry(value, now), /futuras/)
  }
  assert.equal(authorizationExpiry("2026-10-19T13:00:00-06:00", now), "2026-10-19T19:00:00.000Z")
  const localTime = "2026-10-20T12:30"
  assert.equal(authorizationExpiry(localTime, now), new Date(localTime).toISOString())
})
