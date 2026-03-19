import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const problems = [
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    title: "Hours spent planning",
    description: "Figuring out what to say, how to say it, and when to post takes more time than actually creating the content itself.",
    accent: "#7c5cfc",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
    title: "Blank screen anxiety",
    description: "You hit record and freeze. Without a plan or teleprompter, every take feels uncertain and unscripted.",
    accent: "#00d4ff",
  },
  {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>,
    title: "Editing is a bottleneck",
    description: "Cutting clips, adding captions, syncing audio across multiple tools drains your creative energy every single week.",
    accent: "#ff6b9d",
  },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Heading animation
      gsap.from(".problem-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      // Cards with 3D rotation entrance
      gsap.from(".problem-card", {
        y: 60, opacity: 0, rotateX: 8, duration: 0.9, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative" style={{ background: "#0d0d0d" }}>
      {/* Subtle orb */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ perspective: "1000px" }}>
          {problems.map((p, i) => (
            <div key={i} className="problem-card nv-card nv-gradient-border nv-hover-glow p-7 group" style={{ transformStyle: "preserve-3d" }}>
              <div className="nv-icon-glow w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                {p.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 transition-colors duration-300">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{p.description}</p>

              {/* Subtle accent line at bottom */}
              <div className="mt-6 h-px w-0 group-hover:w-full transition-all duration-700 ease-out" style={{
                background: `linear-gradient(90deg, ${p.accent}, transparent)`,
                opacity: 0.3,
              }} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
