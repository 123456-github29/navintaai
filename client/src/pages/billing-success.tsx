import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { CheckCircleIcon, SparklesIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import gsap from "gsap";
import { useSyncSubscription, useEntitlements } from "@/hooks/useEntitlements";

export default function BillingSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(8);
  const [syncAttempts, setSyncAttempts] = useState(0);
  const [syncStatus, setSyncStatus] = useState<"pending" | "syncing" | "success" | "error">("pending");
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { mutateAsync: syncSubscription } = useSyncSubscription();
  const { data: entitlement, refetch } = useEntitlements({ forceRefresh: true });

  useEffect(() => {
    let cancelled = false;
    
    async function pollForSubscription() {
      setSyncStatus("syncing");
      
      for (let i = 0; i < 5; i++) {
        if (cancelled) return;
        setSyncAttempts(i + 1);
        
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: currentData } = await refetch();
          if (currentData && currentData.plan !== "free") {
            setSyncStatus("success");
            queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
            queryClient.invalidateQueries({ queryKey: ["user"] });
            return;
          }
          
          try {
            await syncSubscription();
          } catch (syncErr) {
            console.log(`[BillingSuccess] Sync attempt ${i + 1} - sync endpoint failed (may not have customer yet):`, syncErr);
          }
          
          const { data: updated } = await refetch();
          if (updated && updated.plan !== "free") {
            setSyncStatus("success");
            queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
            queryClient.invalidateQueries({ queryKey: ["user"] });
            return;
          }
        } catch (error) {
          console.error(`[BillingSuccess] Sync attempt ${i + 1} failed:`, error);
        }
      }
      
      if (!cancelled) {
        setSyncStatus("error");
        queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
      }
    }

    pollForSubscription();
    
    return () => { cancelled = true; };
  }, [syncSubscription, refetch, queryClient]);

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        containerRef.current.querySelector(".success-icon"),
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      )
        .fromTo(
          containerRef.current.querySelector(".success-title"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2"
        )
        .fromTo(
          containerRef.current.querySelector(".success-message"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2"
        )
        .fromTo(
          containerRef.current.querySelector(".success-button"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2"
        );
    }
  }, []);

  useEffect(() => {
    if (syncStatus === "syncing") return;
    
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation, syncStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050505" }}>
      <div ref={containerRef} className="max-w-md w-full text-center space-y-6">
        <div className="success-icon inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircleIcon className="w-12 h-12 text-emerald-400" />
        </div>

        <div className="space-y-3">
          <h1 className="success-title text-3xl font-bold text-white">
            {syncStatus === "syncing" ? "Activating your plan..." : "Welcome to the team!"}
          </h1>
          <p className="success-message text-white/40">
            {syncStatus === "syncing" ? (
              <span className="flex items-center justify-center gap-2">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Syncing subscription (attempt {syncAttempts}/5)...
              </span>
            ) : syncStatus === "error" ? (
              "Your payment was successful! If your plan doesn't appear, visit your dashboard to refresh."
            ) : (
              `Your subscription is now active. You have full access to all your ${entitlement?.plan || "new"} plan features.`
            )}
          </p>
        </div>

        <div className="success-button pt-4 space-y-4">
          <Button
            onClick={() => setLocation("/dashboard")}
            disabled={syncStatus === "syncing"}
            className="w-full h-12 rounded-full bg-white text-black font-medium hover:shadow-[0_0_30px_rgba(255,255,255,0.12)] transition-all duration-200 disabled:opacity-50"
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Go to Dashboard
          </Button>
          <p className="text-sm text-white/30">
            {syncStatus === "syncing"
              ? "Please wait while we activate your plan..."
              : `Redirecting in ${countdown} seconds...`}
          </p>
        </div>
      </div>
    </div>
  );
}
