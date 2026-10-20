import { test } from "node:test"
import assert from "node:assert/strict"
import { pageRoute } from "../src/lib/routes.ts"

test("landing anchors stay public, private downloads have their own route", () => {
  for (const hash of ["", "#inicio", "#demo", "#historias", "#descargas"])
    assert.equal(pageRoute(hash, ""), "landing")
  assert.equal(pageRoute("#/descargar", ""), "download")
  assert.equal(pageRoute("#access_token=token", "?demo_access=1"), "download")
  assert.equal(pageRoute("", "?demo_access=0"), "landing")
})

test("administrator and password recovery routes are preserved", () => {
  assert.equal(pageRoute("#/admin", ""), "admin")
  assert.equal(pageRoute("#access_token=token", "?recovery=1"), "admin")
  assert.equal(pageRoute("", "?recovery=1&demo_access=1"), "admin")
})
