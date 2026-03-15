import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const obj = { val: 0 };
          gsap.to(obj, {
            val: end,
            duration: 2,
            ease: "power2.out",
            onUpdate: () => setValue(Math.round(obj.val)),
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

const logos = [
  "Freelancers",
  "Agencies",
  "Coaches",
  "Studios",
  "Consultants",
  "Marketers",
  "Founders",
  "Educators",
  "Startups",
  "Creators",
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const totalWidth = track.scrollWidth / 2;
    const tween = gsap.to(track, {
      x: -totalWidth,
      duration: 25,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x: number) => parseFloat(x as unknown as string) % totalWidth),
      },
    });

    const ctx = gsap.context(() => {
      gsap.from(metricsRef.current, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }, sectionRef);

    return () => {
      tween.kill();
      ctx.revert();
    };
  }, []);

  const items = [...logos, ...logos];

  const metrics = [
    { value: 5000, suffix: "+", label: "Videos created" },
    { value: 3, suffix: "min", label: "Avg. time to export" },
    { value: 94, suffix: "%", label: "Creators ship weekly" },
    { value: 10, suffix: "x", label: "Faster than traditional" },
  ];

  return (
    <section ref={sectionRef} className="py-20 relative overflow-hidden" style={{ background: "#0a0a0a" }}>
      {/* Metrics */}
      <div ref={metricsRef} className="max-w-6xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                <AnimatedCounter end={metric.value} suffix={metric.suffix} />
              </div>
              <div className="text-sm text-white/40 mt-2 font-medium">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 mb-16">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Logo strip */}
      <div className="text-center mb-10">
        <p className="text-sm text-white/30 font-medium uppercase tracking-[0.2em]">
          Trusted by ambitious teams everywhere
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div ref={trackRef} className="flex gap-16 whitespace-nowrap w-max">
          {items.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="text-sm font-semibold tracking-[0.15em] uppercase text-white/15 select-none hover:text-white/30 transition-colors duration-500"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
