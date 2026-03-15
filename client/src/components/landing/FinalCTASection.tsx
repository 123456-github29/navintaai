import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface FinalCTASectionProps {
  onGetStarted: () => void;
  waitlistApproved?: boolean;
}

export default function FinalCTASection({ onGetStarted, waitlistApproved }: FinalCTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Dramatic scale-up reveal
      gsap.from(headingRef.current, {
        scale: 0.8,
        opacity: 0,
        y: 60,
        duration: 1.4,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 85%" },
      });

      gsap.from(btnRef.current, {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: 0.3,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 85%" },
      });

      gsap.from(lineRef.current, {
        scaleX: 0,
        duration: 1.5,
        ease: "power2.inOut",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });

      // Floating orb parallax
      gsap.to(orbRef.current, {
        yPercent: -20,
        xPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden" style={{ background: "#000000" }}>
      {/* Top divider */}
      <div
        ref={lineRef}
        className="w-full h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(168,85,247,0.3), transparent)",
          transformOrigin: "center",
        }}
      />

      <div className="relative py-44 px-6 text-center">
        {/* Gradient orb */}
        <div
          ref={orbRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        <div className="relative z-10">
          <h2
            ref={headingRef}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.03em] text-white leading-[0.92]"
          >
            Start creating
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              today.
            </span>
          </h2>

          <button
            ref={btnRef}
            onClick={onGetStarted}
            className="group mt-14 bg-white text-black rounded-full px-12 py-5 font-semibold text-base transition-all duration-500 hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:scale-[1.03] active:scale-[0.98]"
          >
            {waitlistApproved ? "Get Navinta AI free" : "Join the Waitlist"}
            <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </button>

          <p className="mt-8 text-sm text-white/25">
            {waitlistApproved ? "No credit card required. Free plan included." : "Limited spots. Get early access."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { value: "5K+", label: "Videos created" },
            { value: "3 min", label: "Average export time" },
            { value: "3", label: "Formats per video" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">{stat.value}</div>
              <div className="text-sm text-white/25 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
