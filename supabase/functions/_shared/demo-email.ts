import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";

export const notificationRecipient = "agrifos.app@gmail.com";
interface EmailJob {
  id: string;
  name: string;
  email: string;
  organization: string;
  phone: string;
  interest: string;
  message: string;
  created_at: string;
  attempt: number;
}
export async function notifyDemoRequests(client: SupabaseClient, id?: string) {
  const { data: jobs, error } = await client.rpc("claim_demo_email_jobs", { p_id: id || null });
  if (error) throw new Error("Notification queue unavailable");
  const statuses: string[] = [];
  for (const job of (jobs || []) as EmailJob[]) {
    let status = "failed";
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${notificationRecipient}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", Accept: "application/json",
          Origin: "https://agrifos.app", Referer: "https://agrifos.app/",
        },
        body: JSON.stringify({
          name: job.name, email: job.email,
          "Finca u organización": job.organization || "No indicada",
          "Teléfono": job.phone || "No indicado",
          "Tema de interés": job.interest,
          message: job.message || "Sin mensaje adicional",
          "Autorización de contacto": "Sí, para coordinar una demostración de Ágrifos",
          "Referencia": job.id, "Recibida": job.created_at,
          _replyto: job.email, _subject: "Ágrifos — Nueva solicitud de demo",
          _template: "table", _captcha: "false", _honey: "",
        }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (/activat|confirm your email/i.test(String(result.message || ""))) status = "activation_required";
      else if (response.ok && (result.success === true || result.success === "true")) status = "sent";
    } catch { /* Keep the persisted job for the scheduled retry. */ }
    const finish = await client.rpc("finish_demo_email_job", {
      p_id: job.id, p_attempt: job.attempt, p_status: status,
    });
    if (finish.error) throw new Error("Notification state unavailable");
    statuses.push(status);
  }
  return statuses;
}
