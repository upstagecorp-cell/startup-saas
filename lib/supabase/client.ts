import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

function maskKey(value: string) {
  if (!value) {
    return "";
  }

  return `${value.slice(0, 12)}...${value.slice(-4)}`;
}

export function getSupabaseBrowserDebugConfig() {
  const supabaseEnv = getSupabaseEnv();

  if (!supabaseEnv) {
    return null;
  }

  return {
    url: supabaseEnv.url,
    keyPreview: maskKey(supabaseEnv.anonKey)
  };
}

export async function probeSupabaseBrowserConnection() {
  const supabaseEnv = getSupabaseEnv();

  if (!supabaseEnv) {
    return {
      ok: false as const,
      reason: "missing_env"
    };
  }

  const settingsUrl = new URL("/auth/v1/settings", supabaseEnv.url).toString();

  try {
    const response = await fetch(settingsUrl, {
      method: "GET",
      headers: {
        apikey: supabaseEnv.anonKey
      }
    });

    return {
      ok: response.ok,
      reason: response.ok ? null : `http_${response.status}`,
      status: response.status,
      settingsUrl
    };
  } catch (error) {
    return {
      ok: false as const,
      reason: "fetch_failed",
      settingsUrl,
      error
    };
  }
}

export function createSupabaseBrowserClient() {
  const supabaseEnv = getSupabaseEnv();

  if (!supabaseEnv) {
    console.error("Supabase browser client could not be created because public env vars are missing.");
    return null;
  }

  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
