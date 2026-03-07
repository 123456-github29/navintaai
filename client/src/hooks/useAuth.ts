import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

const OAUTH_PROCESSED_KEY = "oauth_callback_processed";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    isLoadingRef.current = true;

    const initSession = async () => {
      try {
        const hash = window.location.hash;
        const hasTokensInUrl = hash && hash.includes("access_token");
        const processedHash = sessionStorage.getItem(OAUTH_PROCESSED_KEY);
        const alreadyProcessed = processedHash === hash;
        
        console.log("[useAuth] Init:", { 
          hasTokensInUrl, 
          alreadyProcessed,
          hashPreview: hash ? hash.substring(0, 30) + "..." : "none"
        });

        if (hasTokensInUrl && !alreadyProcessed) {
          console.log("[useAuth] Processing OAuth callback tokens");
          sessionStorage.setItem(OAUTH_PROCESSED_KEY, hash);
          
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          
          if (accessToken && refreshToken) {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error("[useAuth] Error setting session:", sessionError);
              if (mountedRef.current) {
                setError(sessionError.message);
                isLoadingRef.current = false;
                setIsLoading(false);
              }
              sessionStorage.removeItem(OAUTH_PROCESSED_KEY);
              return;
            }
            
            console.log("[useAuth] Session set successfully:", data.session?.user?.email);
            if (mountedRef.current) {
              setSession(data.session);
              setUser(data.session?.user ?? null);
              setError(null);
            }
            window.history.replaceState(null, "", window.location.pathname);
            
            // Create user record in database
            if (data.session?.access_token) {
              try {
                console.log("[useAuth] Creating user record in database...");
                await fetch("/api/auth/user", {
                  headers: {
                    Authorization: `Bearer ${data.session.access_token}`,
                  },
                });
                console.log("[useAuth] User record created/updated");
              } catch (err) {
                console.error("[useAuth] Failed to create user record:", err);
              }
            }
            
            if (mountedRef.current) {
              isLoadingRef.current = false;
              setIsLoading(false);
            }
            return;
          }
        }

        const { data: { session: existingSession }, error: getSessionError } = await supabase.auth.getSession();
        
        if (getSessionError) {
          console.error("[useAuth] Error getting session:", getSessionError);
          if (mountedRef.current) {
            setError(getSessionError.message);
            isLoadingRef.current = false;
            setIsLoading(false);
          }
          return;
        }
        
        console.log("[useAuth] Existing session:", existingSession ? existingSession.user?.email : "none");
        if (mountedRef.current) {
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
          setError(null);
        }
        
        // Ensure user exists in database for existing sessions
        if (existingSession?.access_token) {
          try {
            await fetch("/api/auth/user", {
              headers: {
                Authorization: `Bearer ${existingSession.access_token}`,
              },
            });
          } catch (err) {
            console.error("[useAuth] Failed to sync user record:", err);
          }
        }
        
        if (mountedRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      } catch (err) {
        console.error("[useAuth] Unexpected error:", err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Authentication failed");
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[useAuth] Auth state changed:", event, newSession ? "has session" : "no session");
        if (mountedRef.current && !isLoadingRef.current) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (user) {
      console.log("[useAuth] Already authenticated, skipping sign-in");
      return;
    }
    
    console.log("[useAuth] Starting Google sign-in");
    sessionStorage.removeItem(OAUTH_PROCESSED_KEY);
    setError(null);
    
    // Redirect back to the current page after sign-in
    const redirectUrl = window.location.href.split('#')[0];
    console.log("[useAuth] Redirect URL after sign-in:", redirectUrl);
    
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
    
    if (signInError) {
      console.error("[useAuth] Google sign-in error:", signInError);
      setError(signInError.message);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    console.log("[useAuth] Signing out");
    sessionStorage.removeItem(OAUTH_PROCESSED_KEY);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("[useAuth] Sign out error:", signOutError);
    }
    setUser(null);
    setSession(null);
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    isLoadingRef.current = true;
    sessionStorage.removeItem(OAUTH_PROCESSED_KEY);
    window.location.reload();
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    error,
    signInWithGoogle,
    signOut,
    retry,
  };
}
