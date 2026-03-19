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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".cta-content > *", {
        y: 30, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,255,255,0.03), transparent 70%)",
      }} />

      <div className="nv-container text-center relative z-10 cta-content">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
          Start creating professional<br className="hidden md:block" /> video content today
        </h2>
        <p className="text-lg max-w-2xl mx-auto mb-12" style={{ color: "rgba(255,255,255,0.4)" }}>
          Join thousands of creators who use Navinta to produce consistent, high-quality video without a production team.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onGetStarted} className="nv-btn-primary px-8 py-3.5 text-base">
            {waitlistApproved ? "Get started free" : "Get early access"} &#8594;
          </button>
          <a href="/pricing" className="nv-btn-secondary px-7 py-3.5 text-base">
            View pricing
          </a>
        </div>
      </div>
    </section>
  );
}
