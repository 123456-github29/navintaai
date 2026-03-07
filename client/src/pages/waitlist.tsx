import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, User, Mail, Key, Loader2, Sparkles, Video, Wand2, Zap } from "lucide-react";

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div
          className="max-w-md w-full text-center transition-all duration-700 ease-out"
          style={{ opacity: 1, transform: "translateY(0)" }}
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-[scaleIn_0.5s_ease-out]">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-[#111827] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            You're on the list
          </h2>
          <p className="text-[#6B7280] text-base leading-relaxed mb-2">
            Thanks, <span className="font-semibold text-[#111827]">{name}</span>. We'll send your access code to{" "}
            <span className="font-medium text-[#111827]">{email}</span> when your spot opens up.
          </p>
          <p className="text-sm text-[#9CA3AF] mb-10">Keep an eye on your inbox.</p>
          <button
            onClick={() => { setJoined(false); setMode("code"); }}
            className="text-sm text-[#135BEC] hover:underline font-medium"
          >
            Already have a code? Enter it here
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
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#111827]">
          <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
          Navinta AI
        </div>
        <button
          onClick={() => { setMode(mode === "join" ? "code" : "join"); setError(null); }}
          className="text-sm font-medium text-[#135BEC] hover:text-[#0F4BD6] transition-colors"
        >
          {mode === "join" ? "Have a code?" : "Join waitlist"}
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div
          ref={heroRef}
          className="text-center mb-10 max-w-2xl mx-auto transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
          }}
        >
          <div className="mx-auto mb-8 rounded-3xl min-h-[140px] md:min-h-[180px] flex items-center justify-center relative overflow-hidden">
            <div
              className="absolute inset-[-20%] z-0"
              style={{
                background:
                  "radial-gradient(ellipse at 25% 35%, #ddd6fe 0%, transparent 50%), radial-gradient(ellipse at 75% 65%, #fecdd3 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, #cffafe 0%, transparent 55%), #faf5ff",
              }}
            />
            <div className="relative z-10 px-6 py-10">
              <h1
                className="text-5xl md:text-6xl font-semibold tracking-tighter text-[#111111] mb-4 select-none"
              >
                Navinta AI
              </h1>
              <p className="text-lg md:text-xl text-[#444444] max-w-lg mx-auto leading-relaxed">
                Promote yourself with agency-quality video — without the agency price tag.
              </p>
            </div>
          </div>
        </div>

        <div
          ref={featuresRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full mb-10 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transitionDelay: "200ms",
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-50/80 border border-gray-100 transition-all duration-500 ease-out hover:shadow-md hover:-translate-y-0.5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${300 + i * 100}ms`,
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-3 shadow-sm">
                <f.icon className="w-5 h-5 text-[#135BEC]" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827] mb-1">{f.title}</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div
          ref={formRef}
          className="w-full max-w-md transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transitionDelay: "500ms",
          }}
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-100/50 p-8">
            <h2 className="text-2xl font-bold text-[#111827] mb-2 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
              {mode === "join" ? "Join the Waitlist" : "Enter Access Code"}
            </h2>
            <p className="text-sm text-[#9CA3AF] text-center mb-6">
              {mode === "join"
                ? "Be among the first to create with Navinta AI."
                : "Enter the code you received to get started."}
            </p>

            {mode === "join" ? (
              <form onSubmit={handleJoin} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-all bg-white"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-all bg-white"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 px-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#111827] text-white rounded-full text-sm font-medium hover:bg-[#1F2937] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-gray-200/50 active:scale-[0.98]"
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
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter access code"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#135BEC]/20 focus:border-[#135BEC] transition-all bg-white tracking-widest font-mono"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 px-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#135BEC] text-white rounded-full text-sm font-medium hover:bg-[#0F4BD6] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-blue-200/50 active:scale-[0.98]"
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
                className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                {mode === "join" ? "Already have a code?" : "Need to join the waitlist?"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-8 text-center text-sm text-[#9CA3AF]">
        &copy; 2026 Navinta AI. All rights reserved.
      </footer>
    </div>
  );
}
