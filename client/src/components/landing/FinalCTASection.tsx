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
        y: 40, opacity: 0, scale: 0.97, duration: 0.9, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
      });

      // Animate orbs
      gsap.from(".cta-orb", {
        scale: 0, opacity: 0, duration: 2, stagger: 0.3, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section relative overflow-hidden" style={{ background: "#0d0d0d" }}>
      {/* Multiple color orbs for vibrant glow */}
      <div className="cta-orb nv-orb nv-orb-violet" style={{ width: 500, height: 500, top: "10%", left: "30%" }} />
      <div className="cta-orb nv-orb nv-orb-cyan" style={{ width: 350, height: 350, bottom: "20%", right: "20%", opacity: 0.05 }} />
      <div className="cta-orb nv-orb nv-orb-rose" style={{ width: 300, height: 300, top: "40%", left: "10%", opacity: 0.03 }} />

      {/* Gradient radial glow with color */}
      <div className="absolute inset-0 pointer-events-none nv-cta-glow-bg" />

      {/* Dot grid background */}
      <div className="absolute inset-0 pointer-events-none nv-dot-grid" style={{
        maskImage: "radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)",
      }} />

      <div className="nv-container text-center relative z-10 cta-content">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
          Start creating professional<br className="hidden md:block" /> video content today
        </h2>
        <p className="text-lg max-w-2xl mx-auto mb-12" style={{ color: "rgba(255,255,255,0.45)" }}>
          Join thousands of creators who use Navinta to produce consistent, high-quality video without a production team.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onGetStarted} className="nv-btn-primary nv-btn-glow px-8 py-3.5 text-base group">
            {waitlistApproved ? "Get started free" : "Get early access"}{" "}
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">&#8594;</span>
          </button>
          <a href="/pricing" className="nv-btn-secondary px-7 py-3.5 text-base nv-animated-underline">
            View pricing
          </a>
        </div>
      </div>
    </section>
  );
}
