import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface HeroSectionProps {
  onGetStarted: () => void;
  waitlistApproved?: boolean;
}

export default function HeroSection({ onGetStarted, waitlistApproved }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(badgeRef.current, { y: 16, opacity: 0, duration: 0.7 }, 0.1);
      tl.from(headlineRef.current, { y: 40, opacity: 0, duration: 0.9 }, 0.2);
      tl.from(subRef.current, { y: 30, opacity: 0, duration: 0.8 }, 0.4);
      tl.from(ctaRef.current, { y: 24, opacity: 0, duration: 0.7 }, 0.55);
      tl.from(mockupRef.current, { y: 60, opacity: 0, duration: 1.0 }, 0.6);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden pt-36 pb-24 md:pt-44 md:pb-32"
      style={{ background: "#fff" }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
        }}
      />

      <div className="relative z-10 nv-container text-center">
        {/* Status badge */}
        <div ref={badgeRef} className="nv-badge inline-flex items-center gap-2 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Now in private beta</span>
        </div>

        {/* Headline */}
        <h1
          ref={headlineRef}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[4.75rem] font-bold tracking-[-0.04em] leading-[1.05] max-w-4xl mx-auto"
          style={{ color: "#202123" }}
        >
          Video content creation,{" "}
          <span style={{ color: "#0fa37e" }}>reimagined with AI</span>
        </h1>

        {/* Subheading */}
        <p
          ref={subRef}
          className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "#6e6e80" }}
        >
          Navinta plans your shots, guides your recording, and edits your video automatically.
          Professional content in minutes, not days.
        </p>

        {/* CTAs */}
        <div ref={ctaRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="nv-btn-dark px-8 py-3.5 text-base"
          >
            {waitlistApproved ? "Start creating free" : "Get early access"} <span className="ml-1">&#8594;</span>
          </button>
          <a
            href="#how-it-works"
            className="nv-btn-outline px-7 py-3.5 text-base"
          >
            See how it works
          </a>
        </div>

        {/* Product Mockup */}
        <div
          ref={mockupRef}
          className="mt-16 md:mt-20 w-full max-w-5xl mx-auto"
        >
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: "#fff",
              border: "1px solid #e5e5e5",
              boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#e5e5e5", background: "#fafafa" }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-white border text-xs font-mono" style={{ borderColor: "#e5e5e5", color: "#acacbe" }}>
                  navinta.ai/studio
                </div>
              </div>
            </div>

            {/* App preview */}
            <div className="p-5 md:p-7 min-h-[320px] md:min-h-[400px]" style={{ background: "#fafafa" }}>
              <div className="flex gap-5">
                {/* Sidebar preview */}
                <div className="hidden md:flex flex-col gap-1.5 w-44 shrink-0">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: "rgba(15,163,126,0.08)", border: "1px solid rgba(15,163,126,0.15)" }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(15,163,126,0.15)" }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#0fa37e"/>
                        <rect x="9" y="2" width="5" height="5" rx="1.5" fill="#0fa37e" opacity="0.5"/>
                        <rect x="2" y="9" width="5" height="5" rx="1.5" fill="#0fa37e" opacity="0.5"/>
                        <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#0fa37e" opacity="0.3"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#0fa37e" }}>Dashboard</span>
                  </div>
                  {["Content Plan", "Record", "Library", "Brand Kit"].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs" style={{ color: "#acacbe" }}>
                      <div className="w-5 h-5 rounded bg-gray-200/60" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 space-y-4 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#202123" }}>Your Studio</div>
                      <div className="text-xs mt-0.5" style={{ color: "#acacbe" }}>4-week content calendar</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: "rgba(15,163,126,0.08)", color: "#0fa37e", border: "1px solid rgba(15,163,126,0.15)" }}>
                      + New Plan
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: "Total", value: "28", color: "#202123" },
                      { label: "Done", value: "12", color: "#0fa37e" },
                      { label: "Active", value: "8", color: "#d97706" },
                      { label: "Planned", value: "8", color: "#6366f1" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-white border p-3" style={{ borderColor: "#e5e5e5" }}>
                        <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "#acacbe" }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { title: "Brand Launch Reel", status: "Recording", bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
                      { title: "Product Demo #3", status: "Complete", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
                      { title: "Client Testimonial", status: "Planned", bg: "#f0fdf4", color: "#0fa37e", border: "#bbf7d0" },
                      { title: "Weekly Update", status: "Editing", bg: "#f9fafb", color: "#6e6e80", border: "#e5e5e5" },
                    ].map((card, idx) => (
                      <div key={card.title} className="rounded-lg bg-white border p-3.5 space-y-2.5" style={{ borderColor: "#e5e5e5" }}>
                        <div className="flex justify-between items-start gap-1.5">
                          <span className="text-xs font-medium leading-tight" style={{ color: "#353740" }}>{card.title}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0" style={{ background: card.bg, color: card.color, borderColor: card.border }}>{card.status}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "#f3f3f3" }}>
                          <div className="h-full rounded-full" style={{ width: `${[72, 100, 35, 58][idx]}%`, background: "#0fa37e" }} />
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
