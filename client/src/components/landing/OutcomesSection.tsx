import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function OutcomesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 max-w-6xl mx-auto">
      <div ref={headerRef} className="text-center">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-[#111111]">
          Video at the speed of your business.
        </h2>
        <p className="text-[#666666] max-w-lg mt-4 mx-auto">
          Make a steady stream of professional videos that look native to TikTok, Instagram, and YouTube — without a production team.
        </p>
      </div>
    </section>
  );
}
