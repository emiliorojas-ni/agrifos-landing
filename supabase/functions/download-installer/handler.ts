import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { allowedOrigins, cors, json, readBody } from "../_shared/http.ts";

export async function handleRequest(request: Request) {
  const origin = request.headers.get("Origin") || "";
  if (origin && !allowedOrigins().includes(origin)) return json(request, { error: "Origin denied" }, 403);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Method not allowed" }, 405);
  }
  // Legacy public GET redirects are deliberately disabled.
  const bearer = request.headers.get("Authorization") || "";
  const token = /^Bearer\s+(\S+)$/i.exec(bearer)?.[1];
  if (!token) return json(request, { error: "Sign in required" }, 401);
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    // Validate with Auth, then run the permission check as that user, not service_role.
    const { data: identity, error: identityError } = await client.auth.getUser(token);
    if (identityError || !identity.user) return json(request, { error: "Invalid session" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: permitted, error: permissionError } = await userClient.rpc("can_download_demo");
    if (permissionError) return json(request, { error: "Access check unavailable" }, 503);
    if (permitted !== true) return json(request, { error: "Active demo authorization required" }, 403);
    let body;
    try { body = await readBody(request, 1024); }
    catch { return json(request, { error: "Invalid request" }, 400); }
    const id = body?.id;
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return json(request, { error: "Not found" }, 404);
    const { data, error } = await client.from("installers").select(
      "source,storage_path,file_name",
    ).eq("id", id).eq("is_published", true).maybeSingle();
    if (error) return json(request, { error: "Download unavailable" }, 503);
    if (!data || data.source !== "storage" || !data.storage_path)
      return json(request, { error: "Not found" }, 404);
    const result = await client.storage.from("installers").createSignedUrl(
        data.storage_path,
        60,
        { download: data.file_name },
      );
    if (result.error) return json(request, { error: "Download unavailable" }, 503);
    return json(request, { url: result.data.signedUrl, expires_in: 60 });
  } catch {
    return json(request, { error: "Download unavailable" }, 503);
  }
}
