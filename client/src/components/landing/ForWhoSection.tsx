import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const personas = [
  { title: "Founders & CEOs", description: "Build thought leadership and attract customers with consistent video content.", tags: ["LinkedIn", "Thought Leadership", "Brand"], accent: "#c9985a" },
  { title: "Coaches & Consultants", description: "Share expertise at scale. Create educational content that builds trust and drives inquiries.", tags: ["Education", "Trust", "Clients"], accent: "#a07d50" },
  { title: "Content Creators", description: "Maintain a consistent posting schedule across platforms without the editing grind.", tags: ["Multi-Platform", "Growth", "Consistency"], accent: "#e0b97a" },
  { title: "Marketing Teams", description: "Produce high-quality video at the pace social media demands. No agency needed.", tags: ["Social Media", "Speed", "Brand Content"], accent: "#c9985a" },
];

export default function ForWhoSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".forwho-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      gsap.from(".persona-card", {
        y: 50, opacity: 0, scale: 0.96, duration: 0.8, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative" style={{ background: "#0d0d0d" }}>
      <div className="nv-orb nv-orb-rose" style={{ width: 350, height: 350, top: "20%", left: "5%" }} />

      <div className="nv-container relative z-10">
        <div className="forwho-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(201,152,90,0.6)" }}>Built for</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">
            For anyone who needs to show up on camera
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {personas.map((p, i) => (
            <div key={i} className="persona-card nv-card nv-gradient-border nv-hover-glow p-7 group relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
                background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
              }} />

              <h3 className="text-xl font-semibold text-white mb-3 transition-colors duration-300">{p.title}</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>{p.description}</p>
              <div className="flex flex-wrap gap-2">
                {p.tags.map((tag) => (
                  <span key={tag} className="nv-tag-hover text-xs font-medium px-3 py-1.5 rounded-full" style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
