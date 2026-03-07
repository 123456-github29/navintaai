import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Entitlement {
  plan: "free" | "starter" | "pro" | "studio";
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
  watermarkRequired: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  maxExports: number;
  exportsUsedToday: number;
  exportAllowed: boolean;
  currentPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: "monthly" | "yearly" | null;
}

async function fetchEntitlements(): Promise<Entitlement> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/subscription", {
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch entitlements");
  }

  return response.json();
}

async function syncSubscription(): Promise<{ synced: boolean; plan: string; message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/subscription/sync", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to sync subscription");
  }

  return response.json();
}

export function useEntitlements(options?: { forceRefresh?: boolean }) {
  return useQuery({
    queryKey: ["/api/subscription"],
    queryFn: fetchEntitlements,
    staleTime: options?.forceRefresh ? 0 : 30 * 1000,
    gcTime: options?.forceRefresh ? 0 : 5 * 60 * 1000,
    refetchOnMount: options?.forceRefresh ? "always" : true,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

export function useSyncSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
  });
}

export function getPlanDisplayName(plan: Entitlement["plan"]): string {
  const names: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    studio: "Studio",
  };
  return names[plan] || "Free";
}

export function canUseFeature(entitlement: Entitlement | undefined, feature: "aiBroll" | "aiVoice" | "export"): boolean {
  if (!entitlement) return false;
  
  if (feature === "export") {
    return entitlement.exportAllowed && (entitlement.maxExports === -1 || entitlement.exportsUsedToday < entitlement.maxExports);
  }
  
  return entitlement[feature] ?? false;
}
