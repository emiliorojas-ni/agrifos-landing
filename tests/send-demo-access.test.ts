import { handleRequest } from "../supabase/functions/send-demo-access/handler.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("Only administrators can email approved recipients a private access link", async () => {
  const originalFetch = globalThis.fetch;
  const environment = { ALLOWED_ORIGINS: "https://agrifos.app,http://localhost:8081", SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-only" };
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(environment)) Deno.env.set(key, value);
  let valid = true, admin = false, status = "authorized", found = true, permissionFailure = false, mailFailure = false, sent = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.pathname === "/auth/v1/user") return valid
      ? Response.json({ id: "11111111-1111-4111-8111-111111111111" })
      : Response.json({ message: "Invalid session" }, { status: 401 });
    if (url.pathname === "/rest/v1/rpc/is_admin") {
      assert(new Headers(init?.headers).get("Authorization") === "Bearer admin-test-token", "Permission check used service role");
      return permissionFailure ? Response.json({ message: "Unavailable" }, { status: 503 }) : Response.json(admin);
    }
    if (url.pathname === "/rest/v1/rpc/get_demo_authorization") return Response.json({ status });
    if (url.pathname === "/rest/v1/demo_requests") {
      assert(url.searchParams.get("id") === "eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Wrong request selected");
      return Response.json(found ? [{ email: "Approved@Example.com" }] : []);
    }
    if (url.pathname === "/auth/v1/otp") {
      const body = JSON.parse(String(init?.body));
      assert(body.email === "approved@example.com", "Recipient was taken from the browser");
      assert(url.searchParams.get("redirect_to") === "https://agrifos.app/?demo_access=1", "Untrusted redirect used");
      assert(new Headers(init?.headers).get("Authorization") === "Bearer test-service-only", "Mail uses the wrong client");
      if (mailFailure) return Response.json({ message: "Email rate limit" }, { status: 429 });
      sent++;
      return Response.json({});
    }
    throw new Error("Unexpected outbound request");
  };
  const body = { request_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "attacker@example.com", redirect_to: "https://attacker.example" };
  const request = (data: unknown = body, token = "admin-test-token", origin = "https://agrifos.app") => new Request("https://test.supabase.co/functions/v1/send-demo-access", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data),
  });
  try {
    assert((await handleRequest(request(body, ""))).status === 401, "Anonymous mail allowed");
    valid = false;
    assert((await handleRequest(request())).status === 401, "Invalid token allowed");
    valid = true;
    assert((await handleRequest(request())).status === 403, "Non-admin mail allowed");
    admin = true;
    permissionFailure = true;
    assert((await handleRequest(request())).status === 503, "Permission failure did not block mail");
    permissionFailure = false;
    for (const value of ["pending", "revoked", "expired"]) {
      status = value;
      assert((await handleRequest(request())).status === 403, `${value} approval allowed mail`);
    }
    status = "authorized";
    assert((await handleRequest(request({ request_id: "bad" }))).status === 400, "Invalid ID allowed");
    assert((await handleRequest(request({ request_id: "x".repeat(2000) }))).status === 400, "Oversized body allowed");
    assert((await handleRequest(request(body, "admin-test-token", "https://attacker.example"))).status === 403, "Untrusted origin allowed");
    found = false;
    assert((await handleRequest(request())).status === 404, "Missing recipient allowed");
    found = true;
    assert(sent === 0, "Rejected request sent mail");
    mailFailure = true;
    assert((await handleRequest(request())).status === 429, "Provider failure reported success");
    mailFailure = false;
    const response = await handleRequest(request());
    assert(response.status === 200 && (await response.json()).success === true && sent === 1, "Approved access email failed");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  }
});
