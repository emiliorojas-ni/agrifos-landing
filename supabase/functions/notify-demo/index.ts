import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { notifyDemoRequests } from "../_shared/demo-email.ts";

Deno.serve(async (request) => {
  const secret = Deno.env.get("DEMO_NOTIFICATION_SECRET");
  if (!secret || request.headers.get("x-demo-notification-secret") !== secret) {
    return new Response(null, { status: 401 });
  }
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } });
    const statuses = await notifyDemoRequests(client);
    return Response.json({ processed: statuses.length });
  } catch { return new Response(null, { status: 503 }); }
});
