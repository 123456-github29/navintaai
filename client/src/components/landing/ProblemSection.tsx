import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Mini demo scenes ─── */

function PlanningDemo() {
  return (
    <div className="mt-5 rounded-lg" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="p-4 space-y-2">
        {[
          { text: "What topic this week?", w: "75%" },
          { text: "Research trending audios", w: "65%" },
          { text: "Write script for Monday", w: "80%" },
          { text: "Find posting times", w: "55%" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ borderColor: "rgba(201,152,90,0.25)", background: "rgba(201,152,90,0.04)" }} />
            <div className="h-2 rounded-full" style={{
              background: `linear-gradient(90deg, rgba(201,152,90,${0.1 - i * 0.015}), transparent)`,
              width: item.w,
            }} />
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9985a" strokeWidth="2" opacity="0.4">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <div className="text-[10px] font-mono" style={{ color: "rgba(201,152,90,0.4)" }}>3+ hours spent...</div>
        </div>
      </div>
    </div>
  );
}

function AnxietyDemo() {
  return (
    <div className="mt-5 rounded-lg" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="p-4">
        <div className="rounded-md aspect-[16/9] relative flex items-center justify-center mb-3" style={{
          background: "#0d0d0d",
          border: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div className="w-px h-5 animate-pulse" style={{ background: "#c9985a", boxShadow: "0 0 6px rgba(201,152,90,0.3)" }} />
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9985a" }} />
            <span className="text-[7px] font-mono" style={{ color: "rgba(201,152,90,0.4)" }}>REC</span>
          </div>
        </div>
        <div className="space-y-1">
          {["Take 1 — scrapped", "Take 2 — scrapped", "Take 3 — scrapped"].map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c9985a" strokeWidth="2.5" opacity="0.4">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span className="text-[10px] line-through" style={{ color: "rgba(201,152,90,0.3)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditingDemo() {
  return (
    <div className="mt-5 rounded-lg" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="p-4">
        <div className="space-y-1.5 mb-3">
          {[
            { label: "Video", w: "85%" },
            { label: "Audio", w: "78%" },
            { label: "Captions", w: "60%" },
            { label: "B-roll", w: "40%" },
          ].map((track, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[8px] w-10 shrink-0 text-right font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{track.label}</span>
              <div className="flex-1 h-3 rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="h-full rounded-sm" style={{
                  background: `linear-gradient(90deg, rgba(201,152,90,${0.2 - i * 0.03}), rgba(201,152,90,0.05))`,
                  width: track.w,
                  borderLeft: "2px solid rgba(201,152,90,0.35)",
                }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {["Pr", "Ae", "Au", "Ps", "Dv"].map((tool, i) => (
            <div key={i} className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold" style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>{tool}</div>
          ))}
          <span className="text-[9px] ml-auto" style={{ color: "rgba(201,152,90,0.35)" }}>5 tools needed</span>
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
    Demo: PlanningDemo,
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
    title: "Blank screen anxiety",
    description: "You hit record and freeze. Without a plan or teleprompter, every take feels uncertain and unscripted.",
    Demo: AnxietyDemo,
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>,
    title: "Editing is a bottleneck",
    description: "Cutting clips, adding captions, syncing audio across multiple tools drains your creative energy every single week.",
    Demo: EditingDemo,
  },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const card = cardsRef.current?.children[idx] as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, { rotateY: x * 6, rotateX: -y * 4, duration: 0.3, ease: "power2.out" });
  }, []);

  const handleMouseLeave = useCallback((idx: number) => {
    const card = cardsRef.current?.children[idx] as HTMLElement;
    if (!card) return;
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power3.out" });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Heading
      gsap.from(".problem-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      // Each card enters individually as you scroll — staggered by scroll position
      const cards = document.querySelectorAll(".problem-card");
      cards.forEach((card, i) => {
        gsap.from(card, {
          y: 80,
          opacity: 0,
          rotateX: 6,
          scale: 0.95,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
          },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative" style={{ background: "#0d0d0d" }}>
      <div className="nv-orb nv-orb-violet" style={{ width: 300, height: 300, top: "20%", right: "-5%", opacity: 0.03 }} />

      <div className="nv-container relative z-10">
        <div className="problem-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(201,152,90,0.5)" }}>
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
              className="problem-card nv-card nv-hover-glow p-6 group relative"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
                background: "linear-gradient(90deg, transparent, rgba(201,152,90,0.3), transparent)",
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

              {/* Mini demo */}
              <p.Demo />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
