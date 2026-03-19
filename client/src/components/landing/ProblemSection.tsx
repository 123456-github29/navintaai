import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const problems = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Hours spent planning",
    description: "Figuring out what to say, how to say it, and when to post takes more time than actually creating.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    title: "Blank screen anxiety",
    description: "You hit record and freeze. Without a plan or teleprompter, every take feels like a guess.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
      </svg>
    ),
    title: "Editing is a bottleneck",
    description: "Cutting clips, adding captions, and syncing audio across tools eats up your creative energy.",
  },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(".problem-card", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
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
            The problem
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
            Creating video content is hard
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
            Most creators spend more time on logistics than creativity. The tools exist, but they don't work together.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((problem, i) => (
            <div key={i} className="problem-card nv-card p-7">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style={{ background: "rgba(15,163,126,0.08)", color: "#0fa37e" }}>
                {problem.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#202123" }}>
                {problem.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6e6e80" }}>
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
