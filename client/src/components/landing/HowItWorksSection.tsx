import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { number: "01", title: "Onboard your brand", description: "Tell us about your business, audience, and goals. Our AI builds a personalized content strategy.", accent: "#7c5cfc" },
  { number: "02", title: "Get your content plan", description: "Receive a 4-week calendar of video ideas with scripts, shot lists, and talking points.", accent: "#00d4ff" },
  { number: "03", title: "Record with direction", description: "Director Mode shows your script as a teleprompter with shot-by-shot guidance.", accent: "#ff6b9d" },
  { number: "04", title: "AI edits and exports", description: "Your footage is automatically cut, captioned, and polished. Export with one click.", accent: "#7c5cfc" },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // Heading
      gsap.from(".hiw-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      // Steps slide in from left with scale
      gsap.from(".step-card", {
        x: -40, opacity: 0, scale: 0.95, duration: 0.9, stagger: 0.18, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });

      // Animate the vertical line drawing
      gsap.from(".step-line-glow", {
        scaleY: 0, duration: 1.5, ease: "power2.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="nv-section relative" style={{ background: "#111111" }}>
      {/* Ambient orb */}
      <div className="nv-orb nv-orb-violet" style={{ width: 300, height: 300, top: "30%", left: "10%" }} />

      <div className="nv-container relative z-10">
        <div className="hiw-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(255,107,157,0.6)" }}>How it works</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
            From idea to published<br className="hidden md:block" /> in four steps
          </h2>
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* Vertical line — now with gradient color */}
          <div className="step-line-glow absolute left-[23px] top-0 bottom-0 w-px origin-top" style={{
            background: "linear-gradient(180deg, rgba(124,92,252,0.4), rgba(0,212,255,0.3), rgba(255,107,157,0.3), rgba(124,92,252,0.2))",
          }} />

          <div className="space-y-10">
            {steps.map((step, i) => (
              <div key={i} className="step-card flex gap-6 group">
                {/* Number with accent color */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="nv-step-number w-12 h-12 rounded-full flex items-center justify-center text-xs font-mono font-bold" style={{
                    background: "#1a1a1a",
                    border: `1px solid rgba(255,255,255,0.12)`,
                    color: "rgba(255,255,255,0.7)",
                  }}>
                    {step.number}
                  </div>
                  {/* Glow ring behind number */}
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
                    background: `radial-gradient(circle, ${step.accent}20, transparent 70%)`,
                    transform: "scale(2)",
                    zIndex: -1,
                  }} />
                </div>

                {/* Content */}
                <div className="pt-2 pb-2">
                  <h3 className="text-xl font-semibold text-white mb-2 transition-colors duration-300">{step.title}</h3>
                  <p className="text-sm leading-relaxed transition-colors duration-300" style={{ color: "rgba(255,255,255,0.4)" }}>{step.description}</p>
                  {/* Accent underline on hover */}
                  <div className="mt-3 h-px w-0 group-hover:w-16 transition-all duration-700 ease-out" style={{
                    background: step.accent,
                    opacity: 0.4,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
