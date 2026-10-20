import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { DemoAuthorization } from "./demo-authorization"

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const recoveryRequested = new URLSearchParams(window.location.search).get("recovery") === "1"
export const demoAccessRequested = new URLSearchParams(window.location.search).get("demo_access") === "1"
export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || ""
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: window.sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: recoveryRequested,
        },
      })
    : null
// Visitor access must not replace the administrator's session in the same tab.
export const demoSupabase = url && key
  ? createClient(url, key, {
      auth: {
        storage: window.sessionStorage,
        storageKey: "agrifos-demo-access",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: demoAccessRequested && !recoveryRequested,
      },
    })
  : null

export const platforms = {
  android: "Android",
} as const
export type Platform = keyof typeof platforms
export const extensions = {
  android: ".apk",
} as const
export const requestStatuses = {
  new: "Nueva",
  contacted: "Contactada",
  scheduled: "Demo agendada",
  completed: "Completada",
  archived: "Archivada",
} as const
export type RequestStatus = keyof typeof requestStatuses
export interface DemoRecord {
  authorization?: DemoAuthorization | null
  id: string
  name: string
  email: string
  organization: string
  phone: string
  interest: string
  message: string
  status: RequestStatus
  notes: string
  created_at: string
  notification_status?: "not_requested" | "pending" | "sent" | "activation_required" | "failed"
}
export interface Installer {
  id: string
  platform: Platform
  version: string
  architecture: string
  file_name: string
  size_bytes: number
  storage_path: string | null
  external_url: string | null
  source: "github" | "storage"
  is_published: boolean
  created_at: string
}
export async function downloadInstaller(client: SupabaseClient, installerId: string) {
  const { data, error } = await client.functions.invoke("download-installer", {
    body: { id: installerId },
  })
  if (error || typeof data?.url !== "string" || !url) throw new Error("Download unavailable")
  const target = new URL(data.url)
  if (target.origin !== new URL(url).origin ||
      !target.pathname.startsWith("/storage/v1/object/sign/installers/"))
    throw new Error("Invalid download destination")
  window.location.assign(target.href)
}
export function fileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
