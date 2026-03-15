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
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
      });

      gsap.from(".outcome-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: cardsRef.current, start: "top 80%" },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const outcomes = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      title: "10x faster production",
      description: "What used to take days now takes minutes. From idea to polished video in one sitting.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      title: "Platform-native output",
      description: "Every video is formatted for TikTok, Instagram, and YouTube — so it looks native, not repurposed.",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: "Agency-grade quality",
      description: "Smart cuts, B-roll, captions, and color grading — the same techniques agencies charge thousands for.",
    },
  ];

  return (
    <section ref={sectionRef} className="py-32 px-6 relative overflow-hidden" style={{ background: "#000000" }}>
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.3) 50%, transparent 100%)" }}
        />
        <div
          className="absolute bottom-1/3 right-0 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div ref={headerRef} className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-5" style={{ textWrap: "balance" }}>
            Video at the speed
            <br />
            of your business.
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            Ship professional content every week — without a production team, without a learning curve.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {outcomes.map((outcome) => (
            <div
              key={outcome.title}
              className="outcome-card group rounded-2xl bg-white/[0.02] p-8 transition-all duration-500 hover:white/15 hover:bg-white/[0.04]"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)" }}
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 transition-colors duration-500 group-hover:bg-indigo-500/15">
                {outcome.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">{outcome.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{outcome.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
