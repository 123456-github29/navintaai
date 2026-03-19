import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Animated story scenes for each problem ─── */

function PlanningScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !ref.current) return;
    const items = ref.current.querySelectorAll(".plan-item");
    gsap.fromTo(items, { x: -15, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: "power3.out" });
  }, [visible]);

  return (
    <div ref={ref} className="mt-5 rounded-lg overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="p-4 space-y-2">
        {/* Scattered sticky notes / todo list */}
        {[
          { text: "What topic this week?", done: false, w: "75%" },
          { text: "Research trending audios", done: false, w: "65%" },
          { text: "Write script for Monday", done: false, w: "80%" },
          { text: "Find posting times", done: false, w: "55%" },
        ].map((item, i) => (
          <div key={i} className="plan-item flex items-center gap-2" style={{ opacity: 0 }}>
            <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ borderColor: "rgba(124,92,252,0.3)", background: "rgba(124,92,252,0.05)" }} />
            <div className="h-2 rounded-full" style={{
              background: `linear-gradient(90deg, rgba(124,92,252,${0.12 - i * 0.02}), transparent)`,
              width: item.w,
            }} />
          </div>
        ))}
        {/* Clock animation */}
        <div className="flex items-center gap-2 pt-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="2" opacity="0.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <div className="text-[10px] font-mono" style={{ color: "rgba(124,92,252,0.5)" }}>3+ hours spent...</div>
        </div>
      </div>
    </div>
  );
}

function AnxietyScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !ref.current) return;
    // Animate cursor blink and failed takes
    gsap.fromTo(ref.current.querySelector(".cursor-blink"), { opacity: 0 }, { opacity: 1, duration: 0.5, repeat: -1, yoyo: true });
    const takes = ref.current.querySelectorAll(".take-item");
    gsap.fromTo(takes, { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.2, ease: "power3.out", delay: 0.3 });
  }, [visible]);

  return (
    <div ref={ref} className="mt-5 rounded-lg overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="p-4">
        {/* Camera viewfinder mockup */}
        <div className="rounded-md aspect-[16/9] relative flex items-center justify-center mb-3" style={{
          background: "#0d0d0d",
          border: "1px solid rgba(255,255,255,0.04)",
        }}>
          {/* Blinking cursor representing blank screen */}
          <div className="cursor-blink w-px h-5" style={{ background: "#00d4ff", boxShadow: "0 0 6px rgba(0,212,255,0.4)" }} />
          {/* REC dot */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff6b9d" }} />
            <span className="text-[7px] font-mono" style={{ color: "rgba(255,107,157,0.5)" }}>REC</span>
          </div>
        </div>
        {/* Failed takes */}
        <div className="space-y-1">
          {["Take 1 — scrapped", "Take 2 — scrapped", "Take 3 — scrapped"].map((t, i) => (
            <div key={i} className="take-item flex items-center gap-2" style={{ opacity: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff6b9d" strokeWidth="2.5" opacity="0.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span className="text-[10px] line-through" style={{ color: "rgba(255,107,157,0.35)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditingScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !ref.current) return;
    const tracks = ref.current.querySelectorAll(".timeline-track");
    gsap.fromTo(tracks, { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.15, ease: "power2.out", delay: 0.2 });
    const tools = ref.current.querySelectorAll(".tool-icon");
    gsap.fromTo(tools, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power3.out", delay: 0.5 });
  }, [visible]);

  return (
    <div ref={ref} className="mt-5 rounded-lg overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="p-4">
        {/* Mini timeline editor */}
        <div className="space-y-1.5 mb-3">
          {[
            { label: "Video", color: "#ff6b9d", w: "85%" },
            { label: "Audio", color: "#7c5cfc", w: "78%" },
            { label: "Captions", color: "#00d4ff", w: "60%" },
            { label: "B-roll", color: "#7c5cfc", w: "40%" },
          ].map((track, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[8px] w-10 shrink-0 text-right font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{track.label}</span>
              <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="timeline-track h-full rounded-sm origin-left" style={{
                  background: `linear-gradient(90deg, ${track.color}30, ${track.color}15)`,
                  width: track.w,
                  borderLeft: `2px solid ${track.color}50`,
                }} />
              </div>
            </div>
          ))}
        </div>
        {/* Scattered tool icons */}
        <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {["Pr", "Ae", "Au", "Ps", "Dv"].map((tool, i) => (
            <div key={i} className="tool-icon w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold" style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: 0,
            }}>{tool}</div>
          ))}
          <span className="text-[9px] ml-auto" style={{ color: "rgba(255,107,157,0.4)" }}>5 tools needed</span>
        </div>
      </div>
    </div>
  );
}

const problems = [
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    title: "Hours spent planning",
    description: "Figuring out what to say, how to say it, and when to post takes more time than actually creating the content itself.",
    accent: "#7c5cfc",
    Scene: PlanningScene,
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
    title: "Blank screen anxiety",
    description: "You hit record and freeze. Without a plan or teleprompter, every take feels uncertain and unscripted.",
    accent: "#00d4ff",
    Scene: AnxietyScene,
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>,
    title: "Editing is a bottleneck",
    description: "Cutting clips, adding captions, syncing audio across multiple tools drains your creative energy every single week.",
    accent: "#ff6b9d",
    Scene: EditingScene,
  },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // 3D tilt handler per card
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const card = cardsRef.current?.children[idx] as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, { rotateY: x * 8, rotateX: -y * 5, duration: 0.3, ease: "power2.out" });
  }, []);

  const handleMouseLeave = useCallback((idx: number) => {
    const card = cardsRef.current?.children[idx] as HTMLElement;
    if (!card) return;
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power3.out" });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".problem-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });
      gsap.from(".problem-card", {
        y: 60, opacity: 0, rotateX: 8, duration: 0.9, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative" style={{ background: "#0d0d0d" }}>
      <div className="nv-orb nv-orb-violet" style={{ width: 350, height: 350, top: "20%", right: "-5%", opacity: 0.04 }} />

      <div className="nv-container relative z-10">
        <div className="problem-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(124,92,252,0.6)" }}>
            The problem
          </p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
            Creating video content<br className="hidden md:block" /> shouldn't be this hard
          </h2>
          <p className="mt-5 text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Most creators spend more time on logistics than creativity.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ perspective: "1200px" }}>
          {problems.map((p, i) => (
            <div
              key={i}
              className="problem-card nv-card nv-hover-glow p-6 group relative overflow-hidden"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
            >
              {/* Top accent glow line */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
                background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
              }} />

              <div className="flex items-center gap-3 mb-3">
                <div className="nv-icon-glow w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  {p.icon}
                </div>
                <h3 className="text-base font-semibold text-white">{p.title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{p.description}</p>

              {/* Animated storyline scene */}
              <p.Scene />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
