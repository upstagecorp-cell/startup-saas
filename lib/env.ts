export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function getSupabaseEnv() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey
  };
}
