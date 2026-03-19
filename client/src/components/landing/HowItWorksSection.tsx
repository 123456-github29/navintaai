import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Onboard your brand",
    description: "Tell us about your business, audience, and goals. Our AI builds a personalized content strategy.",
    accent: "#7c5cfc",
  },
  {
    number: "02",
    title: "Get your content plan",
    description: "Receive a 4-week calendar of video ideas with scripts, shot lists, and talking points.",
    accent: "#00d4ff",
  },
  {
    number: "03",
    title: "Record with direction",
    description: "Director Mode shows your script as a teleprompter with shot-by-shot guidance.",
    accent: "#ff6b9d",
  },
  {
    number: "04",
    title: "AI edits and exports",
    description: "Your footage is automatically cut, captioned, and polished. Export with one click.",
    accent: "#7c5cfc",
  },
];

/* ─── Animated visual scenes for each step ─── */

function OnboardScene({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (active) {
      const els = ref.current.querySelectorAll(".onboard-item");
      gsap.fromTo(els, { x: -30, opacity: 0, scale: 0.95 }, { x: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "power3.out" });
      gsap.fromTo(ref.current.querySelector(".onboard-glow"), { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" });
    }
  }, [active]);

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center">
      <div className="onboard-glow absolute w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.15), transparent 70%)" }} />
      <div className="relative space-y-3 w-full max-w-sm">
        {[
          { label: "Business name", value: "Navinta Studios", icon: "B" },
          { label: "Industry", value: "SaaS / Technology", icon: "I" },
          { label: "Target audience", value: "Founders & marketers", icon: "A" },
          { label: "Content goal", value: "Thought leadership", icon: "G" },
        ].map((item, i) => (
          <div key={i} className="onboard-item flex items-center gap-3 p-3 rounded-lg transition-all duration-300" style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{
              background: `rgba(124,92,252,${0.08 + i * 0.04})`,
              color: "#7c5cfc",
              border: "1px solid rgba(124,92,252,0.15)",
            }}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{item.label}</div>
              <div className="text-sm font-medium text-white truncate">{item.value}</div>
            </div>
            <svg className="ml-auto w-4 h-4 shrink-0" style={{ color: "rgba(124,92,252,0.5)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        ))}
        {/* Animated progress bar at bottom */}
        <div className="mt-2 rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full" style={{
            background: "linear-gradient(90deg, #7c5cfc, #00d4ff)",
            width: active ? "100%" : "0%",
            transition: "width 2.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }} />
        </div>
      </div>
    </div>
  );
}

function ContentPlanScene({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !active) return;
    const cards = ref.current.querySelectorAll(".plan-day");
    gsap.fromTo(cards, { y: 20, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.5)" });
  }, [active]);

  const days = [
    { day: "Mon", title: "Product Demo", type: "Reel", color: "#7c5cfc" },
    { day: "Tue", title: "Behind the Scenes", type: "Story", color: "#00d4ff" },
    { day: "Wed", title: "Customer Story", type: "Short", color: "#ff6b9d" },
    { day: "Thu", title: "Tips & Tricks", type: "Reel", color: "#7c5cfc" },
    { day: "Fri", title: "Weekly Recap", type: "Video", color: "#00d4ff" },
  ];

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center">
      <div className="absolute w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,212,255,0.1), transparent 70%)" }} />
      <div className="relative w-full max-w-sm space-y-2">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Week 1 — Content Plan</div>
          <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>AI Generated</div>
        </div>
        {days.map((d, i) => (
          <div key={i} className="plan-day flex items-center gap-3 p-2.5 rounded-lg group cursor-default transition-all duration-300 hover:bg-white/[0.03]" style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{
              background: `${d.color}10`,
              border: `1px solid ${d.color}25`,
            }}>
              <span className="text-[9px] font-bold uppercase" style={{ color: `${d.color}90` }}>{d.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{d.title}</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Script ready</div>
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
              background: `${d.color}12`,
              color: `${d.color}`,
              border: `1px solid ${d.color}20`,
            }}>{d.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectorScene({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const lines = [
    "Start with a hook — address the viewer's pain point directly.",
    "Transition to the solution. Keep it under 8 seconds.",
    "Show the product in action. Focus on the main feature.",
    "End with a clear call-to-action. Keep it specific.",
  ];

  useEffect(() => {
    if (!active) { setCurrentLine(0); return; }
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    });
    const interval = setInterval(() => {
      setCurrentLine((prev) => (prev + 1) % lines.length);
    }, 2500);
    return () => { clearInterval(interval); ctx.revert(); };
  }, [active]);

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center">
      <div className="absolute w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,107,157,0.1), transparent 70%)" }} />
      <div className="relative w-full max-w-sm">
        {/* Fake camera viewfinder */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Camera frame */}
          <div className="relative aspect-video flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0f0f, #161616)" }}>
            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 rounded-tl-sm" style={{ borderColor: "rgba(255,107,157,0.4)" }} />
            <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 rounded-tr-sm" style={{ borderColor: "rgba(255,107,157,0.4)" }} />
            <div className="absolute bottom-12 left-3 w-5 h-5 border-l-2 border-b-2 rounded-bl-sm" style={{ borderColor: "rgba(255,107,157,0.4)" }} />
            <div className="absolute bottom-12 right-3 w-5 h-5 border-r-2 border-b-2 rounded-br-sm" style={{ borderColor: "rgba(255,107,157,0.4)" }} />

            {/* REC indicator */}
            <div className="absolute top-3 right-10 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ff6b9d", boxShadow: "0 0 6px #ff6b9d" }} />
              <span className="text-[9px] font-mono font-bold" style={{ color: "#ff6b9d" }}>REC</span>
            </div>

            {/* Person silhouette placeholder */}
            <div className="w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)" }} />

            {/* Teleprompter text overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
              <div className="text-xs leading-relaxed font-medium text-center transition-all duration-500" style={{ color: "rgba(255,255,255,0.85)" }}>
                {lines[currentLine]}
              </div>
            </div>
          </div>

          {/* Shot guidance bar */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,107,157,0.7)" }}>SHOT {currentLine + 1}/4</span>
              <div className="flex gap-1">
                {lines.map((_, i) => (
                  <div key={i} className="w-5 h-1 rounded-full transition-all duration-300" style={{
                    background: i <= currentLine ? "#ff6b9d" : "rgba(255,255,255,0.08)",
                  }} />
                ))}
              </div>
            </div>
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>00:{String((currentLine + 1) * 8).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportScene({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" });
    });
    // Animate progress
    let frame: number;
    let p = 0;
    const tick = () => {
      p += 0.8;
      if (p > 100) p = 100;
      setProgress(p);
      if (p < 100) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); ctx.revert(); };
  }, [active]);

  const platforms = [
    { name: "TikTok", ratio: "9:16", color: "#7c5cfc" },
    { name: "Reels", ratio: "9:16", color: "#ff6b9d" },
    { name: "Shorts", ratio: "9:16", color: "#00d4ff" },
    { name: "LinkedIn", ratio: "16:9", color: "#7c5cfc" },
  ];

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center">
      <div className="absolute w-52 h-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.12), transparent 70%)" }} />
      <div className="relative w-full max-w-sm space-y-3">
        {/* Processing status */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white">AI Processing</span>
            <span className="text-xs font-mono" style={{ color: progress >= 100 ? "#00d4ff" : "rgba(255,255,255,0.5)" }}>
              {progress >= 100 ? "Complete" : `${Math.round(progress)}%`}
            </span>
          </div>
          <div className="space-y-2">
            {["Smart cuts applied", "Captions generated", "B-roll inserted", "Color grading"].map((step, i) => {
              const done = progress > (i + 1) * 25;
              const inProg = !done && progress > i * 25;
              return (
                <div key={i} className="flex items-center gap-2 transition-all duration-300" style={{ opacity: done ? 1 : inProg ? 0.7 : 0.3 }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{
                    background: done ? "rgba(124,92,252,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${done ? "rgba(124,92,252,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {inProg && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#7c5cfc" }} />}
                  </div>
                  <span className="text-xs" style={{ color: done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>{step}</span>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-100" style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #7c5cfc, #00d4ff)",
            }} />
          </div>
        </div>

        {/* Platform exports */}
        <div className="grid grid-cols-4 gap-2">
          {platforms.map((p, i) => (
            <div key={i} className="rounded-lg p-2.5 text-center transition-all duration-500" style={{
              background: progress >= 100 ? `${p.color}08` : "rgba(255,255,255,0.02)",
              border: `1px solid ${progress >= 100 ? `${p.color}20` : "rgba(255,255,255,0.05)"}`,
              transform: progress >= 100 ? "scale(1)" : "scale(0.95)",
              opacity: progress >= 100 ? 1 : 0.4,
            }}>
              <div className="text-[10px] font-bold" style={{ color: progress >= 100 ? p.color : "rgba(255,255,255,0.4)" }}>{p.name}</div>
              <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{p.ratio}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const scenes = [OnboardScene, ContentPlanScene, DirectorScene, ExportScene];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-cycle through tabs
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const handleTabClick = useCallback((idx: number) => {
    setActiveStep(idx);
    setAutoPlay(false);
    // Resume autoplay after 12s of inactivity
    setTimeout(() => setAutoPlay(true), 12000);
  }, []);

  // 3D tilt on preview panel
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(previewRef.current, { rotateY: x * 5, rotateX: -y * 3, duration: 0.4, ease: "power2.out" });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!previewRef.current) return;
    gsap.to(previewRef.current, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "power3.out" });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".hiw-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });
      gsap.from(".hiw-layout", {
        y: 60, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const ActiveScene = scenes[activeStep];

  return (
    <section ref={sectionRef} id="how-it-works" className="nv-section relative overflow-hidden" style={{ background: "#111111" }}>
      {/* Ambient orbs */}
      <div className="nv-orb nv-orb-violet" style={{ width: 400, height: 400, top: "15%", left: "5%" }} />
      <div className="nv-orb nv-orb-cyan" style={{ width: 300, height: 300, bottom: "10%", right: "10%" }} />

      <div className="nv-container relative z-10">
        <div className="hiw-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(255,107,157,0.6)" }}>How it works</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
            From idea to published<br className="hidden md:block" /> in four steps
          </h2>
        </div>

        {/* Main layout: tabs left, visual right */}
        <div className="hiw-layout flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Left: step tabs */}
          <div className="lg:w-[380px] shrink-0 space-y-3">
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <button
                  key={i}
                  onClick={() => handleTabClick(i)}
                  className="w-full text-left p-5 rounded-xl transition-all duration-500 group relative overflow-hidden"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    border: `1px solid ${isActive ? `${step.accent}30` : "rgba(255,255,255,0.04)"}`,
                    boxShadow: isActive ? `0 0 30px ${step.accent}10, 0 4px 20px rgba(0,0,0,0.2)` : "none",
                  }}
                >
                  {/* Active accent line on left */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full transition-all duration-500" style={{
                    background: isActive ? step.accent : "transparent",
                    boxShadow: isActive ? `0 0 10px ${step.accent}40` : "none",
                  }} />

                  <div className="flex items-start gap-4">
                    {/* Number */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-all duration-500" style={{
                      background: isActive ? `${step.accent}18` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? `${step.accent}35` : "rgba(255,255,255,0.08)"}`,
                      color: isActive ? step.accent : "rgba(255,255,255,0.4)",
                      boxShadow: isActive ? `0 0 20px ${step.accent}15` : "none",
                    }}>
                      {step.number}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold mb-1 transition-colors duration-300" style={{
                        color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                      }}>{step.title}</h3>
                      <p className="text-sm leading-relaxed transition-all duration-500" style={{
                        color: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
                        maxHeight: isActive ? "60px" : "0px",
                        opacity: isActive ? 1 : 0,
                        overflow: "hidden",
                      }}>{step.description}</p>
                    </div>
                  </div>

                  {/* Progress bar for active tab (auto-play timer) */}
                  {isActive && autoPlay && (
                    <div className="mt-3 ml-14 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{
                        background: step.accent,
                        animation: "hiwProgress 5s linear forwards",
                      }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: animated visual preview */}
          <div className="flex-1 flex items-center justify-center" style={{ perspective: "1200px" }}>
            <div
              ref={previewRef}
              className="w-full rounded-2xl relative overflow-hidden"
              style={{
                background: "#0d0d0d",
                border: `1px solid ${steps[activeStep].accent}20`,
                boxShadow: `0 20px 80px rgba(0,0,0,0.4), 0 0 60px ${steps[activeStep].accent}08`,
                minHeight: "380px",
                transformStyle: "preserve-3d",
                transition: "border-color 0.5s ease, box-shadow 0.5s ease",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Step {steps[activeStep].number} — {steps[activeStep].title}
                </span>
                <div className="w-12" />
              </div>

              {/* Scene content */}
              <div className="p-6" style={{ minHeight: "340px" }}>
                <ActiveScene active={true} />
              </div>

              {/* Bottom accent glow line */}
              <div className="absolute bottom-0 left-0 right-0 h-px" style={{
                background: `linear-gradient(90deg, transparent, ${steps[activeStep].accent}40, transparent)`,
              }} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />

      {/* Auto-play progress keyframe */}
      <style>{`
        @keyframes hiwProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </section>
  );
}
