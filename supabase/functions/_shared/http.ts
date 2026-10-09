export function allowedOrigins() {
  return (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((value) =>
    value.trim()
  ).filter(Boolean);
}
export function cors(request: Request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins().includes(origin)
      ? origin
      : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    Vary: "Origin",
  };
}
export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(request),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export async function readBody(request: Request, maxBytes = 16000) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("Body too large");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
