import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const metrics = [
  { end: 10, suffix: "x", label: "Faster", description: "production speed", accent: "#7c5cfc" },
  { end: 4, suffix: "hrs", label: "Saved", description: "per week", accent: "#00d4ff" },
  { end: 28, suffix: "", label: "Videos", description: "per month", accent: "#ff6b9d" },
  { end: 0, suffix: "", label: "Skills", description: "needed to edit", accent: "#7c5cfc" },
];

function AnimatedCounter({ end, suffix, triggered }: { end: number; suffix: string; triggered: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!triggered) return;
    if (end === 0) { setCount(0); return; }
    let current = 0;
    const step = Math.max(1, Math.floor(end / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= end) { setCount(end); clearInterval(interval); }
      else setCount(current);
    }, 40);
    return () => clearInterval(interval);
  }, [triggered, end]);

  return <>{count}{suffix}</>;
}

export default function OutcomesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTriggered(true); return; }
    const ctx = gsap.context(() => {
      // Heading
      gsap.from(".outcomes-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 80%",
        once: true,
        onEnter: () => setTriggered(true),
      });

      // Cards with 3D scale entrance
      gsap.from(".metric-card", {
        y: 40, opacity: 0, scale: 0.9, rotateX: 6, duration: 0.7, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative" style={{ background: "#111111" }}>
      {/* Subtle orbs */}
      <div className="nv-orb nv-orb-cyan" style={{ width: 350, height: 350, top: "20%", right: "10%" }} />

      <div className="nv-container relative z-10">
        <div className="outcomes-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(0,212,255,0.6)" }}>Results</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">
            Built for speed and consistency
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5" style={{ perspective: "800px" }}>
          {metrics.map((m, i) => (
            <div key={i} className="metric-card nv-metric-glow text-center p-7 rounded-xl group" style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              transformStyle: "preserve-3d",
            }}>
              {/* Accent glow behind number */}
              <div className="relative inline-block">
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2 transition-all duration-500 group-hover:scale-110">
                  <AnimatedCounter end={m.end} suffix={m.suffix} triggered={triggered} />
                </div>
                {/* Color underline */}
                <div className="h-0.5 w-8 mx-auto rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" style={{
                  background: m.accent,
                  boxShadow: `0 0 10px ${m.accent}40`,
                }} />
              </div>
              <div className="text-sm font-semibold text-white/70 mb-0.5 mt-2">{m.label}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{m.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
