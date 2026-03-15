import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Describe your goal",
    visual: "prompt",
  },
  {
    number: "02",
    title: "Get a shot-by-shot plan",
    visual: "plan",
  },
  {
    number: "03",
    title: "Record with AI guidance",
    visual: "record",
  },
  {
    number: "04",
    title: "Export polished video",
    visual: "export",
  },
];

function PromptVisual() {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-2">Describe your video</div>
        <div className="text-sm text-white/80 font-medium">30-second brand intro for Instagram Reels</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["Instagram Reel", "9:16", "30s", "Professional"].map((tag) => (
          <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-[11px] text-white/50 font-medium">
            {tag}
          </span>
        ))}
      </div>
      <button className="w-full bg-white text-black rounded-full py-3 text-sm font-semibold">
        Generate plan →
      </button>
    </div>
  );
}

function PlanVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { num: 1, label: "Hook — attention grabber", time: "0:00 – 0:03" },
        { num: 2, label: "Problem statement", time: "0:03 – 0:07" },
        { num: 3, label: "Product demo", time: "0:07 – 0:15" },
        { num: 4, label: "Social proof", time: "0:15 – 0:22" },
        { num: 5, label: "Call to action", time: "0:22 – 0:30" },
      ].map((shot) => (
        <div key={shot.num} className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
          <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/80">{shot.label}</div>
            <div className="text-[10px] text-white/30">{shot.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordVisual() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e]" style={{ aspectRatio: "4/3" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-[3px] border-white/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-[3px] border-white/30 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-[9px] font-medium">REC</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
          <span className="text-white/90 text-[10px] font-medium bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">0:02 / 0:03</span>
          <span className="text-white text-[10px] font-medium bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">Shot 1: Hook</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white/60 border border-white/10 bg-white/5">Retake</button>
        <button className="flex-1 py-2.5 rounded-xl text-xs font-medium text-black bg-white">Next shot →</button>
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden relative bg-gradient-to-br from-[#0f172a] to-[#1e293b]" style={{ aspectRatio: "4/3" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1 items-end">
            {[40, 65, 50, 75, 55, 70, 45, 60, 80, 50, 65, 55].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300" style={{ height: `${h * 0.5}px`, opacity: 0.5 + h / 160 }} />
            ))}
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" fill="white" opacity="0.9"/></svg>
          </div>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[9px] text-emerald-400 font-medium">Complete</span>
        </div>
      </div>
      <div className="flex gap-2">
        {["9:16", "1:1", "16:9"].map((fmt) => (
          <span key={fmt} className="flex-1 text-center py-2 rounded-lg bg-white/5 border border-white/8 text-[10px] text-white/50 font-medium">{fmt}</span>
        ))}
      </div>
      <button className="w-full py-3 rounded-full text-sm font-semibold text-black bg-white">
        Export video →
      </button>
    </div>
  );
}

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Pin the section and scrub through steps
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const step = Math.min(3, Math.floor(progress * 4));
          setActiveStep(step);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const visuals = [<PromptVisual />, <PlanVisual />, <RecordVisual />, <ExportVisual />];

  return (
    <section
      ref={sectionRef}
      id="showcase"
      className="min-h-screen flex items-center relative overflow-hidden py-20"
      style={{ background: "#000000" }}
    >
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div ref={containerRef} className="max-w-6xl mx-auto px-6 w-full relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
            Four steps. One video.
          </h2>
          <p className="text-lg text-white/40 max-w-lg mx-auto">
            Watch your idea become a polished, publish-ready video.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Steps list */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <button
                key={step.number}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left p-6 rounded-2xl transition-all duration-500 border ${
                  i === activeStep
                    ? "bg-white/[0.05] border-white/10"
                    : "bg-transparent border-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-mono font-bold transition-colors duration-500 ${
                    i === activeStep ? "text-indigo-400" : "text-white/20"
                  }`}>
                    {step.number}
                  </span>
                  <span className={`text-lg font-semibold transition-colors duration-500 ${
                    i === activeStep ? "text-white" : "text-white/30"
                  }`}>
                    {step.title}
                  </span>
                </div>
                {/* Progress bar */}
                {i === activeStep && (
                  <div className="mt-4 ml-9">
                    <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-full" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Visual */}
          <div className="relative">
            <div
              className="rounded-2xl border border-white/10 bg-[#111111] p-6 min-h-[480px] flex flex-col justify-center"
              style={{
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.05)",
              }}
            >
              {visuals.map((visual, i) => (
                <div
                  key={i}
                  className="absolute inset-6 flex flex-col justify-center"
                  style={{
                    opacity: i === activeStep ? 1 : 0,
                    transform: i === activeStep ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
                    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    pointerEvents: i === activeStep ? "auto" : "none",
                  }}
                >
                  {visual}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
