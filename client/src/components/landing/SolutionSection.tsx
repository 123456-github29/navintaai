import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>, title: "AI Content Planning", description: "A full month of video ideas tailored to your brand, audience, and platform.", accent: "#7c5cfc" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Director Mode", description: "Built-in teleprompter with shot-by-shot guidance as you record.", accent: "#00d4ff" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242"/><path d="M12 12v9M8 17l4 4 4-4"/></svg>, title: "Automatic Editing", description: "Smart cuts, B-roll insertion, and captions applied automatically.", accent: "#ff6b9d" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, title: "Multi-Platform Export", description: "Optimized for TikTok, Reels, Shorts, and LinkedIn automatically.", accent: "#7c5cfc" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, title: "Brand Kit", description: "Your logos, colors, and fonts applied to every export consistently.", accent: "#00d4ff" },
  { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>, title: "Schedule & Analytics", description: "Post across platforms and track what works to optimize your strategy.", accent: "#ff6b9d" },
];

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Heading
      gsap.from(".solution-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      // Cards with staggered 3D entrance
      gsap.from(".feature-card", {
        y: 50, opacity: 0, rotateY: -4, duration: 0.8, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="showcase" className="nv-section relative" style={{ background: "#0d0d0d" }}>
      {/* Ambient orbs */}
      <div className="nv-orb nv-orb-cyan" style={{ width: 400, height: 400, top: "10%", left: "-5%" }} />
      <div className="nv-orb nv-orb-rose" style={{ width: 300, height: 300, bottom: "10%", right: "5%" }} />

      <div className="nv-container relative z-10">
        <div className="solution-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(0,212,255,0.6)" }}>Capabilities</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
            Everything you need<br className="hidden md:block" /> to create consistently
          </h2>
          <p className="mt-5 text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
            One platform replaces your content planner, teleprompter, editor, and publisher.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ perspective: "1200px" }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card nv-card nv-gradient-border nv-hover-glow p-7 group cursor-default" style={{ transformStyle: "preserve-3d" }}>
              {/* Icon with accent glow */}
              <div className="nv-icon-glow w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                {f.icon}
              </div>
              <h3 className="text-[0.9375rem] font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.description}</p>

              {/* Accent corner dot */}
              <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" style={{
                background: f.accent,
                boxShadow: `0 0 8px ${f.accent}`,
              }} />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
