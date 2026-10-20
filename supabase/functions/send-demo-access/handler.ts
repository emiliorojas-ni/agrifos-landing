import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { allowedOrigins, cors, json, readBody } from "../_shared/http.ts";

export async function handleRequest(request: Request) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins().includes(origin)) return json(request, { success: false }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { success: false }, 405);
  const bearer = request.headers.get("Authorization") || "";
  const token = /^Bearer\s+(\S+)$/i.exec(bearer)?.[1];
  if (!token) return json(request, { success: false }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const service = createClient(url, key, options);
    const identity = await service.auth.getUser(token);
    if (identity.error || !identity.data.user) return json(request, { success: false }, 401);
    const admin = createClient(url, key, { ...options, global: { headers: { Authorization: bearer } } });
    const permission = await admin.rpc("is_admin");
    if (permission.error) return json(request, { success: false }, 503);
    if (permission.data !== true) return json(request, { success: false }, 403);
    let body;
    try { body = await readBody(request, 1024); }
    catch { return json(request, { success: false }, 400); }
    const id = body?.request_id;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return json(request, { success: false }, 400);
    const approval = await admin.rpc("get_demo_authorization", { p_request_id: id });
    if (approval.error) return json(request, { success: false }, 503);
    if (approval.data?.status !== "authorized") return json(request, { success: false }, 403);
    // Recipient and callback cannot be overridden by the browser.
    const recipient = await service.from("demo_requests").select("email").eq("id", id).maybeSingle();
    if (recipient.error) return json(request, { success: false }, 503);
    if (!recipient.data?.email) return json(request, { success: false }, 404);
    const email = recipient.data.email.trim().toLowerCase();
    const { error } = await service.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: new URL("/?demo_access=1", origin).href },
    });
    if (error) return json(request, { success: false }, error.status === 429 ? 429 : 503);
    return json(request, { success: true });
  } catch {
    return json(request, { success: false }, 503);
  }
}
