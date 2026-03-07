import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      gsap.from(captionRef.current, {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.25,
        ease: "power3.out",
      });

      gsap.from(ctaRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.9,
        delay: 0.45,
        ease: "power3.out",
      });

      gsap.to(bgRef.current, {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white overflow-hidden">
      <div className="mx-6 md:mx-12 mt-6 min-h-[72vh] rounded-3xl flex items-center justify-center relative overflow-hidden">
        <div
          ref={bgRef}
          className="absolute inset-[-20%] z-0"
          style={{
            background:
              "radial-gradient(ellipse at 25% 35%, #ddd6fe 0%, transparent 50%), radial-gradient(ellipse at 75% 65%, #fecdd3 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, #cffafe 0%, transparent 55%), #faf5ff",
          }}
        />
        <div className="text-center px-6 relative z-10 max-w-2xl mx-auto">
          <h1 ref={titleRef} className="text-6xl md:text-7xl font-semibold tracking-tighter text-[#111111]" style={{ textWrap: "balance" }}>
            Navinta AI
          </h1>
          <p ref={captionRef} className="mt-5 text-lg md:text-xl text-[#444444] max-w-lg mx-auto leading-relaxed" style={{ textWrap: "pretty" }}>
            Promote yourself with agency-quality video — without the agency price tag.
          </p>
          <div ref={ctaRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 bg-[#111111] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
            >
              Get Started Free
            </button>
            <a
              href="#pricing"
              className="px-6 py-3.5 text-sm font-medium text-[#444444] hover:text-[#111111] transition-colors"
            >
              See pricing →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
