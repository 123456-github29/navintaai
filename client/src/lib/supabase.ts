import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://iqfrjomoggddxwteuigk.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnJqb21vZ2dkZHh3dGV1aWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTM5MDAsImV4cCI6MjA2MTYyOTkwMH0.VJD2Fy3F7B8s_0pRCfLOMGjRNVJMhmMNrlVcsYJXcwQ";

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
