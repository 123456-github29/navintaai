import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[supabase] Initializing client...");
console.log("[supabase] URL:", supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "MISSING");
console.log("[supabase] Key:", supabaseAnonKey ? "set (" + supabaseAnonKey.substring(0, 20) + "...)" : "MISSING");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  console.error("[supabase] URL:", supabaseUrl ? "set" : "missing");
  console.error("[supabase] Key:", supabaseAnonKey ? "set" : "missing");
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "directr-auth-token",
      flowType: "implicit",
    },
  }
);
