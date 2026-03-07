import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, MinusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const plans = [
  {
    id: "free",
    name: "Free",
    tagline: "For trying Navinta",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Try Free",
    features: [
      "Director onboarding (limited)",
      "1 content plan",
      "Record in Director Mode",
      "Watermarked exports",
    ],
    excluded: ["AI B-roll", "AI captions", "Priority processing"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For new creators",
    monthlyPrice: 19.99,
    yearlyPrice: 214.99,
    cta: "Start Starter",
    features: [
      "8 videos/month",
      "AI content plan",
      "Director Mode",
      "Auto cuts",
      "Captions (basic)",
      "Export without watermark",
    ],
    excluded: ["AI B-roll", "Priority AI"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious creators",
    monthlyPrice: 49.99,
    yearlyPrice: 549.99,
    popular: true,
    cta: "Go Pro",
    features: [
      "Unlimited videos",
      "Smart shot detection",
      "B-roll insertion",
      "Advanced captions",
      "Multi-platform exports",
      "Faster processing",
      "Priority AI",
    ],
    excluded: [],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "For teams & serious creators",
    monthlyPrice: 99.99,
    yearlyPrice: 1149.99,
    cta: "Join Studio",
    features: [
      "Everything in Pro",
      "Team workspace",
      "Brand kit",
      "Multiple content plans",
      "Advanced analytics",
      "Early access features",
    ],
    excluded: [],
  },
];

const featureComparison = [
  { feature: "Content planning", free: "1 plan", starter: "Unlimited", pro: "Unlimited", studio: "Unlimited" },
  { feature: "Director Mode", free: true, starter: true, pro: true, studio: true },
  { feature: "Shot detection", free: false, starter: "Basic", pro: "Smart", studio: "Advanced" },
  { feature: "Auto editing", free: false, starter: true, pro: true, studio: true },
  { feature: "B-roll", free: false, starter: false, pro: true, studio: true },
  { feature: "Captions", free: false, starter: "Basic", pro: "Advanced", studio: "Advanced" },
  { feature: "Export quality", free: "720p", starter: "1080p", pro: "4K", studio: "4K" },
  { feature: "Watermark", free: true, starter: false, pro: false, studio: false },
  { feature: "Platforms", free: "1", starter: "2", pro: "4", studio: "Unlimited" },
  { feature: "Team support", free: false, starter: false, pro: false, studio: true },
  { feature: "Brand kit", free: false, starter: false, pro: false, studio: true },
  { feature: "Analytics", free: false, starter: "Basic", pro: "Standard", studio: "Advanced" },
  { feature: "Support level", free: "Community", starter: "Email", pro: "Priority", studio: "Dedicated" },
];

const useCases = [
  {
    plan: "Free",
    title: "Just exploring",
    description: "You're curious about AI-powered video creation and want to see what Navinta can do before committing.",
  },
  {
    plan: "Starter",
    title: "Building consistency",
    description: "You're a new creator building a publishing habit. You need guidance and tools to stay consistent.",
  },
  {
    plan: "Pro",
    title: "Ready to grow",
    description: "You're serious about content. You need professional features to stand out and grow your audience.",
  },
  {
    plan: "Studio",
    title: "Scaling production",
    description: "You're a team or agency producing content at scale. You need collaboration tools and advanced analytics.",
  },
];

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
  },
  {
    question: "Can I upgrade or downgrade?",
    answer: "Absolutely. You can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your billing period.",
  },
  {
    question: "What happens to my videos if I cancel?",
    answer: "Your exported videos are yours to keep forever. However, you'll lose access to premium features and any videos in progress may have watermarks applied.",
  },
  {
    question: "Is there a free trial?",
    answer: "Our Free plan lets you try Navinta with limited features. This way you can experience the product before upgrading to a paid plan.",
  },
  {
    question: "Do you charge per video?",
    answer: "No, we don't charge per video. Our plans are based on monthly access to features, with different tiers offering different capabilities.",
  },
  {
    question: "Can I use it for clients?",
    answer: "Yes! Our Pro and Studio plans are designed for professional use. Studio includes team features perfect for agencies managing multiple clients.",
  },
];

export default function Pricing() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { signInWithGoogle, isAuthenticated, session } = useAuth();
  const [, setLocation] = useLocation();
  const hasCheckedPendingPlan = useRef(false);

  const [videosPerMonth, setVideosPerMonth] = useState(20);
  const [videoLength, setVideoLength] = useState(120);
  const [platforms, setPlatforms] = useState(2);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const getRecommendedPlan = () => {
    if (videosPerMonth <= 8 && videoLength <= 60 && platforms <= 1) return "free";
    if (videosPerMonth <= 20 && videoLength <= 120 && platforms <= 2) return "starter";
    if (videosPerMonth <= 50 && platforms <= 4) return "pro";
    return "studio";
  };

  const recommendedPlan = getRecommendedPlan();

  const triggerCheckout = async (planId: string, billingInterval: "monthly" | "yearly") => {
    console.log("[Checkout] SUBSCRIBE CLICKED", planId, billingInterval);
    if (!["starter", "pro", "studio"].includes(planId)) return;
    
    setLoadingPlan(planId);
    try {
      console.log("[Checkout] Creating checkout session via Supabase Edge Function...");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://iqfrjomoggddxwteuigk.supabase.co";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnJqb21vZ2dkZHh3dGV1aWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTM5MDAsImV4cCI6MjA2MTYyOTkwMH0.VJD2Fy3F7B8s_0pRCfLOMGjRNVJMhmMNrlVcsYJXcwQ";
      
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({
          plan: planId,
          interval: billingInterval,
        }),
      });
      const data = await response.json();
      console.log("[Checkout] Response:", data);
      if (data.url) {
        console.log("[Checkout] REDIRECTING TO STRIPE:", data.url);
        window.location.replace(data.url);
      } else {
        console.error("[Checkout] No checkout URL received:", data);
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error("[Checkout] Error:", error);
      setLoadingPlan(null);
    }
  };

  useEffect(() => {
    console.log("[Pricing] Auth check - isAuthenticated:", isAuthenticated, "hasToken:", !!session?.access_token, "checked:", hasCheckedPendingPlan.current);
    
    if (isAuthenticated && session?.access_token && !hasCheckedPendingPlan.current) {
      const pendingPlan = sessionStorage.getItem("pendingPlan");
      const pendingInterval = sessionStorage.getItem("pendingInterval") as "monthly" | "yearly" | null;
      
      console.log("[Pricing] Pending checkout:", pendingPlan, pendingInterval);
      
      if (pendingPlan && pendingInterval) {
        hasCheckedPendingPlan.current = true;
        sessionStorage.removeItem("pendingPlan");
        sessionStorage.removeItem("pendingInterval");
        console.log("[Pricing] Triggering checkout for pending plan:", pendingPlan);
        setTimeout(() => {
          triggerCheckout(pendingPlan, pendingInterval);
        }, 500);
      } else {
        hasCheckedPendingPlan.current = true;
      }
    }
  }, [isAuthenticated, session?.access_token]);

  const handleChoosePlan = (e: React.MouseEvent<HTMLButtonElement>, planId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("PLAN BUTTON CLICKED:", planId);
    
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

    triggerCheckout(planId, interval);
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <CheckIcon className="h-5 w-5 text-emerald-500 mx-auto" />;
    }
    if (value === false) {
      return <MinusIcon className="h-5 w-5 text-gray-300 mx-auto" />;
    }
    return <span className="text-sm text-[#111111]">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-gray-100/50 to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-gray-100/30 to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <section className="text-center space-y-6 mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-[#111111] max-w-3xl mx-auto leading-tight">
            Simple, transparent pricing for creators who want consistency
          </h1>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto">
            Whether you're just starting or publishing daily, Navinta scales with you.
          </p>

          <div className="flex flex-col items-center gap-3 pt-4">
            <div className="inline-flex items-center p-1 rounded-full bg-white border border-gray-100 shadow-sm">
              <button
                onClick={() => setInterval("monthly")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  interval === "monthly"
                    ? "bg-[#111111] text-white shadow-sm"
                    : "text-[#666666] hover:text-[#111111]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval("yearly")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  interval === "yearly"
                    ? "bg-[#111111] text-white shadow-sm"
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
            <p className="text-sm text-[#666666]">Save 10% with yearly plans</p>
          </div>
        </section>

        <section className="mb-20">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 lg:p-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#111111] text-center mb-8">
              Find the right plan for you
            </h2>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#111111]">Videos per month</label>
                  <span className="text-sm font-semibold text-[#111111]">{videosPerMonth}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={videosPerMonth}
                  onChange={(e) => setVideosPerMonth(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-xs text-[#666666]">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#111111]">Average video length</label>
                  <span className="text-sm font-semibold text-[#111111]">
                    {videoLength < 60 ? `${videoLength}s` : `${Math.floor(videoLength / 60)}:${String(videoLength % 60).padStart(2, '0')}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="30"
                  value={videoLength}
                  onChange={(e) => setVideoLength(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-xs text-[#666666]">
                  <span>30s</span>
                  <span>5 min</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#111111]">Platforms you publish to</label>
                  <span className="text-sm font-semibold text-[#111111]">{platforms}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={platforms}
                  onChange={(e) => setPlatforms(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-xs text-[#666666]">
                  <span>1</span>
                  <span>4+</span>
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 bg-gray-50 rounded-3xl border border-gray-200 text-center">
              <p className="text-sm text-[#666666] mb-2">Recommended plan for your workflow</p>
              <p className="text-2xl font-bold text-[#111111] capitalize">{recommendedPlan}</p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isRecommended = plan.id === recommendedPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col p-6 rounded-3xl bg-white border-2 transition-all duration-300 hover:shadow-xl ${
                    plan.popular
                      ? "border-[#111111] shadow-lg shadow-black/5"
                      : isRecommended
                      ? "border-[#111111]/50 shadow-md"
                      : "border-gray-100 shadow-sm"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#111111] text-white shadow-md">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#111111]">{plan.name}</h3>
                      <p className="text-sm text-[#666666]">{plan.tagline}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[#111111]">
                        ${interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                      </span>
                      <span className="text-[#666666]">
                        /{interval === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleChoosePlan(e, plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full h-12 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                      plan.popular
                        ? "bg-[#111111] text-white hover:opacity-90 shadow-md"
                        : "bg-white border border-gray-200 text-[#111111] hover:bg-gray-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Redirecting...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>

                  <div className="mt-6 pt-6 border-t border-gray-100 flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-[#111111]">{feature}</span>
                        </li>
                      ))}
                      {plan.excluded.map((feature, index) => (
                        <li key={`excluded-${index}`} className="flex items-start gap-3">
                          <XMarkIcon className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-400">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#111111] text-center mb-10">
            Compare all features
          </h2>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 lg:p-6 text-sm font-medium text-[#666666] w-1/5">Feature</th>
                    <th className="p-4 lg:p-6 text-sm font-semibold text-[#111111] text-center">Free</th>
                    <th className="p-4 lg:p-6 text-sm font-semibold text-[#111111] text-center">Starter</th>
                    <th className="p-4 lg:p-6 text-sm font-semibold text-[#111111] text-center bg-gray-50">Pro</th>
                    <th className="p-4 lg:p-6 text-sm font-semibold text-[#111111] text-center">Studio</th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((row, index) => (
                    <tr key={index} className={index !== featureComparison.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="p-4 lg:p-6 text-sm text-[#111111] font-medium">{row.feature}</td>
                      <td className="p-4 lg:p-6 text-center">{renderFeatureValue(row.free)}</td>
                      <td className="p-4 lg:p-6 text-center">{renderFeatureValue(row.starter)}</td>
                      <td className="p-4 lg:p-6 text-center bg-gray-50">{renderFeatureValue(row.pro)}</td>
                      <td className="p-4 lg:p-6 text-center">{renderFeatureValue(row.studio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#111111] text-center mb-10">
            Who each plan is for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-[#111111] mb-4">
                  {useCase.plan}
                </span>
                <h3 className="text-lg font-bold text-[#111111] mb-2">{useCase.title}</h3>
                <p className="text-sm text-[#666666] leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#111111] text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-6 text-left flex justify-between items-center gap-4"
                >
                  <span className="font-medium text-[#111111]">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-[#666666] transition-transform duration-200 flex-shrink-0 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-sm text-[#666666] leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#111111] mb-4">
            Start recording with direction, not guesswork
          </h2>
          <p className="text-lg text-[#666666] max-w-2xl mx-auto mb-8">
            Join thousands of creators who use Navinta to plan, record, and publish with confidence.
          </p>
          <button
            type="button"
            onClick={(e) => handleChoosePlan(e, "free")}
            className="h-14 px-8 rounded-full text-base font-medium bg-[#111111] text-white hover:opacity-90 shadow-lg shadow-black/10 transition-all duration-200"
          >
            Get started with Navinta AI
          </button>
        </section>

        <div className="mt-16 text-center space-y-4">
          <p className="text-sm text-[#666666]">
            All plans include 24/7 email support and automatic updates.
          </p>
          <p className="text-xs text-[#666666]">
            By continuing you agree to Navinta AI{" "}
            <a href="/terms" className="text-[#111111] font-medium hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-[#111111] font-medium hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
