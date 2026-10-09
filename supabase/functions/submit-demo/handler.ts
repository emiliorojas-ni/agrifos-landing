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
      !body.token
    ) return json(request, { success: false }, 400);
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) return json(request, { success: false }, 503);
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
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
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
