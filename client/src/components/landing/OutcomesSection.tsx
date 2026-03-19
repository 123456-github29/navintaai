import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const metrics = [
  { value: "10x", label: "Faster production", description: "From idea to published video" },
  { value: "4hrs", label: "Saved per week", description: "Compared to manual workflow" },
  { value: "28", label: "Videos per month", description: "With one content plan" },
  { value: "0", label: "Editing skills needed", description: "AI handles post-production" },
];

export default function OutcomesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(".metric-item", {
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
    <section ref={sectionRef} className="nv-section" style={{ background: "#fff" }}>
      <div className="nv-container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
            Results
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
            Built for speed and consistency
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
            Navinta users create more content in less time, without sacrificing quality.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric, i) => (
            <div key={i} className="metric-item text-center p-6 rounded-xl" style={{ background: "#f7f7f8", border: "1px solid #e5e5e5" }}>
              <div className="text-4xl md:text-5xl font-bold tracking-tight mb-2" style={{ color: "#0fa37e" }}>
                {metric.value}
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#202123" }}>
                {metric.label}
              </div>
              <div className="text-xs" style={{ color: "#acacbe" }}>
                {metric.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
