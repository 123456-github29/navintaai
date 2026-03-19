import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Onboard your brand",
    description: "Tell us about your business, audience, and goals. Our AI builds a personalized content strategy.",
  },
  {
    number: "02",
    title: "Get your content plan",
    description: "Receive a 4-week calendar of video ideas with scripts, shot lists, and talking points.",
  },
  {
    number: "03",
    title: "Record with direction",
    description: "Director Mode shows your script as a teleprompter with shot-by-shot guidance.",
  },
  {
    number: "04",
    title: "AI edits and exports",
    description: "Your footage is automatically cut, captioned, and polished. Export with one click.",
  },
];

/* ─── Animated visual scenes ─── */

function OnboardScene() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative space-y-3 w-full max-w-sm">
        {[
          { label: "Business name", value: "Navinta Studios", icon: "B" },
          { label: "Industry", value: "SaaS / Technology", icon: "I" },
          { label: "Target audience", value: "Founders & marketers", icon: "A" },
          { label: "Content goal", value: "Thought leadership", icon: "G" },
        ].map((item, i) => (
          <div key={i} className="hiw-scene-item flex items-center gap-3 p-3 rounded-lg" style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0" style={{
              background: `rgba(201,152,90,${0.06 + i * 0.03})`,
              color: "#c9985a",
              border: "1px solid rgba(201,152,90,0.12)",
            }}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>{item.label}</div>
              <div className="text-sm font-medium text-white truncate">{item.value}</div>
            </div>
            <svg className="ml-auto w-4 h-4 shrink-0" style={{ color: "rgba(201,152,90,0.4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        ))}
        <div className="mt-2 rounded-full h-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full hiw-progress-bar" style={{ background: "linear-gradient(90deg, #a07d50, #c9985a)", width: "0%" }} />
        </div>
      </div>
    </div>
  );
}

function ContentPlanScene() {
  const days = [
    { day: "Mon", title: "Product Demo", type: "Reel" },
    { day: "Tue", title: "Behind the Scenes", type: "Story" },
    { day: "Wed", title: "Customer Story", type: "Short" },
    { day: "Thu", title: "Tips & Tricks", type: "Reel" },
    { day: "Fri", title: "Weekly Recap", type: "Video" },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Week 1 — Content Plan</div>
          <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(201,152,90,0.08)", color: "#c9985a", border: "1px solid rgba(201,152,90,0.15)" }}>AI Generated</div>
        </div>
        {days.map((d, i) => (
          <div key={i} className="hiw-scene-item flex items-center gap-3 p-2.5 rounded-lg" style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{
              background: "rgba(201,152,90,0.06)",
              border: "1px solid rgba(201,152,90,0.1)",
            }}>
              <span className="text-[9px] font-bold uppercase" style={{ color: "rgba(201,152,90,0.7)" }}>{d.day}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{d.title}</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Script ready</div>
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{
              background: "rgba(201,152,90,0.06)",
              color: "rgba(201,152,90,0.6)",
              border: "1px solid rgba(201,152,90,0.1)",
            }}>{d.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectorScene() {
  const [currentLine, setCurrentLine] = useState(0);
  const lines = [
    "Start with a hook — address the viewer's pain point directly.",
    "Transition to the solution. Keep it under 8 seconds.",
    "Show the product in action. Focus on the main feature.",
    "End with a clear call-to-action. Keep it specific.",
  ];

  useEffect(() => {
    const interval = setInterval(() => setCurrentLine((prev) => (prev + 1) % lines.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-sm">
        <div className="rounded-xl overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative aspect-video flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f0f0f, #161616)" }}>
            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 rounded-tl-sm" style={{ borderColor: "rgba(201,152,90,0.3)" }} />
            <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 rounded-tr-sm" style={{ borderColor: "rgba(201,152,90,0.3)" }} />
            <div className="absolute bottom-12 left-3 w-5 h-5 border-l-2 border-b-2 rounded-bl-sm" style={{ borderColor: "rgba(201,152,90,0.3)" }} />
            <div className="absolute bottom-12 right-3 w-5 h-5 border-r-2 border-b-2 rounded-br-sm" style={{ borderColor: "rgba(201,152,90,0.3)" }} />
            <div className="absolute top-3 right-10 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#c9985a", boxShadow: "0 0 6px #c9985a" }} />
              <span className="text-[9px] font-mono font-bold" style={{ color: "#c9985a" }}>REC</span>
            </div>
            <div className="w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
              <div className="text-xs leading-relaxed font-medium text-center transition-all duration-500" style={{ color: "rgba(255,255,255,0.85)" }}>
                {lines[currentLine]}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono" style={{ color: "rgba(201,152,90,0.6)" }}>SHOT {currentLine + 1}/4</span>
              <div className="flex gap-1">
                {lines.map((_, i) => (
                  <div key={i} className="w-5 h-1 rounded-full transition-all duration-300" style={{ background: i <= currentLine ? "#c9985a" : "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
            </div>
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>00:{String((currentLine + 1) * 8).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportScene() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame: number;
    let p = 0;
    const tick = () => { p += 0.6; if (p > 100) p = 100; setProgress(p); if (p < 100) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-sm space-y-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white">AI Processing</span>
            <span className="text-xs font-mono" style={{ color: progress >= 100 ? "#c9985a" : "rgba(255,255,255,0.4)" }}>
              {progress >= 100 ? "Complete" : `${Math.round(progress)}%`}
            </span>
          </div>
          <div className="space-y-2">
            {["Smart cuts applied", "Captions generated", "B-roll inserted", "Color grading"].map((step, i) => {
              const done = progress > (i + 1) * 25;
              const inProg = !done && progress > i * 25;
              return (
                <div key={i} className="flex items-center gap-2 transition-all duration-300" style={{ opacity: done ? 1 : inProg ? 0.6 : 0.25 }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{
                    background: done ? "rgba(201,152,90,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${done ? "rgba(201,152,90,0.25)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#c9985a" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {inProg && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9985a" }} />}
                  </div>
                  <span className="text-xs" style={{ color: done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>{step}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #a07d50, #c9985a)" }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["TikTok", "Reels", "Shorts", "LinkedIn"].map((p, i) => (
            <div key={i} className="rounded-lg p-2.5 text-center transition-all duration-500" style={{
              background: progress >= 100 ? "rgba(201,152,90,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${progress >= 100 ? "rgba(201,152,90,0.12)" : "rgba(255,255,255,0.05)"}`,
              opacity: progress >= 100 ? 1 : 0.35,
            }}>
              <div className="text-[10px] font-bold" style={{ color: progress >= 100 ? "#c9985a" : "rgba(255,255,255,0.3)" }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const sceneComponents = [OnboardScene, ContentPlanScene, DirectorScene, ExportScene];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  // 3D tilt on preview
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(previewRef.current, { rotateY: x * 4, rotateX: -y * 3, duration: 0.4, ease: "power2.out" });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!previewRef.current) return;
    gsap.to(previewRef.current, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "power3.out" });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Heading entrance
      gsap.from(".hiw-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });
      gsap.from(".hiw-layout", {
        y: 60, opacity: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });

      // Scroll-driven step progression — each step triggers at a scroll threshold
      steps.forEach((_, i) => {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: () => `top+=${i * 150} 60%`,
          end: () => `top+=${(i + 1) * 150} 60%`,
          onEnter: () => setActiveStep(i),
          onEnterBack: () => setActiveStep(i),
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Animate scene items when step changes
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = document.querySelectorAll(".hiw-scene-item");
    if (items.length > 0) {
      gsap.fromTo(items, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power3.out" });
    }
    // Animate progress bar for step 1
    const bar = document.querySelector(".hiw-progress-bar") as HTMLElement;
    if (bar && activeStep === 0) {
      gsap.fromTo(bar, { width: "0%" }, { width: "100%", duration: 2.5, ease: "power2.out" });
    }
  }, [activeStep]);

  const ActiveScene = sceneComponents[activeStep];

  return (
    <section ref={sectionRef} id="how-it-works" className="nv-section relative overflow-hidden" style={{ background: "#111111" }}>
      <div className="nv-orb nv-orb-violet" style={{ width: 400, height: 400, top: "15%", left: "5%" }} />

      <div className="nv-container relative z-10">
        <div className="hiw-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(201,152,90,0.6)" }}>How it works</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
            From idea to published<br className="hidden md:block" /> in four steps
          </h2>
        </div>

        <div className="hiw-layout flex flex-col lg:flex-row gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Left: step tabs */}
          <div className="lg:w-[380px] shrink-0 space-y-3">
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className="w-full text-left p-5 rounded-xl transition-all duration-500 group relative overflow-hidden"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(201,152,90,0.2)" : "rgba(255,255,255,0.04)"}`,
                    boxShadow: isActive ? "0 0 30px rgba(201,152,90,0.06), 0 4px 20px rgba(0,0,0,0.2)" : "none",
                  }}
                >
                  {/* Active accent line on left */}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-all duration-500" style={{
                    background: isActive ? "#c9985a" : "transparent",
                    opacity: isActive ? 0.6 : 0,
                  }} />

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-all duration-500" style={{
                      background: isActive ? "rgba(201,152,90,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isActive ? "rgba(201,152,90,0.2)" : "rgba(255,255,255,0.08)"}`,
                      color: isActive ? "#c9985a" : "rgba(255,255,255,0.35)",
                    }}>
                      {step.number}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold mb-1 transition-colors duration-300" style={{
                        color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                      }}>{step.title}</h3>
                      <p className="text-sm leading-relaxed transition-all duration-500" style={{
                        color: isActive ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)",
                        maxHeight: isActive ? "60px" : "0px",
                        opacity: isActive ? 1 : 0,
                        overflow: "hidden",
                      }}>{step.description}</p>
                    </div>
                  </div>
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
                border: "1px solid rgba(201,152,90,0.1)",
                boxShadow: "0 20px 80px rgba(0,0,0,0.4), 0 0 40px rgba(201,152,90,0.03)",
                minHeight: "380px",
                transformStyle: "preserve-3d",
                transition: "border-color 0.5s ease, box-shadow 0.5s ease",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="text-[10px] font-mono transition-all duration-300" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Step {steps[activeStep].number} — {steps[activeStep].title}
                </span>
                <div className="w-12" />
              </div>
              <div className="p-6" style={{ minHeight: "340px" }}>
                <ActiveScene />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px" style={{
                background: "linear-gradient(90deg, transparent, rgba(201,152,90,0.2), transparent)",
              }} />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
