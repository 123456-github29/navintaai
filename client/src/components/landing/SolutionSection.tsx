import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Mini visual demos for each feature ─── */

function PlanningVisual() {
  return (
    <div className="mt-4 rounded-lg p-3 space-y-1.5" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      {["Week 1: Brand story arc", "Week 2: Problem/solution hook", "Week 3: Customer proof", "Week 4: Behind the scenes"].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{
            background: `rgba(201,152,90,${0.05 + i * 0.02})`,
            border: "1px solid rgba(201,152,90,0.1)",
          }}>
            <span className="text-[7px] font-bold" style={{ color: "#c9985a" }}>{i + 1}</span>
          </div>
          <div className="flex-1 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{w}</div>
          <div className="w-8 h-1 rounded-full" style={{ background: `rgba(201,152,90,${0.2 - i * 0.04})` }} />
        </div>
      ))}
    </div>
  );
}

function DirectorVisual() {
  return (
    <div className="mt-4 rounded-lg overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="relative aspect-[16/10] flex items-center justify-center" style={{ background: "#0d0d0d" }}>
        <div className="absolute top-2 left-2 w-3 h-3 border-l border-t" style={{ borderColor: "rgba(201,152,90,0.25)" }} />
        <div className="absolute top-2 right-2 w-3 h-3 border-r border-t" style={{ borderColor: "rgba(201,152,90,0.25)" }} />
        <div className="absolute bottom-6 left-2 w-3 h-3 border-l border-b" style={{ borderColor: "rgba(201,152,90,0.25)" }} />
        <div className="absolute bottom-6 right-2 w-3 h-3 border-r border-b" style={{ borderColor: "rgba(201,152,90,0.25)" }} />
        <div className="w-8 h-8 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
          <div className="text-[8px] text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Start with a hook...</div>
        </div>
      </div>
      <div className="flex gap-1 px-2 py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {[1,2,3,4].map(n => (
          <div key={n} className="flex-1 h-0.5 rounded-full" style={{ background: n <= 2 ? "rgba(201,152,90,0.5)" : "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    </div>
  );
}

function EditingVisual() {
  return (
    <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="space-y-1">
        {[
          { label: "Cuts", w: "90%" },
          { label: "Captions", w: "70%" },
          { label: "B-roll", w: "50%" },
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[7px] w-10 text-right font-mono shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{t.label}</span>
            <div className="flex-1 h-2.5 rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="h-full rounded-sm" style={{ width: t.w, background: `rgba(201,152,90,${0.15 - i * 0.03})`, borderLeft: "2px solid rgba(201,152,90,0.4)" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-[8px] font-mono" style={{ color: "rgba(201,152,90,0.35)" }}>Auto-processing</span>
        <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#c9985a" }} />
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="grid grid-cols-4 gap-1.5">
        {["TikTok", "Reels", "Shorts", "LinkedIn"].map((p, i) => (
          <div key={i} className="rounded p-1.5 text-center" style={{ background: "rgba(201,152,90,0.04)", border: "1px solid rgba(201,152,90,0.08)" }}>
            <div className="text-[8px] font-bold" style={{ color: "rgba(201,152,90,0.6)" }}>{p}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1 mt-2">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c9985a" strokeWidth="2" opacity="0.4"><path d="M5 13l4 4L19 7"/></svg>
        <span className="text-[8px]" style={{ color: "rgba(201,152,90,0.4)" }}>Optimized for each</span>
      </div>
    </div>
  );
}

function BrandVisual() {
  return (
    <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded" style={{ background: "linear-gradient(135deg, #c9985a, #a07d50)" }} />
        <div className="space-y-1 flex-1">
          <div className="h-1.5 rounded-full w-20" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-1 rounded-full w-14" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
      </div>
      <div className="flex gap-1.5">
        {["#c9985a", "#a07d50", "#e0b97a", "#ffffff"].map((c, i) => (
          <div key={i} className="w-5 h-5 rounded-sm" style={{ background: c, opacity: 0.6, border: "1px solid rgba(255,255,255,0.08)" }} />
        ))}
        <div className="ml-auto text-[8px] self-end" style={{ color: "rgba(201,152,90,0.35)" }}>Brand Kit</div>
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-end gap-1 h-12 mb-2">
        {[40, 55, 35, 70, 60, 80, 45].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{
            height: `${h}%`,
            background: `linear-gradient(180deg, ${i === 5 ? "rgba(201,152,90,0.5)" : "rgba(201,152,90,0.12)"}, transparent)`,
          }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>7-day view</span>
        <span className="text-[8px] font-semibold" style={{ color: "rgba(201,152,90,0.5)" }}>+24% growth</span>
      </div>
    </div>
  );
}

const features = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>, title: "AI Content Planning", description: "A full month of video ideas tailored to your brand, audience, and platform.", Visual: PlanningVisual },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Director Mode", description: "Built-in teleprompter with shot-by-shot guidance as you record.", Visual: DirectorVisual },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242"/><path d="M12 12v9M8 17l4 4 4-4"/></svg>, title: "Automatic Editing", description: "Smart cuts, B-roll insertion, and captions applied automatically.", Visual: EditingVisual },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, title: "Multi-Platform Export", description: "Optimized for TikTok, Reels, Shorts, and LinkedIn automatically.", Visual: ExportVisual },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, title: "Brand Kit", description: "Your logos, colors, and fonts applied to every export consistently.", Visual: BrandVisual },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>, title: "Schedule & Analytics", description: "Post across platforms and track what works to optimize your strategy.", Visual: AnalyticsVisual },
];

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const card = gridRef.current?.children[idx] as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, { rotateY: x * 5, rotateX: -y * 3, duration: 0.3, ease: "power2.out" });
  }, []);

  const handleMouseLeave = useCallback((idx: number) => {
    const card = gridRef.current?.children[idx] as HTMLElement;
    if (!card) return;
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power3.out" });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".solution-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      // Each card enters individually triggered by its own scroll position
      const cards = document.querySelectorAll(".feature-card");
      cards.forEach((card) => {
        gsap.from(card, {
          y: 70,
          opacity: 0,
          scale: 0.96,
          rotateX: 4,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            once: true,
          },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="showcase" className="nv-section relative" style={{ background: "#0d0d0d" }}>
      <div className="nv-orb nv-orb-violet" style={{ width: 350, height: 350, top: "10%", left: "-5%", opacity: 0.03 }} />

      <div className="nv-container relative z-10">
        <div className="solution-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(201,152,90,0.5)" }}>Capabilities</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
            Everything you need<br className="hidden md:block" /> to create consistently
          </h2>
          <p className="mt-5 text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
            One platform replaces your content planner, teleprompter, editor, and publisher.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ perspective: "1200px" }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card nv-card nv-hover-glow p-6 group cursor-default relative"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
                background: "linear-gradient(90deg, transparent, rgba(201,152,90,0.3), transparent)",
              }} />

              <div className="flex items-center gap-3 mb-2">
                <div className="nv-icon-glow w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {f.icon}
                </div>
                <h3 className="text-[0.9375rem] font-semibold text-white">{f.title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.description}</p>

              {/* Visual demo */}
              <f.Visual />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
