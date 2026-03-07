import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export type PlanId = "free" | "starter" | "pro" | "studio";
export type BillingInterval = "monthly" | "yearly";

export interface PlanData {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  cta: string;
  popular?: boolean;
  features: string[];
  excluded: string[];
}

const plans: PlanData[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For trying Navinta",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Get Started Free",
    features: [
      "3 exports per day",
      "Director Mode recording",
      "AI Content Planning",
      "Watermarked exports",
    ],
    excluded: ["AI B-roll", "AI Voice", "Auto-Editing"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For new creators",
    monthlyPrice: 19.99,
    yearlyPrice: 215.88,
    cta: "Start Creating",
    features: [
      "20 exports per day",
      "AI Content Planning",
      "Director Mode recording",
      "AI B-roll insertion",
      "Export without watermark",
    ],
    excluded: ["AI Voice", "Auto-Editing"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious creators",
    monthlyPrice: 49.99,
    yearlyPrice: 539.88,
    popular: true,
    cta: "Go Pro",
    features: [
      "100 exports per day",
      "AI Content Planning",
      "Director Mode recording",
      "AI B-roll insertion",
      "AI Voice generation",
      "Auto-Editing features",
      "Priority processing",
    ],
    excluded: [],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "For teams & agencies",
    monthlyPrice: 99.99,
    yearlyPrice: 1079.88,
    cta: "Join Studio",
    features: [
      "Unlimited exports",
      "Everything in Pro",
      "Team workspace",
      "Brand kit",
      "Advanced analytics",
      "Early access features",
    ],
    excluded: [],
  },
];

interface PricingProps {
  onPlanSelect?: (planId: PlanId, interval: BillingInterval) => void;
  showTitle?: boolean;
  className?: string;
}

export function Pricing({ onPlanSelect, showTitle = true, className = "" }: PricingProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { isAuthenticated, signInWithGoogle, session } = useAuth();
  const [, setLocation] = useLocation();

  const handlePlanSelect = async (planId: PlanId) => {
    if (onPlanSelect) {
      onPlanSelect(planId, interval);
      return;
    }

    if (planId === "free") {
      if (isAuthenticated) {
        setLocation("/onboarding");
      } else {
        signInWithGoogle();
      }
      return;
    }

    if (!isAuthenticated) {
      sessionStorage.setItem("pendingPlan", planId);
      sessionStorage.setItem("pendingInterval", interval);
      signInWithGoogle();
      return;
    }

    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          plan: planId,
          interval: interval,
        }),
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.replace(data.url);
      } else {
        console.error("[Pricing] No checkout URL:", data);
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error("[Pricing] Checkout error:", error);
      setLoadingPlan(null);
    }
  };

  const getPrice = (plan: PlanData) => {
    if (plan.monthlyPrice === 0) return "Free";
    const price = interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice / 12;
    return `$${price.toFixed(2)}`;
  };

  const getBillingText = (plan: PlanData) => {
    if (plan.monthlyPrice === 0) return "forever";
    return interval === "monthly" ? "/month" : "/month, billed yearly";
  };

  return (
    <section id="pricing" className={`py-20 ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        {showTitle && (
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-[#666666] max-w-2xl mx-auto">
              Choose the plan that fits your creative workflow. Upgrade or downgrade anytime.
            </p>

            <div className="flex justify-center mt-8">
              <div className="inline-flex items-center p-1 rounded-full bg-white border border-gray-100 shadow-sm">
                <button
                  onClick={() => setInterval("monthly")}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    interval === "monthly"
                      ? "bg-[#3B82F6] text-white shadow-sm"
                      : "text-[#666666] hover:text-[#111111]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setInterval("yearly")}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    interval === "yearly"
                      ? "bg-[#3B82F6] text-white shadow-sm"
                      : "text-[#666666] hover:text-[#111111]"
                  }`}
                >
                  Yearly
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    interval === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    Save 10%
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border ${
                plan.popular
                  ? "border-[#3B82F6] ring-2 ring-[#3B82F6]/20"
                  : "border-gray-100"
              } p-6 flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#3B82F6] text-white text-xs font-semibold">
                    <SparklesIcon className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#111111]">{plan.name}</h3>
                <p className="text-sm text-[#666666] mt-1">{plan.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#111111]">
                    {getPrice(plan)}
                  </span>
                  <span className="text-sm text-[#666666]">{getBillingText(plan)}</span>
                </div>
                {interval === "yearly" && plan.monthlyPrice > 0 && (
                  <p className="text-sm text-emerald-600 mt-1">
                    ${plan.yearlyPrice.toFixed(2)} billed yearly
                  </p>
                )}
              </div>

              <Button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full mb-6 ${
                  plan.popular
                    ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                    : "bg-white border border-gray-200 text-[#111111] hover:bg-gray-50"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  plan.cta
                )}
              </Button>

              <div className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#111111]">{feature}</span>
                  </div>
                ))}
                {plan.excluded.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 opacity-50">
                    <XMarkIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#666666]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { plans };
export default Pricing;
