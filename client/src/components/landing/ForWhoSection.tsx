import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const personas = [
  {
    title: "Founders & CEOs",
    description: "Build thought leadership and attract customers with consistent video content, without hiring a production team.",
    tags: ["LinkedIn", "Thought Leadership", "Brand Building"],
  },
  {
    title: "Coaches & Consultants",
    description: "Share your expertise at scale. Create educational content that builds trust and drives client inquiries.",
    tags: ["Education", "Trust Building", "Client Acquisition"],
  },
  {
    title: "Content Creators",
    description: "Maintain a consistent posting schedule across platforms. Spend more time creating, less time editing.",
    tags: ["Multi-Platform", "Consistency", "Growth"],
  },
  {
    title: "Marketing Teams",
    description: "Produce high-quality video at the pace social media demands. No more waiting on external agencies.",
    tags: ["Social Media", "Brand Content", "Speed"],
  },
];

export default function ForWhoSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(".persona-card", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section" style={{ background: "#f7f7f8" }}>
      <div className="nv-container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
            Built for
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
            For anyone who needs to show up on camera
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
            Whether you're a solo founder or part of a team, Navinta adapts to how you create.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((persona, i) => (
            <div key={i} className="persona-card nv-card p-7">
              <h3 className="text-xl font-bold mb-3" style={{ color: "#202123" }}>
                {persona.title}
              </h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "#6e6e80" }}>
                {persona.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {persona.tags.map((tag) => (
                  <span key={tag} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(15,163,126,0.06)", color: "#0fa37e", border: "1px solid rgba(15,163,126,0.12)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
