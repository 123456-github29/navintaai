import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, User, Mail, Key, Loader2 } from "lucide-react";
import { gsap } from "gsap";

export default function Waitlist() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"join" | "code">("join");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(leftRef.current, { x: -60, opacity: 0, duration: 1.2 }, 0);
      tl.from(rightRef.current, { x: 60, opacity: 0, duration: 1.2 }, 0.15);
      tl.from(orbRef.current, { scale: 0.3, opacity: 0, duration: 2 }, 0);
      tl.from(".waitlist-stat", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, 0.6);
    });

    return () => ctx.revert();
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
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "#060606", fontFamily: "'Inter', sans-serif" }}>
        <div className="absolute top-[30%] left-[30%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)", filter: "blur(80px)" }} />

        <div className="max-w-md w-full text-center relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8" style={{ animation: "scaleIn 0.5s ease-out" }}>
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">You're on the list</h2>
          <p className="text-white/40 text-base leading-relaxed mb-2">
            Thanks, <span className="font-semibold text-white/80">{name}</span>. We'll send your access code to{" "}
            <span className="font-medium text-white/80">{email}</span> when your spot opens up.
          </p>
          <p className="text-sm text-white/20 mb-10">Keep an eye on your inbox.</p>
          <button
            onClick={() => { setJoined(false); setMode("code"); }}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Already have a code? Enter it here →
          </button>
        </div>

        <style>{`
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden" style={{ background: "#060606", fontFamily: "'Inter', sans-serif" }}>
      {/* Ambient orb */}
      <div
        ref={orbRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 30%, transparent 60%)", filter: "blur(60px)" }}
      />

      {/* Left panel - Brand / Product showcase */}
      <div ref={leftRef} className="lg:w-[55%] flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-16 lg:py-0 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-16">
          <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight text-white logo-text">Navinta AI</span>
        </div>

        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-amber-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400/80 font-medium">Early access — limited spots</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05] mb-6">
            Professional video,
            <br />
            <span style={{ background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              zero effort.
            </span>
          </h1>
          <p className="text-lg text-white/35 leading-relaxed mb-12 max-w-md">
            AI-powered video production that turns your ideas into agency-quality content. No editing skills, no production team.
          </p>

          {/* Stats */}
          <div className="flex gap-10">
            <div className="waitlist-stat">
              <div className="text-2xl font-bold text-white">10x</div>
              <div className="text-xs text-white/25 mt-1">Faster production</div>
            </div>
            <div className="waitlist-stat">
              <div className="text-2xl font-bold text-white">3 min</div>
              <div className="text-xs text-white/25 mt-1">Average export</div>
            </div>
            <div className="waitlist-stat">
              <div className="text-2xl font-bold text-white">94%</div>
              <div className="text-xs text-white/25 mt-1">Weekly retention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div ref={rightRef} className="lg:w-[45%] flex items-center justify-center px-8 lg:px-16 py-16 lg:py-0 relative z-10">
        <div className="w-full max-w-sm">
          {/* Form card */}
          <div className="rounded-2xl bg-white/[0.04] p-8 backdrop-blur-sm" style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
            <h2 className="text-xl font-bold text-white mb-1.5">
              {mode === "join" ? "Join the Waitlist" : "Enter Access Code"}
            </h2>
            <p className="text-sm text-white/30 mb-7">
              {mode === "join"
                ? "Be among the first to create with Navinta AI."
                : "Enter the code you received to get started."}
            </p>

            {mode === "join" ? (
              <form onSubmit={handleJoin} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all bg-white/[0.04]"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all bg-white/[0.04]"
                  />
                </div>

                {error && <p className="text-sm text-red-400 px-1">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-full text-sm font-semibold hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Join Waitlist
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRedeem} className="space-y-3">
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter access code"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all bg-white/[0.04] tracking-widest font-mono"
                  />
                </div>

                {error && <p className="text-sm text-red-400 px-1">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-full text-sm font-semibold hover:bg-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Unlock Access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-5 text-center">
              <button
                onClick={() => { setMode(mode === "join" ? "code" : "join"); setError(null); }}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                {mode === "join" ? "Already have a code?" : "Need to join the waitlist?"}
              </button>
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/20">
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Secure & private</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>No spam, ever</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Early access perks</span>
            </div>
          </div>

          {/* Navbar toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "join" ? "code" : "join"); setError(null); }}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {mode === "join" ? "Have an access code?" : "Join the waitlist instead"}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 py-6 text-center z-10">
        <p className="text-xs text-white/15">&copy; 2026 Navinta AI. All rights reserved.</p>
      </div>
    </div>
  );
}
