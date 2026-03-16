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
    <div className="min-h-screen text-gray-900 antialiased" style={{ fontFamily: "'Inter', sans-serif", background: "#FFFFFF" }}>
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
  const { isAuthenticated, user, signOut, signInWithGoogle } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "py-3 navbar-light"
            : "py-5 navbar-light-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-12">
          <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-gray-900">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
            <span className="logo-text">Navinta AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[0.85rem] font-medium">
            <a href="#showcase" className="text-gray-500 hover:text-gray-900 transition-colors duration-200">Features</a>
            <a href="#pricing" className="text-gray-500 hover:text-gray-900 transition-colors duration-200">Pricing</a>
            <button onClick={() => setShowContactModal(true)} className="text-gray-500 hover:text-gray-900 transition-colors duration-200">
              Contact
            </button>
            {!waitlistApproved && (
              <button onClick={onJoinWaitlist} className="text-gray-500 hover:text-gray-900 transition-colors duration-200">
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
                    className="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all duration-200"
                  >
                    Dashboard
                  </button>
                )}
                <button onClick={signOut} className="px-5 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all duration-200">
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={onGetStarted}
                className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 hover:shadow-[0_4px_16px_rgba(79,70,229,0.3)] transition-all duration-200"
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
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
        <div ref={modalRef} className="relative max-w-md w-full rounded-3xl border border-white/10 p-10 text-center" style={{ background: "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)", boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.08)" }}>
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/30" />
          </button>
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">You're on the list</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-2">
            Thanks, <span className="text-white/80 font-medium">{name}</span>. We'll send your access code to{" "}
            <span className="text-white/80 font-medium">{email}</span>.
          </p>
          <p className="text-xs text-white/20 mb-8">Keep an eye on your inbox.</p>
          <button
            onClick={() => { setJoined(false); setMode("code"); }}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Already have a code? Enter it here
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div ref={modalRef} className="relative max-w-md w-full rounded-3xl border border-white/10 p-8 md:p-10" style={{ background: "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)", boxShadow: "0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.08)" }}>
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 transition-colors">
          <X className="w-5 h-5 text-white/30" />
        </button>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/5 border border-white/8">
          <button
            onClick={() => { setMode("code"); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === "code" ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}
          >
            Enter Code
          </button>
          <button
            onClick={() => { setMode("join"); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${mode === "join" ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}
          >
            Join Waitlist
          </button>
        </div>

        {mode === "code" ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Enter Access Code</h2>
              <p className="text-sm text-white/30">Enter the code you received to unlock Navinta AI.</p>
            </div>
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  required
                  className="w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all bg-white/[0.03] tracking-[0.3em] font-mono text-center"
                />
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black rounded-full text-sm font-semibold hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Unlock Access <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Join the Waitlist</h2>
              <p className="text-sm text-white/30">Be among the first to create with Navinta AI.</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all bg-white/[0.03]"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all bg-white/[0.03]"
                />
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black rounded-full text-sm font-semibold hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Join Waitlist <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        )}

        {/* Trust signals */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/20">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50">
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
    <section id="pricing" className="relative py-28 px-6" style={{ background: "#F7F8FC" }}>
      {/* Subtle top border */}
      <div className="hr-fade absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="section-label mb-4">Pricing</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Choose the plan that fits your creative workflow. Upgrade or downgrade anytime.
          </p>

          <div className="flex justify-center mt-8">
            <div className="inline-flex items-center p-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
              <button
                onClick={() => setInterval("monthly")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  interval === "monthly"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval("yearly")}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  interval === "yearly"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Yearly
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  interval === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
              className={`relative flex flex-col rounded-2xl transition-all duration-300 pricing-card-light ${
                plan.popular ? "featured" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{plan.tagline}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900 tracking-tight">
                    {plan.monthlyPrice === 0
                      ? "Free"
                      : `$${interval === "monthly" ? plan.monthlyPrice : (plan.yearlyPrice / 12).toFixed(2)}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-gray-400 text-sm">
                      /{interval === "yearly" ? "mo, billed yearly" : "month"}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleChoosePlan(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center ${
                  plan.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !waitlistApproved ? (
                  "Join Waitlist to Unlock"
                ) : (
                  plan.cta
                )}
              </button>

              <div className="mt-6 pt-6 border-t border-gray-100 flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                  {plan.excluded.map((feature, index) => (
                    <li key={`excluded-${index}`} className="flex items-start gap-3">
                      <X className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-400">{feature}</span>
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
    <footer className="py-14 px-6" style={{ background: "#F7F8FC", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-6 w-6 opacity-70" />
            <span className="text-sm text-gray-500 font-semibold">Navinta AI</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="/contact" className="hover:text-gray-700 transition-colors duration-200">Contact</a>
            <a href="/privacy" className="hover:text-gray-700 transition-colors duration-200">Privacy</a>
            <a href="/terms" className="hover:text-gray-700 transition-colors duration-200">Terms</a>
          </div>
          <p className="text-sm text-gray-400">&copy; 2026 Navinta AI</p>
        </div>
      </div>
    </footer>
  );
}
