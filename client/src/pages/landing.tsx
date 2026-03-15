import { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useLocation } from "wouter";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@/hooks/useAuth";
import { ContactModal } from "@/components/ContactModal";

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
  const { signInWithGoogle, isAuthenticated, session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpInterval, setSignUpInterval] = useState<"monthly" | "yearly">("monthly");
  const hasCheckedPendingPlan = useRef(false);

  const triggerCheckout = async (planId: string, billingInterval: "monthly" | "yearly" = "monthly") => {
    console.log("[Checkout] SUBSCRIBE CLICKED", planId, billingInterval);
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
        console.error("[Checkout] No checkout URL received:", data);
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error("[Checkout] Error:", error);
      setLoadingPlan(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated && session?.access_token && !hasCheckedPendingPlan.current) {
      hasCheckedPendingPlan.current = true;
      const pendingPlan = sessionStorage.getItem("pendingPlan");
      const pendingInterval = sessionStorage.getItem("pendingInterval") as "monthly" | "yearly" | null;
      if (pendingPlan) {
        sessionStorage.removeItem("pendingPlan");
        sessionStorage.removeItem("pendingInterval");
        triggerCheckout(pendingPlan, pendingInterval || "monthly");
      }
    }
  }, [isAuthenticated, session?.access_token]);

  const handlePlanSelect = (planId: string, billingInterval: "monthly" | "yearly" = "monthly") => {
    if (planId === "free") {
      if (isAuthenticated) {
        setLocation("/onboarding");
      } else {
        signInWithGoogle();
      }
      setShowSignUpModal(false);
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem("pendingPlan", planId);
      sessionStorage.setItem("pendingInterval", billingInterval);
      signInWithGoogle();
      return;
    }
    setShowSignUpModal(false);
    triggerCheckout(planId, billingInterval);
  };

  const handleSignUpClick = () => {
    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowSignUpModal(true);
    }
  };

  const handleContinueFree = () => {
    setShowSignUpModal(false);
    if (isAuthenticated) {
      setLocation("/onboarding");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div className="min-h-screen text-white antialiased" style={{ fontFamily: "'Inter', sans-serif", background: "#000000" }}>
      <Navbar onSignUp={handleSignUpClick} />
      <HeroSection onGetStarted={handleSignUpClick} />
      <ProblemSection />
      <HowItWorksSection />
      <SolutionSection />
      <OutcomesSection />
      <ForWhoSection />
      <PricingSection onPlanSelect={handlePlanSelect} loadingPlan={loadingPlan} />
      <FAQSection />
      <FinalCTASection onGetStarted={handleSignUpClick} />
      <Footer />

      {showSignUpModal && (
        <SignUpModal
          onClose={() => setShowSignUpModal(false)}
          onSelectPlan={(planId) => handlePlanSelect(planId, signUpInterval)}
          onContinueFree={handleContinueFree}
          loadingPlan={loadingPlan}
          interval={signUpInterval}
          onIntervalChange={setSignUpInterval}
        />
      )}
    </div>
  );
}

function Navbar({ onSignUp }: { onSignUp: () => void }) {
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, signOut, signInWithGoogle } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDashboardClick = () => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      setShowSignInPrompt(true);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "py-3 bg-black/80 backdrop-blur-xl border-b border-white/5"
            : "py-5 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-12">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
            <span className="logo-text">Navinta AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[0.9rem] font-medium">
            <a href="#showcase" className="text-white/50 hover:text-white transition-colors duration-300">Features</a>
            <a href="#pricing" className="text-white/50 hover:text-white transition-colors duration-300">Pricing</a>
            <button onClick={handleDashboardClick} className="text-white/50 hover:text-white transition-colors duration-300">
              Dashboard
            </button>
            <button onClick={() => setShowContactModal(true)} className="text-white/50 hover:text-white transition-colors duration-300">
              Contact
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/40 hidden sm:inline">
                  {user?.email?.split('@')[0]}
                </span>
                <button onClick={signOut} className="px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:border-white/20 transition-all duration-300">
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={onSignUp}
                className="px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300"
                data-testid="button-login"
              >
                Get started
              </button>
            )}
          </div>
        </div>
      </nav>

      {showSignInPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSignInPrompt(false)} />
          <div className="relative bg-[#111111] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <button onClick={() => setShowSignInPrompt(false)} aria-label="Close dialog" className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors">
              <XMarkIcon className="w-5 h-5 text-white/40" aria-hidden="true" />
            </button>
            <h3 className="text-2xl font-semibold text-white mb-3">Sign in to continue</h3>
            <p className="text-white/40 mb-6">Sign in or create an account to access your dashboard.</p>
            <button
              onClick={() => { setShowSignInPrompt(false); signInWithGoogle(); }}
              className="bg-white text-black w-full py-3 rounded-full font-medium flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
    </>
  );
}

function SignUpModal({
  onClose, onSelectPlan, onContinueFree, loadingPlan, interval, onIntervalChange
}: {
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
  onContinueFree: () => void;
  loadingPlan: string | null;
  interval: "monthly" | "yearly";
  onIntervalChange: (interval: "monthly" | "yearly") => void;
}) {
  const plans = [
    { id: "starter", name: "Starter", tagline: "For creators getting started", monthlyPrice: 19.99, yearlyPrice: 214.99, popular: false, features: ["20 exports per day", "AI B-roll insertion", "No watermark", "Multi-shot videos"] },
    { id: "pro", name: "Pro", tagline: "Full creative power", monthlyPrice: 49.99, yearlyPrice: 549.99, popular: true, features: ["100 exports per day", "AI B-roll + AI Voice", "No watermark", "Priority support"] },
    { id: "studio", name: "Studio", tagline: "Unlimited everything", monthlyPrice: 99.99, yearlyPrice: 1149.99, popular: false, features: ["Unlimited exports", "All AI features", "Brand kit & templates", "Team collaboration"] }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111111] border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close dialog" className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors z-10">
          <XMarkIcon className="w-5 h-5 text-white/40" aria-hidden="true" />
        </button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Choose your plan</h2>
          <p className="text-white/40 mt-2">Start free, upgrade anytime</p>
        </div>
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/8">
            <button onClick={() => onIntervalChange("monthly")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${interval === "monthly" ? "bg-white text-black" : "text-white/40"}`}>Monthly</button>
            <button onClick={() => onIntervalChange("yearly")} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${interval === "yearly" ? "bg-white text-black" : "text-white/40"}`}>
              Yearly <span className={`text-xs px-1.5 py-0.5 rounded-full ${interval === "yearly" ? "bg-black/10" : "bg-emerald-500/20 text-emerald-400"}`}>-10%</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-2xl border p-5 ${plan.popular ? 'border-white/20 bg-white/[0.03]' : 'border-white/8'}`}>
              {plan.popular && <div className="mb-3"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-black">Most popular</span></div>}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-white/40">{plan.tagline}</p>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-semibold text-white">${interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}</span>
                <span className="text-white/40 text-sm">/{interval === "yearly" ? "year" : "month"}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => <li key={i} className="flex items-center gap-2 text-sm text-white/40"><span className="text-emerald-400 text-xs">&#10003;</span>{f}</li>)}
              </ul>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectPlan(plan.id); }} disabled={loadingPlan === plan.id}
                className={`w-full py-3 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${plan.popular ? "bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"}`}>
                {loadingPlan === plan.id ? "Redirecting..." : "Subscribe"}
              </button>
            </div>
          ))}
        </div>
        <div className="text-center">
          <button onClick={onContinueFree} className="text-white/40 hover:text-white text-sm font-medium underline underline-offset-2 transition-colors">Continue for free</button>
        </div>
      </div>
    </div>
  );
}

function PricingSection({ onPlanSelect, loadingPlan }: { onPlanSelect: (planId: string, interval: "monthly" | "yearly") => void; loadingPlan: string | null }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
      gsap.from(".pricing-card", {
        y: 60,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: gridRef.current, start: "top 85%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const plans = [
    { id: "free", name: "Free", tagline: "Explore Navinta AI", monthlyPrice: 0, yearlyPrice: 0, description: "For people who are curious", popular: false, features: ["1 content plan (1 week)", "3 videos total", "Single-shot only", "Basic AI script", "Watermark on export"] },
    { id: "starter", name: "Starter", tagline: "Create more content", monthlyPrice: 19.99, yearlyPrice: 214.99, description: "For creators getting started", popular: false, features: ["20 exports per day", "AI B-roll insertion", "No watermark", "Multi-shot videos", "Caption styling"] },
    { id: "pro", name: "Pro", tagline: "Full creative power", monthlyPrice: 49.99, yearlyPrice: 549.99, description: "For serious content creators", popular: true, features: ["100 exports per day", "AI B-roll insertion", "AI Voice generation", "No watermark", "Priority support"] },
    { id: "studio", name: "Studio", tagline: "Unlimited everything", monthlyPrice: 99.99, yearlyPrice: 1149.99, description: "For teams and agencies", popular: false, features: ["Unlimited exports", "All AI features", "Brand kit & templates", "Team collaboration", "Dedicated support"] },
  ];

  return (
    <section ref={sectionRef} id="pricing" className="py-32 px-6" style={{ background: "#000000" }}>
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-white/40 text-lg">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/8">
            <button onClick={() => setInterval("monthly")} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${interval === "monthly" ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}>Monthly</button>
            <button onClick={() => setInterval("yearly")} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${interval === "yearly" ? "bg-white text-black" : "text-white/40 hover:text-white/60"}`}>
              Yearly <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${interval === "yearly" ? "bg-black/10" : "bg-emerald-500/20 text-emerald-400"}`}>Save 10%</span>
            </button>
          </div>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div key={plan.id} className={`pricing-card rounded-2xl p-6 flex flex-col relative border transition-all duration-300 hover:border-white/15 ${plan.popular ? 'border-white/20 bg-white/[0.05]' : 'border-white/8 bg-white/[0.02]'}`}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-black">Most popular</span></div>}
              <div className="mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block mb-2 ${plan.popular ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50'}`}>{plan.name}</span>
                <p className="text-sm font-medium text-white/80">{plan.tagline}</p>
                <p className="text-white/30 text-xs mt-1">{plan.description}</p>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">${interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}</span>
                <span className="text-white/30 text-sm">{plan.id === "free" ? " forever" : ` / ${interval === "yearly" ? "year" : "month"}`}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-emerald-400 mt-0.5">&#10003;</span>
                    <span className="text-white/40">{f}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPlanSelect(plan.id, interval); }} disabled={loadingPlan === plan.id}
                className={`w-full py-3 rounded-full text-sm font-medium transition-all duration-300 disabled:opacity-50 ${plan.popular ? 'bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10'}`}>
                {loadingPlan === plan.id ? "Redirecting..." : (plan.id === "free" ? "Get Started Free" : "Subscribe")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5" style={{ background: "#000000" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-5 w-5 opacity-50" />
            <span className="text-sm text-white/30 font-medium">Navinta AI</span>
          </div>
          <div className="flex gap-8 text-sm text-white/30">
            <a href="/contact" className="hover:text-white/60 transition-colors">Contact</a>
            <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
          </div>
          <p className="text-sm text-white/20">&copy; 2026 Navinta AI</p>
        </div>
      </div>
    </footer>
  );
}
