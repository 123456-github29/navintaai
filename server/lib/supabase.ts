/**
 * Supabase client configuration
 * Provides both anon client (for auth) and service role client (for server-side operations)
 * Service role client should ONLY be used server-side - never expose to frontend
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";

let supabaseAnon: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;
let initialized = false;

export function isSupabaseEnabled(): boolean {
  return config.supabase.enabled;
}

export function initSupabase(): { anon: SupabaseClient; admin: SupabaseClient } | null {
  if (!config.supabase.enabled) {
    console.log("[supabase] Supabase not configured, skipping initialization");
    return null;
  }

  if (initialized && supabaseAnon && supabaseAdmin) {
    return { anon: supabaseAnon, admin: supabaseAdmin };
  }

  const { url, anonKey, serviceRoleKey } = config.supabase;

  supabaseAnon = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });

  // SERVICE ROLE KEY: Only used for server-side operations that need elevated privileges
  // Examples: Creating users, bypassing RLS for admin operations
  // NEVER expose this to the frontend
  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  initialized = true;
  console.log("[supabase] Supabase clients initialized successfully");
  return { anon: supabaseAnon, admin: supabaseAdmin };
}

export function getSupabaseAnon(): SupabaseClient | null {
  if (!config.supabase.enabled) return null;
  if (!supabaseAnon) {
    initSupabase();
  }
  return supabaseAnon;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!config.supabase.enabled) return null;
  if (!supabaseAdmin) {
    initSupabase();
  }
  return supabaseAdmin;
}
