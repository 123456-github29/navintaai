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
  const sublineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Dramatic scale-up reveal
      gsap.from(headingRef.current, {
        scale: 0.85,
        opacity: 0,
        y: 50,
        duration: 1.3,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 85%" },
      });

      gsap.from(btnRef.current, {
        y: 35,
        opacity: 0,
        duration: 1,
        delay: 0.25,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 85%" },
      });

      gsap.from(sublineRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.45,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 85%" },
      });

      gsap.from(lineRef.current, {
        scaleX: 0,
        duration: 1.5,
        ease: "power2.inOut",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });

      // Orb parallax
      gsap.to(orbRef.current, {
        yPercent: -18,
        xPercent: 8,
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
    <section ref={sectionRef} className="relative overflow-hidden" style={{ background: "#0D1117" }}>
      {/* Top accent line */}
      <div
        ref={lineRef}
        className="w-full h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(139,92,246,0.5), transparent)",
          transformOrigin: "center",
        }}
      />

      {/* Gradient orb */}
      <div
        ref={orbRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.05) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative py-44 px-6 text-center z-10">
        <p className="text-indigo-400 text-sm font-semibold tracking-wider uppercase mb-6">
          Get started today
        </p>

        <h2
          ref={headingRef}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.03em] text-white leading-[0.92]"
        >
          Start creating
          <br />
          <span className="text-indigo-400">
            today.
          </span>
        </h2>

        <button
          ref={btnRef}
          onClick={onGetStarted}
          className="group mt-14 bg-white text-gray-900 rounded-full px-12 py-5 font-bold text-base transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,255,255,0.15)] hover:scale-[1.03] active:scale-[0.98]"
        >
          {waitlistApproved ? "Get Navinta AI free" : "Join the Waitlist"}
          <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
        </button>

        <div ref={sublineRef}>
          <p className="mt-6 text-sm text-white/30">
            {waitlistApproved ? "No credit card required. Free plan included." : "Limited spots. Get early access."}
          </p>

          {/* Trust signals */}
          <div className="mt-10 flex items-center justify-center gap-8 text-xs text-white/20">
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500/60">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Secure & private</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500/60">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500/60">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12l2 2 4-4"/>
              </svg>
              <span>No spam, ever</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="relative z-10 py-16 px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { value: "5K+", label: "Videos created" },
            { value: "3 min", label: "Average export time" },
            { value: "3", label: "Formats per video" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">{stat.value}</div>
              <div className="text-sm text-white/30 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
