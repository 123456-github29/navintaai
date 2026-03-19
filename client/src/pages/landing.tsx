import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@/hooks/useAuth";
import { ContactModal } from "@/components/ContactModal";
import { Key, Loader2, ArrowRight, Mail, User, CheckCircle, X, Check } from "lucide-react";

function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      const progress = total > 0 ? scrolled / total : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={barRef}
      className="scroll-progress-bar"
      style={{ transform: "scaleX(0)" }}
    />
  );
}

gsap.registerPlugin(ScrollTrigger);

import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import OutcomesSection from "@/components/landing/OutcomesSection";
import ForWhoSection from "@/components/landing/ForWhoSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  const waitlistApproved = typeof window !== "undefined" && localStorage.getItem("waitlist_approved") === "true";

  const handleGetStarted = () => {
    if (waitlistApproved) {
      if (isAuthenticated) {
        setLocation("/dashboard");
      } else {
        signInWithGoogle();
      }
    } else {
      setShowWaitlistModal(true);
    }
  };

  return (
    <div className="min-h-screen antialiased" style={{ fontFamily: "'Inter', sans-serif", background: "#FFFFFF", color: "#202123" }}>
      <ScrollProgressBar />
      <Navbar onJoinWaitlist={() => setShowWaitlistModal(true)} onGetStarted={handleGetStarted} waitlistApproved={waitlistApproved} />
      <HeroSection onGetStarted={handleGetStarted} waitlistApproved={waitlistApproved} />
      <ProblemSection />
      <HowItWorksSection />
      <SolutionSection />
      <OutcomesSection />
      <LandingPricingSection onJoinWaitlist={() => setShowWaitlistModal(true)} waitlistApproved={waitlistApproved} />
      <ForWhoSection />
      <FAQSection />
      <FinalCTASection onGetStarted={handleGetStarted} waitlistApproved={waitlistApproved} />
      <Footer />

      {showWaitlistModal && (
        <WaitlistModal onClose={() => setShowWaitlistModal(false)} />
      )}
    </div>
  );
}

function Navbar({ onJoinWaitlist, onGetStarted, waitlistApproved }: { onJoinWaitlist: () => void; onGetStarted: () => void; waitlistApproved: boolean }) {
  const [showContactModal, setShowContactModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, signOut } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "nv-navbar py-3" : "nv-navbar-transparent py-5"
        }`}
      >
        <div className="nv-container flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
            <span className="logo-text text-lg" style={{ color: "#202123" }}>Navinta AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "#6e6e80" }}>
            <a href="#showcase" className="hover:text-[#202123] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#202123] transition-colors">Pricing</a>
            <a href="/how-it-works" className="hover:text-[#202123] transition-colors">How It Works</a>
            <button onClick={() => setShowContactModal(true)} className="hover:text-[#202123] transition-colors">
              Contact
            </button>
            {!waitlistApproved && (
              <button onClick={onJoinWaitlist} className="hover:text-[#202123] transition-colors">
                Join Waitlist
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {waitlistApproved && (
                  <button
                    onClick={() => setLocation("/dashboard")}
                    className="nv-btn-primary"
                  >
                    Dashboard
                  </button>
                )}
                <button onClick={signOut} className="nv-btn-outline text-sm">
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={onGetStarted}
                className="nv-btn-dark"
                data-testid="button-login"
              >
                {waitlistApproved ? "Sign in" : "Get Early Access"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
    </>
  );
}

function WaitlistModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"join" | "code">("code");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.from(modalRef.current, { scale: 0.95, opacity: 0, duration: 0.3, ease: "power2.out" });
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join waitlist");
      setJoined(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Invalid code");
      localStorage.setItem("waitlist_approved", "true");
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div ref={modalRef} className="relative max-w-md w-full rounded-xl p-10 text-center" style={{ background: "#fff", border: "1px solid #e5e5e5", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: "#acacbe" }} />
          </button>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(15,163,126,0.1)" }}>
            <CheckCircle className="w-7 h-7" style={{ color: "#0fa37e" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#202123" }}>You're on the list</h2>
          <p className="text-sm leading-relaxed mb-2" style={{ color: "#6e6e80" }}>
            Thanks, <span className="font-semibold" style={{ color: "#202123" }}>{name}</span>. We'll send your access code to{" "}
            <span className="font-semibold" style={{ color: "#202123" }}>{email}</span>.
          </p>
          <p className="text-xs mb-8" style={{ color: "#acacbe" }}>Keep an eye on your inbox.</p>
          <button
            onClick={() => { setJoined(false); setMode("code"); }}
            className="text-sm font-medium transition-colors"
            style={{ color: "#0fa37e" }}
          >
            Already have a code? Enter it here
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={modalRef} className="relative max-w-md w-full rounded-xl p-8 md:p-10" style={{ background: "#fff", border: "1px solid #e5e5e5", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" style={{ color: "#acacbe" }} />
        </button>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: "#f7f7f8", border: "1px solid #e5e5e5" }}>
          <button
            onClick={() => { setMode("code"); setError(null); }}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${mode === "code" ? "bg-white shadow-sm" : ""}`}
            style={{ color: mode === "code" ? "#202123" : "#acacbe" }}
          >
            Enter Code
          </button>
          <button
            onClick={() => { setMode("join"); setError(null); }}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${mode === "join" ? "bg-white shadow-sm" : ""}`}
            style={{ color: mode === "join" ? "#202123" : "#acacbe" }}
          >
            Join Waitlist
          </button>
        </div>

        {mode === "code" ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#202123" }}>Enter Access Code</h2>
              <p className="text-sm" style={{ color: "#6e6e80" }}>Enter the code you received to unlock Navinta AI.</p>
            </div>
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#acacbe" }} />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg text-sm placeholder:text-[#d9d9e3] focus:outline-none focus:ring-2 focus:ring-[#0fa37e]/30 transition-all tracking-[0.3em] font-mono text-center"
                  style={{ border: "1px solid #d9d9e3", color: "#202123" }}
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                style={{ background: "#202123", color: "#fff" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Unlock Access <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#202123" }}>Join the Waitlist</h2>
              <p className="text-sm" style={{ color: "#6e6e80" }}>Be among the first to create with Navinta AI.</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#acacbe" }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg text-sm placeholder:text-[#d9d9e3] focus:outline-none focus:ring-2 focus:ring-[#0fa37e]/30 transition-all"
                  style={{ border: "1px solid #d9d9e3", color: "#202123" }}
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#acacbe" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg text-sm placeholder:text-[#d9d9e3] focus:outline-none focus:ring-2 focus:ring-[#0fa37e]/30 transition-all"
                  style={{ border: "1px solid #d9d9e3", color: "#202123" }}
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                style={{ background: "#202123", color: "#fff" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Join Waitlist <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-6 text-xs" style={{ color: "#acacbe" }}>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>No spam</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const landingPlans = [
  {
    id: "free",
    name: "Free",
    tagline: "For trying Navinta",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Get Started Free",
    features: ["3 exports per day", "Director Mode recording", "AI Content Planning", "Watermarked exports"],
    excluded: ["AI B-roll", "AI Voice", "Auto-Editing"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For new creators",
    monthlyPrice: 19.99,
    yearlyPrice: 215.88,
    cta: "Start Creating",
    features: ["20 exports per day", "AI Content Planning", "Director Mode recording", "AI B-roll insertion", "Export without watermark"],
    excluded: ["AI Voice", "Auto-Editing"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious creators",
    monthlyPrice: 49.99,
    yearlyPrice: 539.88,
    cta: "Go Pro",
    popular: true,
    features: ["100 exports per day", "AI Content Planning", "Director Mode recording", "AI B-roll insertion", "AI Voice generation", "Auto-Editing features", "Priority processing"],
    excluded: [],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "For teams & agencies",
    monthlyPrice: 99.99,
    yearlyPrice: 1079.88,
    cta: "Join Studio",
    features: ["Unlimited exports", "Everything in Pro", "Team workspace", "Brand kit", "Advanced analytics", "Early access features"],
    excluded: [],
  },
];

function LandingPricingSection({ onJoinWaitlist, waitlistApproved }: { onJoinWaitlist: () => void; waitlistApproved: boolean }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const { signInWithGoogle, isAuthenticated, session } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleChoosePlan = async (planId: string) => {
    if (!waitlistApproved) {
      onJoinWaitlist();
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://iqfrjomoggddxwteuigk.supabase.co";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZnJqb21vZ2dkZHh3dGV1aWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTM5MDAsImV4cCI6MjA2MTYyOTkwMH0.VJD2Fy3F7B8s_0pRCfLOMGjRNVJMhmMNrlVcsYJXcwQ";
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": supabaseAnonKey,
        },
        body: JSON.stringify({ plan: planId, interval }),
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

  return (
    <section id="pricing" className="nv-section" style={{ background: "#f7f7f8" }}>
      <div className="nv-container">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: "#202123" }}>
            Simple, transparent pricing
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
            Choose the plan that fits your creative workflow. Upgrade or downgrade anytime.
          </p>

          <div className="flex justify-center mt-8">
            <div className="inline-flex items-center p-1 rounded-lg" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
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
                  interval === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-[#ecfdf5] text-[#0fa37e]"
                }`}>
                  Save 10%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {landingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl p-6 transition-all duration-200 ${
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
                  <h3 className="text-lg font-bold" style={{ color: "#202123" }}>{plan.name}</h3>
                  <p className="text-sm mt-0.5" style={{ color: "#acacbe" }}>{plan.tagline}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight" style={{ color: "#202123" }}>
                    {plan.monthlyPrice === 0
                      ? "Free"
                      : `$${interval === "monthly" ? plan.monthlyPrice : (plan.yearlyPrice / 12).toFixed(2)}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-sm" style={{ color: "#acacbe" }}>
                      /{interval === "yearly" ? "mo" : "month"}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleChoosePlan(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full h-11 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? "text-white hover:opacity-90"
                    : "hover:bg-gray-50"
                }`}
                style={plan.popular
                  ? { background: "#0fa37e", color: "#fff" }
                  : { background: "#fff", color: "#353740", border: "1px solid #d9d9e3" }
                }
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !waitlistApproved ? (
                  "Join Waitlist to Unlock"
                ) : (
                  plan.cta
                )}
              </button>

              <div className="mt-6 pt-6 flex-1" style={{ borderTop: "1px solid #e5e5e5" }}>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#0fa37e" }} />
                      <span className="text-sm" style={{ color: "#6e6e80" }}>{feature}</span>
                    </li>
                  ))}
                  {plan.excluded.map((feature, index) => (
                    <li key={`excluded-${index}`} className="flex items-start gap-3">
                      <X className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#d9d9e3" }} />
                      <span className="text-sm" style={{ color: "#acacbe" }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6" style={{ background: "#f7f7f8", borderTop: "1px solid #e5e5e5" }}>
      <div className="nv-container">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-6 w-6 opacity-70" />
            <span className="text-sm font-semibold" style={{ color: "#6e6e80" }}>Navinta AI</span>
          </div>
          <div className="flex gap-8 text-sm" style={{ color: "#acacbe" }}>
            <a href="/how-it-works" className="hover:text-[#202123] transition-colors">How It Works</a>
            <a href="/contact" className="hover:text-[#202123] transition-colors">Contact</a>
            <a href="/privacy" className="hover:text-[#202123] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#202123] transition-colors">Terms</a>
          </div>
          <p className="text-sm" style={{ color: "#acacbe" }}>&copy; 2026 Navinta AI</p>
        </div>
      </div>
    </footer>
  );
}
