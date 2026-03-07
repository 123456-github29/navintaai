import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type TabId = "agencies" | "creators" | "coaches";

const tabs: { id: TabId; label: string }[] = [
  { id: "agencies", label: "Small agencies" },
  { id: "creators", label: "Solo creators" },
  { id: "coaches", label: "Coaches" },
];

const tabContent: Record<TabId, { heading: string; body: string }> = {
  agencies: {
    heading: "Look premium without a production budget.",
    body: "Don't let production bottlenecks limit your growth. With Navinta AI, you can create professional videos in the time it usually takes to write a brief. Iterate fast with AI-powered planning, recording guidance, and automatic editing.",
  },
  creators: {
    heading: "Go from idea to posted in under an hour.",
    body: "You don't need a production team. Navinta AI is your personal director, editor, and caption writer. Record, auto-edit, and export polished short-form videos that look like they were made by a studio.",
  },
  coaches: {
    heading: "Turn one session into a month of content.",
    body: "Record your coaching session once and let Navinta AI cut it into punchy short clips, add branded captions, and package each piece for Instagram, TikTok, and LinkedIn — ready to post.",
  },
};

function useLoop(active: boolean, duration: number, callback: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!active) return;
    callback();
    timerRef.current = setInterval(callback, duration);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);
}

/* ─── AGENCIES ANIMATION ─── */
const CLIENTS = [
  { name: "Apex Studio", color: "#6366f1", initials: "AS" },
  { name: "Bold & Co.", color: "#f59e0b", initials: "BC" },
  { name: "Nova Media", color: "#10b981", initials: "NM" },
];
const STAGES = ["Planning", "Recording", "Editing", "Delivered"];
const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  Planning: { bg: "#f3f4f6", text: "#6b7280" },
  Recording: { bg: "#fef9c3", text: "#92400e" },
  Editing: { bg: "#dbeafe", text: "#1e40af" },
  Delivered: { bg: "#d1fae5", text: "#065f46" },
};

function AgenciesAnimation({ active }: { active: boolean }) {
  const [stages, setStages] = useState([0, 1, 2]);
  const [progress, setProgress] = useState([35, 62, 88]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (tick === 0) return;
    setProgress((prev) =>
      prev.map((p) => {
        const next = p + Math.floor(Math.random() * 12 + 4);
        return next > 100 ? 10 : next;
      })
    );
    setStages((prev) =>
      prev.map((s, i) => {
        if (progress[i] > 90) return (s + 1) % STAGES.length;
        return s;
      })
    );
  }, [tick]);

  return (
    <div className="w-full h-full flex flex-col gap-3 p-6 justify-center">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-[#111] uppercase tracking-wider">Client Projects</span>
        <span className="text-[10px] text-[#999]">{CLIENTS.length} active</span>
      </div>
      {CLIENTS.map((client, i) => {
        const stage = STAGES[stages[i]];
        const sc = STAGE_COLORS[stage];
        const prog = progress[i];
        const isDelivered = stage === "Delivered";
        return (
          <div
            key={client.name}
            className="bg-white rounded-2xl border border-[#f0f0f0] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            style={{
              transition: "opacity 0.4s ease",
              opacity: isDelivered ? 0.7 : 1,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: client.color }}
              >
                {client.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#111] truncate">{client.name}</p>
                <p className="text-[10px] text-[#999]">Brand video — Week {i + 1}</p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: sc.bg, color: sc.text, transition: "all 0.5s ease" }}
              >
                {isDelivered ? "✓ " : ""}{stage}
              </span>
            </div>
            <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${prog}%`,
                  backgroundColor: client.color,
                  transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-[#bbb]">{prog}% complete</span>
              <span className="text-[9px] text-[#bbb]">{Math.round((100 - prog) / 10)} days left</span>
            </div>
          </div>
        );
      })}
      <div className="mt-1 flex items-center gap-1.5 px-1">
        <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        <span className="text-[10px] text-[#999]">Live — 3 clients in production</span>
      </div>
    </div>
  );
}

/* ─── SOLO CREATORS ANIMATION ─── */
const TRANSCRIPT_WORDS = [
  "Hey", "everyone,", "today", "I'm", "going", "to", "show", "you",
  "how", "I", "built", "a", "brand", "in", "30", "days…",
];

function CreatorsAnimation({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"record" | "transcript" | "cut" | "done">("record");
  const [wordCount, setWordCount] = useState(0);
  const [cuts, setCuts] = useState<number[]>([]);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [exportPulse, setExportPulse] = useState(false);

  useEffect(() => {
    if (!active) {
      setPhase("record");
      setWordCount(0);
      setCuts([]);
      setCaptionVisible(false);
      setExportPulse(false);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    const runCycle = () => {
      setPhase("record");
      setWordCount(0);
      setCuts([]);
      setCaptionVisible(false);
      setExportPulse(false);
      t = setTimeout(() => {
        setPhase("transcript");
        let w = 0;
        const wordInterval = setInterval(() => {
          w++;
          setWordCount(w);
          if (w >= TRANSCRIPT_WORDS.length) {
            clearInterval(wordInterval);
            setTimeout(() => {
              setPhase("cut");
              setCuts([2, 6, 11]);
              setTimeout(() => {
                setCaptionVisible(true);
                setTimeout(() => {
                  setExportPulse(true);
                  setPhase("done");
                  setTimeout(runCycle, 3000);
                }, 900);
              }, 1000);
            }, 600);
          }
        }, 160);
      }, 2000);
    };
    runCycle();
    return () => clearTimeout(t);
  }, [active]);

  const clipWidths = [22, 30, 24, 24];
  const clipColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

  return (
    <div className="w-full h-full flex flex-col gap-4 p-6 justify-center">
      <div
        className="rounded-2xl overflow-hidden relative flex-shrink-0"
        style={{ aspectRatio: "16/9", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {phase === "record" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                  <span className="text-[9px] font-semibold text-white/80 uppercase tracking-wide">REC</span>
                </>
              )}
              {(phase === "cut" || phase === "transcript") && (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#6366f1]" />
                  <span className="text-[9px] font-semibold text-white/80">AI Editing…</span>
                </>
              )}
              {phase === "done" && (
                <>
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-[9px] font-semibold text-white/80">Ready to export</span>
                </>
              )}
            </div>
            <span className="text-[9px] text-white/40">0:47</span>
          </div>

          <div className="flex items-center justify-center flex-1">
            {phase === "record" && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse" />
                  </div>
                </div>
                <span className="text-[9px] text-white/40">Recording shot 1…</span>
              </div>
            )}
            {captionVisible && (phase === "cut" || phase === "done") && (
              <div
                className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5"
                style={{ animation: "captionPop 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
              >
                <span className="text-white text-[11px] font-bold tracking-wide">I built a brand in 30 days</span>
              </div>
            )}
          </div>

          {(phase === "cut" || phase === "done") && (
            <div className="flex gap-1">
              {clipWidths.map((w, i) => (
                <div
                  key={i}
                  className="rounded-[3px] h-5 flex items-center justify-center relative overflow-hidden"
                  style={{
                    width: `${w}%`,
                    backgroundColor: clipColors[i],
                    animation: `clipSlide 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms both`,
                  }}
                >
                  <span className="text-[6px] text-white/80 font-medium absolute">
                    {["Hook", "Story", "Demo", "CTA"][i]}
                  </span>
                </div>
              ))}
            </div>
          )}
          {phase === "record" && (
            <div className="flex gap-0.5 items-end h-5">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-white/20"
                  style={{
                    height: `${30 + Math.sin(i * 0.8) * 50}%`,
                    animation: "waveAnim 1.2s ease-in-out infinite alternate",
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {(phase === "transcript" || phase === "cut" || phase === "done") && (
        <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-3.5 h-3.5 rounded-full bg-[#6366f1] flex items-center justify-center">
              <svg width="7" height="7" viewBox="0 0 16 16" fill="white">
                <path d="M8 1l2.1 4.9L15 7.1l-3.6 3.2.9 5.1L8 13l-4.3 2.4.9-5.1L1 7.1l4.9-1.2L8 1z" />
              </svg>
            </div>
            <span className="text-[9px] font-semibold text-[#6366f1]">AI Transcript</span>
          </div>
          <p className="text-[10px] text-[#444] leading-relaxed">
            {TRANSCRIPT_WORDS.slice(0, wordCount).map((w, i) => (
              <span
                key={i}
                style={{
                  display: "inline",
                  backgroundColor: cuts.includes(i) ? "rgba(99,102,241,0.15)" : "transparent",
                  borderRadius: cuts.includes(i) ? "3px" : undefined,
                  padding: cuts.includes(i) ? "0 1px" : undefined,
                }}
              >
                {w}{" "}
              </span>
            ))}
            {phase === "transcript" && (
              <span className="inline-block w-0.5 h-3 bg-[#6366f1] align-middle ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
      )}

      {exportPulse && (
        <button
          className="w-full py-2.5 rounded-xl text-[11px] font-semibold text-white flex items-center justify-center gap-1.5"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            animation: "exportAppear 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export 4 clips — ready
        </button>
      )}
    </div>
  );
}

/* ─── COACHES ANIMATION ─── */
const SESSION_CLIPS = [
  { label: "Mindset shift", dur: "0:58", platform: "IG", color: "#f472b6" },
  { label: "The 3-step method", dur: "1:12", platform: "TT", color: "#fb923c" },
  { label: "Client story", dur: "0:45", platform: "LI", color: "#60a5fa" },
  { label: "Quick tip #7", dur: "0:31", platform: "YT", color: "#34d399" },
  { label: "Call to action", dur: "0:22", platform: "IG", color: "#a78bfa" },
];

function CoachesAnimation({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<"session" | "slicing" | "clips" | "done">("session");
  const [sliceProgress, setSliceProgress] = useState(0);
  const [visibleClips, setVisibleClips] = useState(0);
  const [captionIdx, setCaptionIdx] = useState(-1);

  useEffect(() => {
    if (!active) {
      setPhase("session");
      setSliceProgress(0);
      setVisibleClips(0);
      setCaptionIdx(-1);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setPhase("session");
      setSliceProgress(0);
      setVisibleClips(0);
      setCaptionIdx(-1);
      await delay(1200);
      if (cancelled) return;
      setPhase("slicing");
      for (let i = 1; i <= 100; i++) {
        await delay(18);
        if (cancelled) return;
        setSliceProgress(i);
      }
      setPhase("clips");
      for (let i = 1; i <= SESSION_CLIPS.length; i++) {
        await delay(280);
        if (cancelled) return;
        setVisibleClips(i);
      }
      await delay(400);
      if (cancelled) return;
      for (let i = 0; i < SESSION_CLIPS.length; i++) {
        await delay(250);
        if (cancelled) return;
        setCaptionIdx(i);
      }
      setPhase("done");
      await delay(3500);
      if (!cancelled) run();
    };
    run();
    return () => { cancelled = true; };
  }, [active]);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-6 justify-center">
      <div className="bg-white rounded-2xl border border-[#f0f0f0] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f472b6] to-[#a78bfa] flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 16 16" fill="white">
                <path d="M8 1a3 3 0 110 6A3 3 0 018 1zM2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-[#111]">Coaching Session #12</span>
          </div>
          <span className="text-[9px] text-[#999] bg-[#f3f4f6] px-2 py-0.5 rounded-full">47 min</span>
        </div>

        <div className="relative h-8 bg-[#f8f8f8] rounded-lg overflow-hidden mb-2">
          <div className="absolute inset-y-0 left-0 flex items-end gap-0.5 px-1 w-full">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${25 + Math.abs(Math.sin(i * 0.35) * 55)}%`,
                  backgroundColor: sliceProgress > 0 && (i / 60) * 100 < sliceProgress
                    ? "#a78bfa"
                    : "#d1d5db",
                  transition: "background-color 0.1s ease",
                }}
              />
            ))}
          </div>
          {phase === "slicing" && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#6366f1] shadow-[0_0_6px_rgba(99,102,241,0.8)]"
              style={{ left: `${sliceProgress}%`, transition: "left 0.02s linear" }}
            />
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] text-[#bbb]">0:00</span>
          <span className="text-[9px] text-[#6366f1] font-medium">
            {phase === "slicing" ? `Analyzing… ${sliceProgress}%` : phase === "session" ? "Full recording" : `${SESSION_CLIPS.length} clips found`}
          </span>
          <span className="text-[9px] text-[#bbb]">47:00</span>
        </div>
      </div>

      {(phase === "clips" || phase === "done") && (
        <div className="space-y-2">
          {SESSION_CLIPS.slice(0, visibleClips).map((clip, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 bg-white border border-[#f0f0f0] rounded-xl px-3 py-2"
              style={{ animation: "clipAppear 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              <div
                className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-white text-[8px] font-bold"
                style={{ backgroundColor: clip.color }}
              >
                {clip.platform}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[#111] truncate">{clip.label}</p>
                <p className="text-[9px] text-[#bbb]">{clip.dur}</p>
              </div>
              {captionIdx >= i && (
                <span
                  className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${clip.color}20`,
                    color: clip.color,
                    animation: "captionBadge 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
                  }}
                >
                  Captions ✓
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

export default function ForWhoSection() {
  const [activeTab, setActiveTab] = useState<TabId>("agencies");
  const ctaRef = useRef<HTMLElement>(null);
  const ctaHeadingRef = useRef<HTMLHeadingElement>(null);
  const ctaSubRef = useRef<HTMLParagraphElement>(null);
  const splitRef = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(ctaHeadingRef.current, {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ctaRef.current, start: "top 70%" },
      });

      gsap.from(ctaSubRef.current, {
        y: 25,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "power3.out",
        scrollTrigger: { trigger: ctaRef.current, start: "top 70%" },
      });

      gsap.from(mockupRef.current, {
        x: -70,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: splitRef.current, start: "top 75%" },
      });

      gsap.from(contentRef.current, {
        x: 70,
        opacity: 0,
        duration: 1,
        delay: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: splitRef.current, start: "top 75%" },
      });

      gsap.to(mockupRef.current, {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: splitRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  const content = tabContent[activeTab];

  return (
    <>
      <style>{`
        @keyframes captionPop {
          from { opacity: 0; transform: scale(0.8) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes clipSlide {
          from { opacity: 0; transform: scaleX(0.6) translateY(4px); }
          to   { opacity: 1; transform: scaleX(1) translateY(0); }
        }
        @keyframes exportAppear {
          from { opacity: 0; transform: scale(0.9) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes clipAppear {
          from { opacity: 0; transform: translateX(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes captionBadge {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes waveAnim {
          from { transform: scaleY(0.6); }
          to   { transform: scaleY(1.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>

      <section
        ref={ctaRef}
        className="rounded-3xl mx-6 md:mx-12 text-center py-32 px-6"
        style={{
          background:
            "radial-gradient(circle at 75% 40%, #fbcfe8, transparent 45%), radial-gradient(circle at 25% 60%, #dbeafe, transparent 45%)",
        }}
      >
        <h2 ref={ctaHeadingRef} className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-[#111111]">
          Your AI director is ready.
        </h2>
        <p ref={ctaSubRef} className="text-[#666666] max-w-lg mx-auto mt-6 text-lg">
          From idea to export in minutes. No editing skills required.
        </p>
      </section>

      <section ref={splitRef} className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          <div
            ref={mockupRef}
            className="h-[420px] md:h-[520px] rounded-3xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #f8f7ff 0%, #eef2ff 100%)", border: "1px solid #e8e8f0" }}
          >
            <div
              key={activeTab}
              className="w-full h-full"
              style={{ animation: "panelFadeIn 0.35s ease-out" }}
            >
              {activeTab === "agencies" && <AgenciesAnimation active={activeTab === "agencies"} />}
              {activeTab === "creators" && <CreatorsAnimation active={activeTab === "creators"} />}
              {activeTab === "coaches" && <CoachesAnimation active={activeTab === "coaches"} />}
            </div>
            <style>{`
              @keyframes panelFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>

          <div ref={contentRef}>
            <div className="flex gap-6 mb-6 border-b border-gray-100 pb-4 text-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative pb-1 transition-colors"
                  style={{
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? "#111111" : "#999999",
                  }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111] rounded-full"
                      style={{ animation: "underlineSlide 0.2s ease-out" }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div key={activeTab} style={{ animation: "contentFade 0.3s ease-out" }}>
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-[#111111] mb-4" style={{ textWrap: "balance" }}>
                {content.heading}
              </h2>
              <p className="text-[#666666] leading-relaxed">
                {content.body}
              </p>
            </div>
            <style>{`
              @keyframes underlineSlide {
                from { transform: scaleX(0); }
                to   { transform: scaleX(1); }
              }
              @keyframes contentFade {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>

        </div>
      </section>
    </>
  );
}
