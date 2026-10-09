import { handleRequest as submit } from "../supabase/functions/submit-demo/handler.ts";
import { handleRequest as download } from "../supabase/functions/download-installer/handler.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
Deno.test("Intake validation and published downloads", async () => {
  const original = globalThis.fetch;
  const environment = {
    ALLOWED_ORIGINS: "https://agrifos.app",
    TURNSTILE_SECRET_KEY: "test-only",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-service-key",
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(environment)) {
    Deno.env.set(key, value);
  }
  let saved = 0, challenge = "valid", published = false;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    if (url.includes("challenges.cloudflare.com")) {
      return new Response(
        JSON.stringify({
          success: challenge !== "invalid",
          action: challenge === "wrong-action" ? "other" : "demo-request",
          hostname: challenge === "wrong-host"
            ? "other.example"
            : "agrifos.app",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/rest/v1/demo_requests")) {
      saved++;
      return new Response("", { status: 201 });
    }
    if (url.includes("/rest/v1/installers")) {
      assert(
        url.includes("is_published=eq.true"),
        "Download did not restrict publication",
      );
      return new Response(
        JSON.stringify(
          published
            ? [{
              source: "storage",
              storage_path: "android/test/test.apk",
              file_name: "test.apk",
              external_url: null,
            }]
            : [],
        ),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/storage/v1/object/sign/")) {
      return new Response(
        JSON.stringify({
          signedURL:
            "/object/sign/installers/android/test/test.apk?token=test-only",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    throw new Error("Unexpected outbound call in test");
  };
  const body = {
    name: "Persona de prueba",
    email: "person@example.com",
    organization: "",
    phone: "",
    interest: "Monitoreo del suelo",
    message: "",
    consent: true,
    token: "test-token",
  };
  const request = (data = body, origin = "https://agrifos.app") =>
    new Request("https://test.supabase.co/functions/v1/submit-demo", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  try {
    assert(
      (await submit(request(body, "https://other.example"))).status === 403,
      "Unknown origin accepted",
    );
    assert(
      (await submit(request({ ...body, consent: false }))).status === 400,
      "Missing consent accepted",
    );
    assert(
      (await submit(request({ ...body, name: "x".repeat(20000) }))).status ===
        400,
      "Oversized body accepted",
    );
    assert(saved === 0, "Invalid input saved");
    for (const mode of ["invalid", "wrong-action", "wrong-host"]) {
      challenge = mode;
      assert(
        (await submit(request())).status === 403,
        `${mode} Turnstile proof accepted`,
      );
    }
    assert(saved === 0, "Invalid verification saved");
    challenge = "valid";
    assert(
      (await submit(request())).status === 201 && saved === 1,
      "Verified request not saved",
    );
    const url =
      "https://test.supabase.co/functions/v1/download-installer?id=33333333-3333-4333-8333-333333333333";
    assert(
      (await download(new Request(url))).status === 404,
      "Draft download allowed",
    );
    published = true;
    const response = await download(new Request(url));
    assert(
      response.status === 302 &&
        response.headers.get("Location")?.includes("token=test-only"),
      "Published signed download failed",
    );
  } finally {
    globalThis.fetch = original;
    for (const key of Object.keys(environment)) {
      if (previous[key] === undefined) Deno.env.delete(key);
      else Deno.env.set(key, previous[key]!);
    }
  }
});
