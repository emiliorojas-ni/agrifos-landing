// Run the same mocked Edge tests on Node 24 when Deno isn't installed:
// node --test --import ./tests/node-edge-runtime.mjs tests/edge-functions.test.ts
import { registerHooks } from "node:module"
import { test } from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "npm:@supabase/supabase-js@2.117.3")
      return nextResolve("@supabase/supabase-js", context)
    return nextResolve(specifier, context)
  },
})
globalThis.Deno = {
  test,
  env: {
    get: (key) => process.env[key],
    set: (key, value) => { process.env[key] = value },
    delete: (key) => { delete process.env[key] },
  },
}
