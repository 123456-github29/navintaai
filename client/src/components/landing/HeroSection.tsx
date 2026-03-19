import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";

interface HeroSectionProps {
  onGetStarted: () => void;
  waitlistApproved?: boolean;
}

const words = ["reimagined", "accelerated", "simplified", "automated"];

export default function HeroSection({ onGetStarted, waitlistApproved }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const wordRef = useRef<HTMLSpanElement>(null);

  // Rotating word animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (wordRef.current) {
        gsap.to(wordRef.current, {
          y: -10,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setWordIdx((prev) => (prev + 1) % words.length);
            gsap.fromTo(wordRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
          },
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(badgeRef.current, { y: 20, opacity: 0, duration: 0.8 }, 0.2);
      tl.from(headlineRef.current, { y: 50, opacity: 0, duration: 1.0 }, 0.3);
      tl.from(subRef.current, { y: 40, opacity: 0, duration: 0.9 }, 0.5);
      tl.from(ctaRef.current, { y: 30, opacity: 0, duration: 0.8 }, 0.65);
      tl.from(mockupRef.current, { y: 80, opacity: 0, scale: 0.97, duration: 1.2, ease: "power2.out" }, 0.7);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-40 pb-28 md:pt-48 md:pb-36" style={{ background: "#0d0d0d" }}>
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.04), transparent 60%)",
      }} />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 70%)",
      }} />

      <div className="relative z-10 nv-container text-center">
        {/* Badge */}
        <div ref={badgeRef} className="nv-badge inline-flex items-center gap-2 mb-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span>Now in private beta</span>
        </div>

        {/* Headline */}
        <h1 ref={headlineRef} className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold tracking-[-0.04em] leading-[1.05] max-w-4xl mx-auto text-white">
          Video content,{" "}
          <span ref={wordRef} className="inline-block nv-gradient-text">
            {words[wordIdx]}
          </span>
        </h1>

        {/* Sub */}
        <p ref={subRef} className="mt-7 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Navinta plans your content, guides your recording, and edits your video automatically.
          Professional results in minutes, not days.
        </p>

        {/* CTAs */}
        <div ref={ctaRef} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onGetStarted} className="nv-btn-primary px-8 py-3.5 text-[0.9375rem]">
            {waitlistApproved ? "Start creating" : "Get early access"} <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">&#8594;</span>
          </button>
          <a href="#how-it-works" className="nv-btn-secondary px-7 py-3.5 text-[0.9375rem]">
            See how it works
          </a>
        </div>

        {/* Mockup */}
        <div ref={mockupRef} className="mt-20 md:mt-24 w-full max-w-5xl mx-auto">
          <div className="relative rounded-xl overflow-hidden nv-lift" style={{
            background: "#161616",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#111" }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md text-xs font-mono" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                  navinta.ai/studio
                </div>
              </div>
            </div>

            {/* App preview */}
            <div className="p-5 md:p-7 min-h-[320px] md:min-h-[400px]" style={{ background: "#0d0d0d" }}>
              <div className="flex gap-5">
                {/* Sidebar */}
                <div className="hidden md:flex flex-col gap-1.5 w-44 shrink-0">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" fill="#fff"/><rect x="9" y="2" width="5" height="5" rx="1.5" fill="#fff" opacity="0.5"/><rect x="2" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity="0.5"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity="0.3"/></svg>
                    </div>
                    <span className="text-xs font-semibold text-white">Dashboard</span>
                  </div>
                  {["Content Plan", "Record", "Library", "Brand Kit"].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <div className="w-5 h-5 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Main */}
                <div className="flex-1 space-y-4 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">Your Studio</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>4-week content calendar</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      + New Plan
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: "Total", value: "28", opacity: "1" },
                      { label: "Done", value: "12", opacity: "0.7" },
                      { label: "Active", value: "8", opacity: "0.5" },
                      { label: "Planned", value: "8", opacity: "0.4" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-lg font-bold text-white" style={{ opacity: s.opacity }}>{s.value}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { title: "Brand Launch Reel", status: "Recording", pct: 72 },
                      { title: "Product Demo #3", status: "Complete", pct: 100 },
                      { title: "Client Testimonial", status: "Planned", pct: 35 },
                      { title: "Weekly Update", status: "Editing", pct: 58 },
                    ].map((card) => (
                      <div key={card.title} className="rounded-lg p-3.5 space-y-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex justify-between items-start gap-1.5">
                          <span className="text-xs font-medium text-white/70">{card.title}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{card.status}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full bg-white" style={{ width: `${card.pct}%`, opacity: 0.6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
