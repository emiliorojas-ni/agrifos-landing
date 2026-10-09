import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || ""
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: window.sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null
export const functionsUrl = url ? `${url.replace(/\/$/, "")}/functions/v1` : ""

export const platforms = {
  android: "Android",
  macos: "macOS",
  windows: "Windows",
} as const
export type Platform = keyof typeof platforms
export const extensions = {
  android: ".apk",
  macos: ".dmg",
  windows: ".exe",
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
export const initialAndroid: Installer = {
  id: "00000000-0000-4000-8000-000000000001",
  platform: "android",
  version: "1.0.0",
  architecture: "ARM64",
  file_name: "agrifos-v1.0.0-android-arm64.apk",
  size_bytes: 22600581,
  storage_path: null,
  source: "github",
  is_published: true,
  created_at: "",
  external_url:
    "https://github.com/ferjovel06/agrifos/releases/download/v1.0.0/agrifos-v1.0.0-android-arm64.apk",
}
export function downloadUrl(installer: Installer) {
  return installer.source === "github"
    ? installer.external_url!
    : `${functionsUrl}/download-installer?id=${installer.id}`
}
export function fileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
