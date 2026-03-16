import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Describe your goal",
    desc: "Tell the AI what kind of video you need — platform, tone, length.",
    visual: "prompt",
  },
  {
    number: "02",
    title: "Get a shot-by-shot plan",
    desc: "Receive a structured shot list with timing, messaging, and flow.",
    visual: "plan",
  },
  {
    number: "03",
    title: "Record with AI guidance",
    desc: "Director Mode guides you through each shot in real time.",
    visual: "record",
  },
  {
    number: "04",
    title: "Export polished video",
    desc: "Auto-edited, captioned, and formatted for every platform.",
    visual: "export",
  },
];

function PromptVisual() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Describe your video</div>
        <div className="text-sm text-gray-800 font-medium leading-snug">30-second brand intro for Instagram Reels</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["Instagram Reel", "9:16", "30s", "Professional"].map((tag) => (
          <span key={tag} className="pill-light">
            {tag}
          </span>
        ))}
      </div>
      <button className="w-full bg-indigo-600 text-white rounded-full py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors">
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
        <div key={shot.num} className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3">
          <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-bold flex items-center justify-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-800">{shot.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{shot.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordVisual() {
  return (
    <div className="space-y-4">
      {/* Viewfinder - keep dark to look like camera UI */}
      <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "4/3", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
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
          <span className="text-white text-[9px] font-semibold">REC</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
          <span className="text-white/90 text-[10px] font-medium bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">0:02 / 0:03</span>
          <span className="text-white text-[10px] font-semibold bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">Shot 1: Hook</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-colors">Retake</button>
        <button className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">Next shot →</button>
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="space-y-4">
      {/* Export preview - keep darker to look like video UI */}
      <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: "4/3", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1 items-end">
            {[40, 65, 50, 75, 55, 70, 45, 60, 80, 50, 65, 55].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300" style={{ height: `${h * 0.5}px`, opacity: 0.5 + h / 160 }} />
            ))}
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <polygon points="5 3 19 12 5 21 5 3" fill="white" opacity="0.9"/>
            </svg>
          </div>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[9px] text-emerald-400 font-semibold">Complete</span>
        </div>
      </div>
      <div className="flex gap-2">
        {["9:16", "1:1", "16:9"].map((fmt) => (
          <span key={fmt} className="flex-1 text-center py-2 rounded-xl bg-white border border-gray-200 text-[11px] text-gray-600 font-semibold shadow-sm">{fmt}</span>
        ))}
      </div>
      <button className="w-full py-3 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">
        Export video →
      </button>
    </div>
  );
}

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Header reveal
      gsap.from(headerRef.current, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });

      // Pin and scrub through steps
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
      style={{ background: "#FAFBFF" }}
    >
      {/* Very subtle background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div ref={containerRef} className="max-w-6xl mx-auto px-6 w-full relative z-10">
        <div ref={headerRef} className="text-center mb-16">
          <p className="section-label mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            Four steps. One video.
          </h2>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            Watch your idea become a polished, publish-ready video.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Steps list */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <button
                key={step.number}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left p-5 rounded-2xl transition-all duration-400 border ${
                  i === activeStep
                    ? "bg-white border-indigo-100 shadow-md shadow-indigo-50"
                    : "bg-transparent border-transparent hover:bg-white/60 hover:border-gray-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-mono font-bold transition-colors duration-400 ${
                    i === activeStep ? "text-indigo-500" : "text-gray-300"
                  }`}>
                    {step.number}
                  </span>
                  <div className="flex-1">
                    <span className={`text-base font-semibold transition-colors duration-400 block ${
                      i === activeStep ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {step.title}
                    </span>
                    {i === activeStep && (
                      <span className="text-sm text-gray-500 mt-0.5 block">{step.desc}</span>
                    )}
                  </div>
                  {i === activeStep && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                {/* Progress bar */}
                {i === activeStep && (
                  <div className="mt-3 ml-[2.25rem]">
                    <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full w-full" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Visual panel */}
          <div className="relative">
            <div
              className="rounded-2xl bg-white p-6 min-h-[480px] flex flex-col justify-center relative overflow-hidden"
              style={{
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.05), 0 20px 60px rgba(99,102,241,0.04)",
              }}
            >
              {/* Step label in corner */}
              <div className="absolute top-4 right-4">
                <span className="feature-number">{`Step ${activeStep + 1} of 4`}</span>
              </div>

              {visuals.map((visual, i) => (
                <div
                  key={i}
                  className="absolute inset-6 flex flex-col justify-center"
                  style={{
                    opacity: i === activeStep ? 1 : 0,
                    transform: i === activeStep
                      ? "translateY(0) scale(1)"
                      : i < activeStep
                        ? "translateY(-16px) scale(0.97)"
                        : "translateY(16px) scale(0.97)",
                    transition: "all 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
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
