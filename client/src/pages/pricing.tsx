import { useState, useRef, useEffect } from "react";
import { CheckIcon, MinusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Key, Loader2, ArrowRight, X } from "lucide-react";

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [waitlistApproved, setWaitlistApproved] = useState(
    typeof window !== "undefined" && localStorage.getItem("waitlist_approved") === "true"
  );
  const [showWaitlistCodeModal, setShowWaitlistCodeModal] = useState(false);
  const [waitlistCode, setWaitlistCode] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const triggerCheckout = async (planId: string, billingInterval: "monthly" | "yearly") => {
    if (!["starter", "pro", "studio"].includes(planId)) return;

    setLoadingPlan(planId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://iqfrjomoggddxwteuigk.supabase.co";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnJqb21vZ2dkZHh3dGV1aWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTM5MDAsImV4cCI6MjA2MTYyOTkwMH0.VJD2Fy3F7B8s_0pRCfLOMGjRNVJMhmMNrlVcsYJXcwQ";

      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({ plan: planId, interval: billingInterval }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.replace(data.url);
      } else {
        setLoadingPlan(null);
      }
    } catch {
      setLoadingPlan(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated && session?.access_token && !hasCheckedPendingPlan.current) {
      const pendingPlan = sessionStorage.getItem("pendingPlan");
      const pendingInterval = sessionStorage.getItem("pendingInterval") as "monthly" | "yearly" | null;

      if (pendingPlan && pendingInterval) {
        hasCheckedPendingPlan.current = true;
        sessionStorage.removeItem("pendingPlan");
        sessionStorage.removeItem("pendingInterval");
        setTimeout(() => {
          triggerCheckout(pendingPlan, pendingInterval);
        }, 500);
      } else {
        hasCheckedPendingPlan.current = true;
      }
    }
  }, [isAuthenticated, session?.access_token]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistCode.trim()) return;
    setWaitlistLoading(true);
    setWaitlistError(null);

    try {
      const res = await fetch("/api/waitlist/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: waitlistCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Invalid code");
      localStorage.setItem("waitlist_approved", "true");
      setWaitlistApproved(true);
      setShowWaitlistCodeModal(false);
    } catch (err: any) {
      setWaitlistError(err.message);
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleChoosePlan = (e: React.MouseEvent<HTMLButtonElement>, planId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!waitlistApproved) {
      setShowWaitlistCodeModal(true);
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

    triggerCheckout(planId, interval);
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <CheckIcon className="h-5 w-5 mx-auto" style={{ color: "#0fa37e" }} />;
    }
    if (value === false) {
      return <MinusIcon className="h-5 w-5 mx-auto" style={{ color: "#d9d9e3" }} />;
    }
    return <span className="text-sm" style={{ color: "#6e6e80" }}>{value}</span>;
  };

  return (
    <div className="min-h-screen" style={{ background: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="nv-navbar fixed top-0 left-0 right-0 z-50 py-3">
        <div className="nv-container flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
            <span className="logo-text text-lg" style={{ color: "#202123" }}>Navinta AI</span>
          </a>
          <a href="/" className="nv-btn-outline text-sm">Back to home</a>
        </div>
      </nav>

      <div className="pt-28 pb-20">
        <div className="nv-container">
          {/* Header */}
          <section className="text-center space-y-5 mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: "#202123" }}>
              Simple, transparent pricing
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
              Whether you're just starting or publishing daily, Navinta scales with you.
            </p>

            <div className="flex justify-center pt-4">
              <div className="inline-flex items-center p-1 rounded-lg" style={{ background: "#f7f7f8", border: "1px solid #e5e5e5" }}>
                <button
                  onClick={() => setInterval("monthly")}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    interval === "monthly"
                      ? "bg-[#202123] text-white shadow-sm"
                      : "text-[#6e6e80] hover:text-[#202123]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setInterval("yearly")}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    interval === "yearly"
                      ? "bg-[#202123] text-white shadow-sm"
                      : "text-[#6e6e80] hover:text-[#202123]"
                  }`}
                >
                  Yearly
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    interval === "yearly" ? "bg-white/20 text-white" : "bg-[#ecfdf5] text-[#0fa37e]"
                  }`}>
                    Save 10%
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Plan Cards */}
          <section className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col p-6 rounded-xl transition-all duration-200 ${
                    plan.popular
                      ? "ring-2 ring-[#0fa37e] bg-white shadow-md"
                      : "bg-white border border-[#e5e5e5] hover:border-[#d1d1d1]"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: "#0fa37e" }}>
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: "#202123" }}>{plan.name}</h3>
                      <p className="text-sm" style={{ color: "#acacbe" }}>{plan.tagline}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: "#202123" }}>
                        ${interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                      </span>
                      <span style={{ color: "#acacbe" }}>
                        /{interval === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleChoosePlan(e, plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full h-11 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.popular ? "hover:opacity-90" : "hover:bg-gray-50"
                    }`}
                    style={plan.popular
                      ? { background: "#0fa37e", color: "#fff" }
                      : { background: "#fff", color: "#353740", border: "1px solid #d9d9e3" }
                    }
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />
                        Redirecting...
                      </span>
                    ) : !waitlistApproved ? (
                      "Enter Waitlist Code"
                    ) : (
                      plan.cta
                    )}
                  </button>

                  <div className="mt-6 pt-6 flex-1" style={{ borderTop: "1px solid #e5e5e5" }}>
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#0fa37e" }} />
                          <span className="text-sm" style={{ color: "#6e6e80" }}>{feature}</span>
                        </li>
                      ))}
                      {plan.excluded.map((feature, index) => (
                        <li key={`excluded-${index}`} className="flex items-start gap-3">
                          <XMarkIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#d9d9e3" }} />
                          <span className="text-sm" style={{ color: "#acacbe" }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Feature Comparison */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10" style={{ color: "#202123" }}>
              Compare all features
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e5e5" }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                      <th className="text-left p-4 lg:p-6 text-sm font-medium w-1/5" style={{ color: "#acacbe" }}>Feature</th>
                      <th className="p-4 lg:p-6 text-sm font-semibold text-center" style={{ color: "#6e6e80" }}>Free</th>
                      <th className="p-4 lg:p-6 text-sm font-semibold text-center" style={{ color: "#6e6e80" }}>Starter</th>
                      <th className="p-4 lg:p-6 text-sm font-semibold text-center" style={{ color: "#202123", background: "rgba(15,163,126,0.03)" }}>Pro</th>
                      <th className="p-4 lg:p-6 text-sm font-semibold text-center" style={{ color: "#6e6e80" }}>Studio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureComparison.map((row, index) => (
                      <tr key={index} style={{ borderBottom: index !== featureComparison.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                        <td className="p-4 lg:p-6 text-sm font-medium" style={{ color: "#6e6e80" }}>{row.feature}</td>
                        <td className="p-4 lg:p-6 text-center">{renderFeatureValue(row.free)}</td>
                        <td className="p-4 lg:p-6 text-center">{renderFeatureValue(row.starter)}</td>
                        <td className="p-4 lg:p-6 text-center" style={{ background: "rgba(15,163,126,0.03)" }}>{renderFeatureValue(row.pro)}</td>
                        <td className="p-4 lg:p-6 text-center">{renderFeatureValue(row.studio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-10" style={{ color: "#202123" }}>
              Frequently asked questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-xl overflow-hidden" style={{ border: openFaq === index ? "1px solid #d1d1d1" : "1px solid #e5e5e5" }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4"
                  >
                    <span className="font-semibold text-[0.9375rem]" style={{ color: "#202123" }}>{faq.question}</span>
                    <svg
                      className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
                      style={{ color: "#acacbe", transform: openFaq === index ? "rotate(180deg)" : "rotate(0deg)" }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-5">
                      <p className="text-sm leading-relaxed" style={{ color: "#6e6e80" }}>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="text-center py-16 px-6 rounded-xl" style={{ background: "#202123" }}>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Start recording with direction, not guesswork
            </h2>
            <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
              Join thousands of creators who use Navinta to plan, record, and publish with confidence.
            </p>
            <button
              type="button"
              onClick={(e) => handleChoosePlan(e, "free")}
              className="h-12 px-8 rounded-lg text-base font-semibold transition-all duration-200 hover:opacity-90"
              style={{ background: "#0fa37e", color: "#fff" }}
            >
              Get started with Navinta AI
            </button>
          </section>

          <div className="mt-14 text-center space-y-4">
            {!waitlistApproved && (
              <div className="mb-6 p-5 rounded-xl inline-block" style={{ background: "#f7f7f8", border: "1px solid #e5e5e5" }}>
                <p className="text-sm mb-3" style={{ color: "#6e6e80" }}>Have a waitlist access code?</p>
                <button
                  onClick={() => setShowWaitlistCodeModal(true)}
                  className="nv-btn-dark text-sm"
                >
                  Enter Access Code
                </button>
              </div>
            )}
            <p className="text-sm" style={{ color: "#acacbe" }}>
              All plans include 24/7 email support and automatic updates.
            </p>
            <p className="text-xs" style={{ color: "#d9d9e3" }}>
              By continuing you agree to Navinta AI{" "}
              <a href="/terms" className="font-medium hover:underline" style={{ color: "#acacbe" }}>Terms</a>{" "}
              and{" "}
              <a href="/privacy" className="font-medium hover:underline" style={{ color: "#acacbe" }}>Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {/* Waitlist Code Modal */}
      {showWaitlistCodeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWaitlistCodeModal(false)} />
          <div className="relative max-w-md w-full rounded-xl p-8 md:p-10" style={{ background: "#fff", border: "1px solid #e5e5e5", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <button onClick={() => setShowWaitlistCodeModal(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" style={{ color: "#acacbe" }} />
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#202123" }}>Enter Access Code</h2>
              <p className="text-sm" style={{ color: "#6e6e80" }}>Enter your waitlist code to unlock checkout.</p>
            </div>
            <form onSubmit={handleRedeemCode} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#acacbe" }} />
                <input
                  type="text"
                  value={waitlistCode}
                  onChange={(e) => setWaitlistCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg text-sm placeholder:text-[#d9d9e3] focus:outline-none focus:ring-2 focus:ring-[#0fa37e]/30 transition-all tracking-[0.3em] font-mono text-center"
                  style={{ border: "1px solid #d9d9e3", color: "#202123" }}
                />
              </div>
              {waitlistError && <p className="text-sm text-red-500 text-center">{waitlistError}</p>}
              <button
                type="submit"
                disabled={waitlistLoading || !waitlistCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                style={{ background: "#202123", color: "#fff" }}
              >
                {waitlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Unlock Access <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
