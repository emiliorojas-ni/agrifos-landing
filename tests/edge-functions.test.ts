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
    DEMO_RATE_LIMIT_SECRET: "test-only-quota-secret",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-service-key",
  };
  const previous = Object.fromEntries(
    Object.keys(environment).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(environment)) {
    Deno.env.set(key, value);
  }
  let saved = 0, challenge = "valid", published = false, quota = true;
  let mailMode = "sent", mailed = 0;
  const records = new Map<string, Record<string, unknown>>();
  const outcomes: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
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
    if (url.includes("/rest/v1/rpc/consume_demo_quota")) {
      return new Response(JSON.stringify(quota), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/rpc/claim_demo_email_jobs")) {
      const args = JSON.parse(String(init?.body));
      return Response.json([{ ...records.get(args.p_id), attempt: 1, notes: "PRIVATE" }]);
    }
    if (url.includes("/rest/v1/rpc/finish_demo_email_job")) {
      outcomes.push(JSON.parse(String(init?.body)).p_status);
      return Response.json(null);
    }
    if (url.startsWith("https://formsubmit.co/ajax/")) {
      assert(url.endsWith("agrifos.app@gmail.com"), "Wrong recipient");
      const payload = JSON.parse(String(init?.body));
      assert(payload._replyto === "person@example.com", "Wrong reply address");
      assert(!JSON.stringify(payload).includes("PRIVATE"), "Internal notes leaked");
      mailed++;
      if (mailMode === "failed") throw new Error("Provider unavailable");
      return Response.json(mailMode === "activation_required"
        ? { success: "false", message: "This form needs Activation" }
        : { success: "true" });
    }
    if (url.includes("/rest/v1/demo_requests")) {
      if (!init?.method || init.method === "GET") {
        const id = new URL(url).searchParams.get("id")?.slice(3) || "";
        return Response.json(records.has(id) ? [records.get(id)] : []);
      }
      const record = JSON.parse(String(init.body));
      records.set(record.id, record);
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
    website: "",
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
    Deno.env.delete("TURNSTILE_SECRET_KEY");
    assert(
      (await submit(request({ ...body, token: "" }))).status === 201,
      "Quota-only submission failed",
    );
    for (const mode of ["activation_required", "failed"]) {
      mailMode = mode;
      assert((await submit(request())).status === 201, "Mail failure lost the request");
      assert(outcomes.at(-1) === mode, "Notification state not recorded");
    }
    mailMode = "sent";
    const retry = { ...body, submission_id: "55555555-5555-4555-8555-555555555555" };
    assert((await submit(request(retry))).status === 201, "Initial idempotent request failed");
    const beforeRetry = { saved, mailed };
    assert((await submit(request(retry))).status === 201, "Retry failed");
    assert(saved === beforeRetry.saved && mailed === beforeRetry.mailed, "Retry duplicated request/email");
    assert((await submit(request({ ...retry, name: "Different" }))).status === 409, "Id reuse allowed changed data");
    const savedBefore = saved;
    assert(
      (await submit(request({ ...body, website: "spam" }))).status === 400,
      "Honeypot accepted",
    );
    quota = false;
    assert(
      (await submit(request())).status === 429 && saved === savedBefore,
      "Quota bypassed",
    );
    Deno.env.delete("DEMO_RATE_LIMIT_SECRET");
    assert(
      (await submit(request())).status === 503,
      "Missing quota secret did not fail closed",
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
