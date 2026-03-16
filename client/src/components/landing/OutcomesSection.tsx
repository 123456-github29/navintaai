import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function OutcomesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 78%" },
      });

      gsap.from(".outcome-card", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: cardsRef.current, start: "top 82%" },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const outcomes = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      label: "Speed",
      title: "10x faster production",
      description: "What used to take days now takes minutes. From idea to polished video in one sitting.",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      label: "Reach",
      title: "Platform-native output",
      description: "Every video is formatted for TikTok, Instagram, and YouTube — so it looks native, not repurposed.",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      label: "Quality",
      title: "Agency-grade quality",
      description: "Smart cuts, B-roll, captions, and color grading — the same techniques agencies charge thousands for.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
  ];

  return (
    <section ref={sectionRef} className="py-32 px-6 relative overflow-hidden" style={{ background: "#FFFFFF" }}>
      {/* Top rule */}
      <div className="hr-fade absolute top-0 left-0 right-0" />

      {/* Subtle right-side accent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -right-40 top-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div ref={headerRef} className="text-center mb-20">
          <p className="section-label mb-4">Why Navinta</p>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-5"
            style={{ textWrap: "balance" }}
          >
            Video at the speed
            <br />
            of your business.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Ship professional content every week — without a production team, without a learning curve.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {outcomes.map((outcome) => (
            <div
              key={outcome.title}
              className="outcome-card group rounded-2xl border bg-white p-8 transition-all duration-400 light-card-hover card-shine"
              style={{ borderColor: "rgba(0,0,0,0.07)" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-2xl ${outcome.bg} border ${outcome.border} flex items-center justify-center ${outcome.color}`}>
                  {outcome.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{outcome.label}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{outcome.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{outcome.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
