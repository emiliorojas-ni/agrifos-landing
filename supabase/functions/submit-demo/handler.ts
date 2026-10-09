import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { allowedOrigins, cors, json, readBody } from "../_shared/http.ts";

export async function handleRequest(request: Request) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins().includes(origin)) {
    return json(request, { success: false }, 403);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }
  if (request.method !== "POST") return json(request, { success: false }, 405);
  try {
    const body = await readBody(request);
    const limits: Record<string, number> = {
      name: 120,
      email: 254,
      organization: 160,
      phone: 40,
      interest: 100,
      message: 1500,
      token: 2048,
      website: 255,
    };
    if (!body || typeof body !== "object" || body.consent !== true) {
      return json(request, { success: false }, 400);
    }
    for (const [key, max] of Object.entries(limits)) {
      if (typeof body[key] !== "string" || body[key].length > max) {
        return json(request, { success: false }, 400);
      }
    }
    if (
      !body.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
      body.website !== "" || ![
        "Monitoreo del suelo",
        "Seguimiento del cultivo",
        "Recomendaciones para tomar decisiones",
      ].includes(body.interest)
    ) return json(request, { success: false }, 400);
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (secret) {
      if (!body.token) return json(request, { success: false }, 400);
      const verification = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret, response: body.token }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const proof = await verification.json();
      if (
        !verification.ok || proof.success !== true ||
        proof.action !== "demo-request" ||
        proof.hostname !== new URL(origin).hostname
      ) return json(request, { success: false }, 403);
    }
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const quotaSecret = Deno.env.get("DEMO_RATE_LIMIT_SECRET");
    if (!quotaSecret) return json(request, { success: false }, 503);
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(quotaSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const hash = async (value: string) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.sign(
            "HMAC",
            hmacKey,
            new TextEncoder().encode(value),
          ),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const { data: allowed, error: quotaError } = await client.rpc(
      "consume_demo_quota",
      {
        p_ip_hash: await hash(`ip:${ip}`),
        p_email_hash: await hash(`email:${body.email.trim().toLowerCase()}`),
      },
    );
    if (quotaError) return json(request, { success: false }, 503);
    if (allowed !== true) {
      const response = json(request, { success: false }, 429);
      response.headers.set("Retry-After", "3600");
      return response;
    }
    const { error } = await client.from("demo_requests").insert({
      name: body.name.trim(),
      email: body.email.trim(),
      organization: body.organization.trim(),
      phone: body.phone.trim(),
      interest: body.interest,
      message: body.message.trim(),
      consent: true,
    });
    if (error) return json(request, { success: false }, 400);
    return json(request, { success: true }, 201);
  } catch {
    return json(request, { success: false }, 400);
  }
}
