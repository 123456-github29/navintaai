import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleLearnMore = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        x: -60,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
      });

      gsap.from(cardRef.current, {
        x: 60,
        opacity: 0,
        duration: 0.9,
        delay: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
      });

      gsap.to(sectionRef.current, {
        backgroundPosition: "60% 30%",
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
    <section
      ref={sectionRef}
      id="how-it-works"
      className="rounded-3xl mx-6 md:mx-12 py-24 px-12"
      style={{
        background: "radial-gradient(circle at 40% 50%, #ccfbf1, transparent 60%), radial-gradient(circle at 80% 30%, #e0f2fe, transparent 50%)",
        backgroundSize: "120% 120%",
        backgroundPosition: "40% 50%",
      }}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        <h2 ref={headingRef} className="text-4xl md:text-5xl font-medium tracking-tight text-[#111111] max-w-md">
          Professional results, powered by AI.
        </h2>

        <div ref={cardRef} className="bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <p className="text-[#666666] leading-relaxed">
            Navinta AI understands pacing, hooks, and audience retention. It builds shot-by-shot plans tuned for social platforms — so every video feels native, not forced.
          </p>
          <button
            onClick={handleLearnMore}
            className="bg-[#1a1a1a] text-white rounded-full px-6 py-3 inline-block mt-6 font-medium text-sm transition-opacity hover:opacity-90"
          >
            Learn how it works →
          </button>
        </div>
      </div>
    </section>
  );
}
