import { useRef, useEffect } from "react";
import { gsap } from "gsap";

const labels = [
  "Agencies",
  "Coaches",
  "Studios",
  "Freelancers",
  "Consultants",
  "Marketers",
  "Founders",
  "Educators",
];

export default function ProblemSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const totalWidth = track.scrollWidth / 2;

    tweenRef.current = gsap.to(track, {
      x: -totalWidth,
      duration: 20,
      ease: "none",
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x: number) => {
          return parseFloat(x as unknown as string) % totalWidth;
        }),
      },
    });

    const handleEnter = () => tweenRef.current?.timeScale(0.3);
    const handleLeave = () => tweenRef.current?.timeScale(1);
    track.addEventListener("mouseenter", handleEnter);
    track.addEventListener("mouseleave", handleLeave);

    return () => {
      tweenRef.current?.kill();
      track.removeEventListener("mouseenter", handleEnter);
      track.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const items = [...labels, ...labels];

  return (
    <section className="py-16 bg-white text-center overflow-hidden">
      <p className="text-[#111111] text-lg mb-10">
        Trusted by ambitious small teams everywhere.
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div ref={trackRef} className="flex gap-12 md:gap-16 whitespace-nowrap w-max">
          {items.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="text-sm font-semibold tracking-widest uppercase text-gray-400 select-none"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
