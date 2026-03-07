import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PlanId = "free" | "starter" | "pro" | "studio";

export interface SubscriptionData {
  plan: PlanId;
  status: "active" | "past_due" | "canceled" | "trialing" | "none";
  watermarkRequired: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  maxExports: number;
  exportsUsedToday: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

export interface FeatureAccess {
  aiContentPlanning: boolean;
  recordMode: boolean;
  autoEditing: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  noWatermark: boolean;
  unlimitedExports: boolean;
}

const PLAN_FEATURES: Record<PlanId, FeatureAccess> = {
  free: {
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: false,
    aiBroll: false,
    aiVoice: false,
    noWatermark: false,
    unlimitedExports: false,
  },
  starter: {
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: false,
    aiBroll: true,
    aiVoice: false,
    noWatermark: true,
    unlimitedExports: false,
  },
  pro: {
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: true,
    aiBroll: true,
    aiVoice: true,
    noWatermark: true,
    unlimitedExports: false,
  },
  studio: {
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: true,
    aiBroll: true,
    aiVoice: true,
    noWatermark: true,
    unlimitedExports: true,
  },
};

async function fetchSubscription(): Promise<SubscriptionData> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return {
      plan: "free",
      status: "none",
      watermarkRequired: true,
      aiBroll: false,
      aiVoice: false,
      maxExports: 3,
      exportsUsedToday: 0,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    };
  }

  const response = await fetch("/api/subscription", {
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch subscription");
  }

  return response.json();
}

export function useSubscription() {
  const query = useQuery({
    queryKey: ["/api/subscription"],
    queryFn: fetchSubscription,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const subscription = query.data;
  const plan = subscription?.plan || "free";
  const features = PLAN_FEATURES[plan];

  return {
    ...query,
    subscription,
    plan,
    features,
    isActive: subscription?.status === "active" || subscription?.status === "trialing",
    isPaid: plan !== "free",
    canUse: (feature: keyof FeatureAccess) => features?.[feature] ?? false,
  };
}

export function getPlanDisplayName(plan: PlanId): string {
  const names: Record<PlanId, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    studio: "Studio",
  };
  return names[plan] || "Free";
}

export function getPlanFeatures(plan: PlanId): FeatureAccess {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

export function canAccessFeature(plan: PlanId, feature: keyof FeatureAccess): boolean {
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  return features[feature];
}
