import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface FinalCTASectionProps {
  onGetStarted: () => void;
}

export default function FinalCTASection({ onGetStarted }: FinalCTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const statRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        scale: 0.85,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
      });

      gsap.from(btnRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.7,
        delay: 0.3,
        ease: "power3.out",
        scrollTrigger: { trigger: headingRef.current, start: "top 80%" },
      });

      statRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          delay: i * 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { value: "5K+", label: "Videos created" },
    { value: "3min", label: "Average time to export" },
    { value: "3", label: "Formats per video" },
  ];

  return (
    <section ref={sectionRef} className="bg-white">
      <div className="text-center">
        <div
          className="rounded-3xl mx-6 md:mx-12 py-32 px-6"
          style={{
            background:
              "radial-gradient(circle at 65% 75%, #fef9c3, transparent 50%), radial-gradient(circle at 35% 25%, #ede9fe, transparent 50%)",
          }}
        >
          <h2 ref={headingRef} className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-[#111111]">
            Create your content
            <br />
            plan now.
          </h2>
          <button
            ref={btnRef}
            onClick={onGetStarted}
            className="mt-8 bg-[#1a1a1a] text-white rounded-full px-8 py-4 font-medium text-base hover:opacity-80 transition-opacity"
          >
            Get Navinta AI →
          </button>
        </div>
      </div>

      <div className="py-20 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={stat.value} ref={(el) => { statRefs.current[i] = el; }}>
              <h3 className="text-5xl font-light mb-2">{stat.value}</h3>
              <p className="text-xl text-[#666666]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
