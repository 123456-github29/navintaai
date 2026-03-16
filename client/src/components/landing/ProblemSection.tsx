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
            duration: 2.2,
            ease: "power3.out",
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
      duration: 28,
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

      // Stagger the individual metric items
      gsap.from(".metric-item", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: metricsRef.current, start: "top 85%" },
      });
    }, sectionRef);

    return () => {
      tween.kill();
      ctx.revert();
    };
  }, []);

  const items = [...logos, ...logos];

  const metrics = [
    { value: 5000, suffix: "+", label: "Videos created", icon: "▲" },
    { value: 3, suffix: "min", label: "Avg. time to export", icon: "◎" },
    { value: 94, suffix: "%", label: "Creators ship weekly", icon: "✦" },
    { value: 10, suffix: "x", label: "Faster than traditional", icon: "→" },
  ];

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden" style={{ background: "#FFFFFF" }}>
      {/* Top divider */}
      <div className="hr-fade absolute top-0 left-0 right-0" />

      {/* Metrics */}
      <div ref={metricsRef} className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="metric-item metric-card text-center group">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                <AnimatedCounter end={metric.value} suffix={metric.suffix} />
              </div>
              <div className="text-sm text-gray-500 mt-2 font-medium">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="hr-fade" />
      </div>

      {/* Label */}
      <div className="text-center mb-10">
        <p className="section-label">
          Trusted by ambitious teams everywhere
        </p>
      </div>

      {/* Marquee strip */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none z-10" style={{ background: "linear-gradient(to right, #FFFFFF, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none z-10" style={{ background: "linear-gradient(to left, #FFFFFF, transparent)" }} />
        <div ref={trackRef} className="flex gap-14 whitespace-nowrap w-max">
          {items.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="text-sm font-semibold tracking-[0.14em] uppercase text-gray-300 select-none hover:text-gray-500 transition-colors duration-400"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
