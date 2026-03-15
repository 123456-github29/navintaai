import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function useTimerCleanup() {
  const timersRef = useRef<number[]>([]);
  const mountedRef = useRef(true);
  const track = (id: number) => { timersRef.current.push(id); };
  const cleanup = () => {
    mountedRef.current = false;
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };
  return { track, cleanup, mountedRef };
}

function PlanningAnimation() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [shotChecks, setShotChecks] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { track, cleanup, mountedRef } = useTimerCleanup();

  useEffect(() => {
    mountedRef.current = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runCycle();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { cleanup(); observer.disconnect(); };
  }, []);

  function runCycle() {
    if (!mountedRef.current) return;
    setActiveScreen(0);
    setShotChecks([]);

    const durations = [3000, 3500, 3000, 3500];
    let step = 0;

    function next() {
      if (!mountedRef.current) return;
      step++;
      if (step >= 4) {
        track(window.setTimeout(() => {
          if (!mountedRef.current) return;
          step = 0;
          setActiveScreen(0);
          setShotChecks([]);
          track(window.setTimeout(() => next(), 1200));
        }, 3000));
      } else {
        setActiveScreen(step);
        if (step === 1) {
          [0, 1, 2, 3, 4].forEach((i) => {
            track(window.setTimeout(() => {
              if (!mountedRef.current) return;
              setShotChecks((prev) => [...prev, i]);
            }, 400 + i * 350));
          });
        }
        track(window.setTimeout(() => next(), durations[step]));
      }
    }
    track(window.setTimeout(() => next(), durations[0]));
  }

  const screens = [
    <div key="prompt" className="flex flex-col gap-3.5">
      <div className="bg-white/[0.04] rounded-2xl bg-white/[0.02] px-4 py-3.5">
        <p className="text-[10px] text-white/30 font-medium mb-1.5 uppercase tracking-wider">Describe your video</p>
        <p className="text-[13px] text-white/90 font-medium leading-snug">30-second brand intro for Instagram</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["Instagram Reel", "9:16", "30s"].map((tag) => (
          <span key={tag} className="bg-white/5 bg-white/[0.02] text-white/50 text-[10px] px-3 py-1.5 rounded-full font-medium">{tag}</span>
        ))}
      </div>
      <button className="bg-white text-black rounded-full py-2.5 text-[12px] font-medium mt-1">
        Generate plan
      </button>
    </div>,

    <div key="plan" className="flex flex-col gap-2">
      {[
        { num: 1, label: "Hook — attention grabber", time: "0:00 – 0:03" },
        { num: 2, label: "Problem statement", time: "0:03 – 0:07" },
        { num: 3, label: "Product demo", time: "0:07 – 0:15" },
        { num: 4, label: "Social proof", time: "0:15 – 0:22" },
        { num: 5, label: "Call to action", time: "0:22 – 0:30" },
      ].map((s, idx) => (
        <div key={s.num} className="flex items-center gap-3 bg-white/[0.03] rounded-xl bg-white/[0.02] px-3 py-2.5 transition-all duration-500" style={{ opacity: shotChecks.includes(idx) ? 1 : 0.4, transform: shotChecks.includes(idx) ? "translateY(0)" : "translateY(4px)" }}>
          <span className={`w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 transition-all duration-400 ${shotChecks.includes(idx) ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/50"}`}>
            {shotChecks.includes(idx) ? (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : s.num}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/80 truncate">{s.label}</p>
            <p className="text-[10px] text-white/30">{s.time}</p>
          </div>
        </div>
      ))}
    </div>,

    <div key="record" className="flex flex-col gap-3">
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
        <div className="flex-1 bg-white/5 bg-white/[0.02] rounded-xl py-2.5 text-center text-[11px] font-medium text-white/50">Retake</div>
        <div className="flex-1 bg-white rounded-xl py-2.5 text-center text-[11px] font-medium text-black">Next shot</div>
      </div>
    </div>,

    <div key="export" className="flex flex-col gap-3">
      <div className="rounded-xl overflow-hidden relative bg-gradient-to-br from-[#0f172a] to-[#1e293b]" style={{ aspectRatio: "4/3" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1.5 items-end">
            {[40, 65, 50, 75, 55, 70, 45, 60, 80, 50, 65, 55].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300" style={{ height: `${h * 0.5}px`, opacity: 0.5 + (h / 160), animation: `waveBar 1.5s ease-in-out ${i * 0.1}s infinite alternate` }} />
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
      <div className="flex gap-2 px-1">
        <div className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[10px] text-emerald-400 font-medium">Ready</span>
        </div>
        <div className="flex gap-1.5 ml-auto">
          {["9:16", "1:1", "16:9"].map((fmt) => (
            <span key={fmt} className="bg-white/5 bg-white/[0.02] text-white/40 text-[9px] px-2.5 py-1 rounded-full font-medium">{fmt}</span>
          ))}
        </div>
      </div>
      <button className="bg-white text-black rounded-full py-2.5 text-[12px] font-medium">
        Export video
      </button>
    </div>,
  ];

  const titles = ["What's your video about?", "Your shot list", "Recording — Shot 1", "Ready to export"];

  return (
    <div ref={containerRef} className="relative z-10 flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-4 px-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[3px] rounded-full flex-1 transition-all duration-700 ease-out" style={{ backgroundColor: i <= activeScreen ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden">
        {screens.map((screen, i) => (
          <div
            key={i}
            className="absolute inset-0 flex flex-col"
            style={{
              opacity: i === activeScreen ? 1 : 0,
              transform: i === activeScreen ? "translateX(0) scale(1)" : i < activeScreen ? "translateX(-30px) scale(0.97)" : "translateX(30px) scale(0.97)",
              transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: i === activeScreen ? "auto" : "none",
            }}
          >
            <h4 className="text-[14px] font-semibold text-white/90 mb-3 px-1">{titles[i]}</h4>
            {screen}
          </div>
        ))}
      </div>
    </div>
  );
}

const directorSteps = [
  { message: "Tighten the cuts and make it punchier", response: "Trimmed 4 clips, crossfades added.", timelineState: "trimmed" },
  { message: "Add captions with a bold style", response: "Bold captions applied to all clips.", timelineState: "captions" },
  { message: "Insert some b-roll for the product demo", response: "2 b-roll clips inserted.", timelineState: "broll" },
  { message: "Make it more cinematic with color grading", response: "Cinematic color grade applied.", timelineState: "graded" },
];

const TIMELINE_CLIPS = [
  { w: "18%", color: "#6366f1", label: "Hook" },
  { w: "22%", color: "#8b5cf6", label: "Problem" },
  { w: "28%", color: "#06b6d4", label: "Demo" },
  { w: "18%", color: "#f59e0b", label: "Proof" },
  { w: "14%", color: "#10b981", label: "CTA" },
];

function DirectorAnimation() {
  const [activeStep, setActiveStep] = useState(-1);
  const [typedText, setTypedText] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { track, cleanup, mountedRef } = useTimerCleanup();

  useEffect(() => {
    mountedRef.current = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runCycle();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { cleanup(); observer.disconnect(); };
  }, []);

  function typeText(text: string, onDone: () => void) {
    let idx = 0;
    setTypedText("");
    function tick() {
      if (!mountedRef.current) return;
      idx++;
      setTypedText(text.slice(0, idx));
      if (idx < text.length) {
        track(window.setTimeout(tick, 30 + Math.random() * 20));
      } else {
        track(window.setTimeout(onDone, 500));
      }
    }
    tick();
  }

  function runCycle() {
    if (!mountedRef.current) return;
    let step = -1;
    setHistory([]);

    function nextStep() {
      if (!mountedRef.current) return;
      step++;
      if (step >= directorSteps.length) {
        track(window.setTimeout(() => {
          if (!mountedRef.current) return;
          setActiveStep(-1);
          setTypedText("");
          setShowResponse(false);
          setHistory([]);
          step = -1;
          track(window.setTimeout(() => nextStep(), 1500));
        }, 3000));
        return;
      }
      setActiveStep(step);
      setShowResponse(false);
      typeText(directorSteps[step].message, () => {
        if (!mountedRef.current) return;
        setShowResponse(true);
        track(window.setTimeout(() => {
          if (!mountedRef.current) return;
          setHistory((prev) => [...prev, step]);
          track(window.setTimeout(() => nextStep(), 800));
        }, 1800));
      });
    }
    track(window.setTimeout(() => nextStep(), 1000));
  }

  const currentStep = activeStep >= 0 ? directorSteps[activeStep] : null;
  const timelineState = currentStep?.timelineState || "default";
  const completedStates = history.map(i => directorSteps[i].timelineState);
  const showTrimmed = completedStates.includes("trimmed") || timelineState === "trimmed";
  const showCaptions = completedStates.includes("captions") || timelineState === "captions";
  const showBroll = completedStates.includes("broll") || timelineState === "broll";
  const showGraded = completedStates.includes("graded") || timelineState === "graded";

  return (
    <div ref={containerRef} className="relative z-10 flex h-full gap-3">
      {/* Timeline panel */}
      <div className="flex-[1.1] flex flex-col rounded-2xl overflow-hidden relative bg-white/[0.02]">
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
          <div className="absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-white/40 font-medium">Timeline</span>
              </div>
              <span className="text-[9px] text-white/30">0:30</span>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2.5 py-3">
              <div className="flex gap-1 items-center w-full" style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                {TIMELINE_CLIPS.map((clip, i) => (
                  <div
                    key={i}
                    className="rounded-md relative overflow-hidden"
                    style={{
                      width: showTrimmed && (i === 1 || i === 3) ? `${parseInt(clip.w) * 0.7}%` : clip.w,
                      height: "36px",
                      backgroundColor: showGraded ? `${clip.color}cc` : clip.color,
                      transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      filter: showGraded ? "saturate(0.7) contrast(1.2)" : "none",
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-white/80">{clip.label}</span>
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/15" />
                  </div>
                ))}
              </div>

              {showBroll && (
                <div className="flex gap-1 items-center w-full" style={{ animation: "smoothFadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                  <div style={{ width: "40%" }} />
                  <div className="rounded-md h-7 flex items-center justify-center gap-1" style={{ width: "28%", backgroundColor: "#a855f7" }}>
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none"/><path d="M6 6l4 2.5-4 2.5V6z" fill="white"/></svg>
                    <span className="text-[7px] font-medium text-white/90">B-roll</span>
                  </div>
                </div>
              )}

              {showCaptions && (
                <div className="flex items-center gap-1.5 mt-1" style={{ animation: "smoothFadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                  <div className="flex-1 h-5 rounded bg-white/10 flex items-center px-2 gap-1">
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="8" rx="1.5" stroke="white" strokeWidth="1.2" fill="none"/><path d="M4 8h4M4 10h6" stroke="white" strokeWidth="1" strokeLinecap="round"/></svg>
                    <span className="text-[7px] text-white/60 font-medium">Captions: Bold</span>
                  </div>
                </div>
              )}
            </div>

            {showGraded && (
              <div className="flex items-center gap-1.5" style={{ animation: "smoothFadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                <div className="flex gap-1">
                  {["#1e3a5f", "#2d1b4e", "#1a2e1a"].map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-[8px] text-white/40">Cinematic</span>
              </div>
            )}

            {!showGraded && (
              <div className="flex items-center gap-2">
                <div className="h-[2px] flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white/30 rounded-full" style={{ width: "60%" }} />
                </div>
                <span className="text-[8px] text-white/30">0:18</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#111111] px-3 py-2 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-white/40 font-medium">Preview</span>
          </div>
          <span className="text-[9px] text-white/30">0:30</span>
        </div>
      </div>

      {/* Chat panel */}
      <div className="w-[44%] flex flex-col bg-[#111111] rounded-2xl bg-white/[0.02] overflow-hidden">
        <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l2.1 4.9L15 7.1l-3.6 3.2.9 5.1L8 13l-4.3 2.4.9-5.1L1 7.1l4.9-1.2L8 1z" fill="#111"/>
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-white/90">Navinta</span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        <div className="flex-1 overflow-hidden px-2.5 py-2.5 flex flex-col gap-2.5">
          {history.map((idx) => (
            <div key={idx} className="flex flex-col gap-1.5" style={{ animation: "smoothFadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              <div className="self-end bg-white/5 rounded-2xl rounded-tr-md px-3 py-2 max-w-[92%]">
                <p className="text-[10px] text-white/80 leading-snug">{directorSteps[idx].message}</p>
              </div>
              <div className="self-start flex items-start gap-1.5 max-w-[92%]">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tl-md px-3 py-2">
                  <p className="text-[10px] text-white/80 leading-snug">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="inline mr-1 -mt-[1px]"><path d="M3 8l4 4 6-7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {directorSteps[idx].response}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {activeStep >= 0 && !history.includes(activeStep) && (
            <div className="self-end bg-white/5 rounded-2xl rounded-tr-md px-3 py-2 max-w-[92%]" style={{ animation: "smoothFadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              <p className="text-[10px] text-white/80 leading-snug">
                {typedText}
                <span className="inline-block w-[1px] h-[11px] bg-white/80 ml-[2px] align-middle" style={{ animation: "cursorBlink 1s step-end infinite" }} />
              </p>
            </div>
          )}

          {showResponse && activeStep >= 0 && !history.includes(activeStep) && (
            <div className="self-start flex items-start gap-1.5 max-w-[92%]" style={{ animation: "smoothFadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tl-md px-3 py-2">
                <p className="text-[10px] text-white/80 leading-snug">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="inline mr-1 -mt-[1px]"><path d="M3 8l4 4 6-7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {directorSteps[activeStep].response}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-2.5 py-2.5 border-t border-white/5">
          <div className="bg-white/[0.03] bg-white/[0.02] rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] text-white/20 flex-1">Tell Navinta what to change…</span>
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 85%" },
      });

      gsap.from(card1Ref.current, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: card1Ref.current, start: "top 85%" },
      });

      gsap.from(card2Ref.current, {
        y: 60,
        opacity: 0,
        duration: 1,
        delay: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: card2Ref.current, start: "top 85%" },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes smoothFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes waveBar {
          from { transform: scaleY(0.7); }
          to { transform: scaleY(1.3); }
        }
      `}</style>
      <section ref={sectionRef} className="py-32 px-6" style={{ background: "#0a0a0a" }}>
        <div className="max-w-6xl mx-auto">
          <div ref={headingRef} className="max-w-2xl mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-5">
              See it in action.
            </h2>
            <p className="text-lg text-white/40 leading-relaxed">
              Watch how Navinta AI transforms your ideas into polished, publish-ready videos — no editing experience required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div ref={card1Ref}>
              <div
                className="h-[540px] rounded-2xl p-5 flex flex-col relative overflow-hidden bg-white/[0.02]"
                style={{ background: "linear-gradient(180deg, #111111 0%, #0d0d0d 100%)" }}
              >
                <PlanningAnimation />
              </div>
              <div className="mt-5 px-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  AI-powered planning
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Describe your goal and Navinta builds a shot-by-shot plan — hooks, transitions, and timing included.
                </p>
              </div>
            </div>

            <div ref={card2Ref}>
              <div
                className="h-[540px] rounded-2xl p-5 flex flex-col relative overflow-hidden bg-white/[0.02]"
                style={{ background: "linear-gradient(180deg, #111111 0%, #0d0d0d 100%)" }}
              >
                <DirectorAnimation />
              </div>
              <div className="mt-5 px-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Edit like a director
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Tell Navinta what to change in plain language — it tightens cuts, adds b-roll, and polishes your video automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
