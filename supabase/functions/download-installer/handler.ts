import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { cors, json } from "../_shared/http.ts";

export async function handleRequest(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }
  if (request.method !== "GET") {
    return json(request, { error: "Method not allowed" }, 405);
  }
  const id = new URL(request.url).searchParams.get("id") || "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) return json(request, { error: "Not found" }, 404);
  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await client.from("installers").select(
      "source,external_url,storage_path,file_name",
    ).eq("id", id).eq("is_published", true).maybeSingle();
    if (error || !data) return json(request, { error: "Not found" }, 404);
    let location = data.external_url;
    if (data.source === "storage") {
      const result = await client.storage.from("installers").createSignedUrl(
        data.storage_path,
        60,
        { download: data.file_name },
      );
      if (result.error) {
        return json(request, { error: "Download unavailable" }, 503);
      }
      location = result.data.signedUrl;
    } else if (
      !/^https:\/\/github\.com\/ferjovel06\/agrifos\/releases\/download\//.test(
        location || "",
      )
    ) return json(request, { error: "Not found" }, 404);
    return new Response(null, {
      status: 302,
      headers: { Location: location, "Cache-Control": "no-store" },
    });
  } catch {
    return json(request, { error: "Download unavailable" }, 503);
  }
}
