import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, User, Mail, Key, Loader2, Sparkles, Video, Wand2, Zap } from "lucide-react";
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

  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(orb1Ref.current, { opacity: 0, scale: 0.5, duration: 1.8 }, 0);
      tl.from(orb2Ref.current, { opacity: 0, scale: 0.5, duration: 1.8 }, 0.3);
      tl.from(heroRef.current, { y: 40, opacity: 0, duration: 1 }, 0.2);
      tl.from(featuresRef.current, { y: 30, opacity: 0, duration: 0.8 }, 0.5);
      tl.from(formRef.current, { y: 30, opacity: 0, duration: 0.8 }, 0.7);
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

  const features = [
    { icon: Video, title: "AI Video Editor", desc: "Studio-grade editing powered by AI" },
    { icon: Wand2, title: "Smart Auto-Edit", desc: "Automatic cuts, zooms, and transitions" },
    { icon: Sparkles, title: "TikTok Effects", desc: "CapCut-style captions and animations" },
    { icon: Zap, title: "One-Click Export", desc: "Publish-ready videos in minutes" },
  ];

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "#000000", fontFamily: "'Inter', sans-serif" }}>
        {/* Background orbs */}
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 60%)", filter: "blur(60px)" }} />

        <div className="max-w-md w-full text-center relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8" style={{ animation: "scaleIn 0.5s ease-out" }}>
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            You're on the list
          </h2>
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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#000000", fontFamily: "'Inter', sans-serif" }}>
      {/* Background gradient orbs */}
      <div
        ref={orb1Ref}
        className="absolute top-[5%] left-[10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)", filter: "blur(60px)" }}
      />
      <div
        ref={orb2Ref}
        className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)", filter: "blur(50px)" }}
      />

      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)",
      }} />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
          <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
          <span className="logo-text">Navinta AI</span>
        </div>
        <button
          onClick={() => { setMode(mode === "join" ? "code" : "join"); setError(null); }}
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {mode === "join" ? "Have a code?" : "Join waitlist"}
        </button>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 relative z-10">
        {/* Hero */}
        <div ref={heroRef} className="text-center mb-10 max-w-2xl mx-auto">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-white/60 font-medium">Early access — limited spots</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[0.95] mb-5">
            Navinta AI
          </h1>
          <p className="text-lg md:text-xl text-white/40 max-w-lg mx-auto leading-relaxed">
            Agency-quality video production, powered by AI. No editing skills required.
          </p>
        </div>

        {/* Feature cards */}
        <div
          ref={featuresRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full mb-10"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-white/[0.03] border border-white/8 transition-all duration-500 hover:border-white/15 hover:bg-white/[0.05]"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-white/80 mb-1">{f.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div ref={formRef} className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-8" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <h2 className="text-xl font-bold text-white mb-2 text-center">
              {mode === "join" ? "Join the Waitlist" : "Enter Access Code"}
            </h2>
            <p className="text-sm text-white/30 text-center mb-6">
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
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all bg-white/[0.03]"
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
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all bg-white/[0.03]"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 px-1">{error}</p>
                )}

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
                    className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all bg-white/[0.03] tracking-widest font-mono"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 px-1">{error}</p>
                )}

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
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/20">
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
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="text-sm text-white/15">&copy; 2026 Navinta AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
