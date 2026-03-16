import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onGetStarted: () => void;
  waitlistApproved?: boolean;
}

export default function HeroSection({ onGetStarted, waitlistApproved }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const glowLineRef = useRef<HTMLDivElement>(null);
  const highlightBgRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Background elements
      tl.from(gridRef.current, { opacity: 0, duration: 2 }, 0);
      tl.from(orb1Ref.current, { opacity: 0, scale: 0.4, duration: 2.8 }, 0);
      tl.from(orb2Ref.current, { opacity: 0, scale: 0.4, duration: 2.8 }, 0.2);
      tl.from(orb3Ref.current, { opacity: 0, scale: 0.4, duration: 2.8 }, 0.4);

      // Content reveals
      tl.from(badgeRef.current, { y: 24, opacity: 0, duration: 0.9 }, 0.3);
      tl.from(glowLineRef.current, { scaleX: 0, opacity: 0, duration: 1.4, ease: "power2.inOut" }, 0.5);
      tl.from(headlineRef.current, { y: 70, opacity: 0, duration: 1.3 }, 0.45);
      tl.from(subRef.current, { y: 45, opacity: 0, duration: 1.0 }, 0.72);
      tl.from(ctaRef.current, { y: 35, opacity: 0, duration: 0.9 }, 0.9);

      // Highlight grows in behind emphasized text
      tl.from(highlightBgRef.current, {
        scaleX: 0,
        duration: 1.1,
        ease: "power2.inOut",
        transformOrigin: "left center",
      }, 1.0);

      // Mockup cinematic entrance
      tl.from(mockupRef.current, {
        y: 180,
        opacity: 0,
        rotateX: 22,
        scale: 0.82,
        duration: 1.6,
        ease: "power3.out",
      }, 0.75);

      // ---- Scroll-triggered parallax ----

      // Text fades as you scroll away
      gsap.to(headlineRef.current, {
        y: -55,
        opacity: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "28% top",
          end: "78% top",
          scrub: 1,
        },
      });

      gsap.to(subRef.current, {
        y: -38,
        opacity: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "28% top",
          end: "73% top",
          scrub: 1,
        },
      });

      gsap.to(ctaRef.current, {
        y: -28,
        opacity: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "28% top",
          end: "68% top",
          scrub: 1,
        },
      });

      // Mockup grows Apple-AirPods style on scroll
      gsap.to(mockupRef.current, {
        rotateX: 0,
        y: -70,
        scale: 1.04,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      // Orb parallax at different speeds
      gsap.to(orb1Ref.current, {
        yPercent: 45,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(orb2Ref.current, {
        yPercent: -25,
        xPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(orb3Ref.current, {
        yPercent: 18,
        xPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Grid fades out mid-scroll
      gsap.to(gridRef.current, {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "45% top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[120vh] overflow-hidden flex flex-col items-center pt-32 pb-20"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F3F4FF 55%, #EBEdFF 100%)" }}
    >
      {/* Dot grid background */}
      <div
        ref={gridRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(79,70,229,0.07) 1.5px, transparent 1.5px)`,
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at 50% 20%, black 10%, transparent 62%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 20%, black 10%, transparent 62%)",
        }}
      />

      {/* Gradient orbs - light theme */}
      <div
        ref={orb1Ref}
        className="absolute top-[2%] left-[8%] w-[680px] h-[680px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 62%)",
          filter: "blur(72px)",
        }}
      />
      <div
        ref={orb2Ref}
        className="absolute top-[12%] right-[4%] w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 62%)",
          filter: "blur(60px)",
        }}
      />
      <div
        ref={orb3Ref}
        className="absolute bottom-[8%] left-[28%] w-[580px] h-[580px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 62%)",
          filter: "blur(68px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">

        {/* Status badge */}
        <div
          ref={badgeRef}
          className="badge-light inline-flex items-center gap-2.5 mb-10"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-gray-600">Now in private beta</span>
          <span className="text-gray-300 text-xs">|</span>
          <span className="text-indigo-600 font-semibold">5,000+ videos created</span>
        </div>

        {/* Accent line */}
        <div
          ref={glowLineRef}
          className="w-48 h-px mx-auto mb-10"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.45), rgba(139,92,246,0.35), transparent)",
            transformOrigin: "center",
          }}
        />

        {/* Headline */}
        <h1
          ref={headlineRef}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-bold tracking-[-0.035em] text-gray-900 leading-[0.92]"
          style={{ textWrap: "balance" }}
        >
          Create viral videos.
          <br />
          <span className="relative inline-block">
            {/* Marker highlight that draws in from left */}
            <span
              ref={highlightBgRef}
              className="absolute rounded-xl pointer-events-none"
              style={{
                inset: "-6px -12px",
                background: "linear-gradient(120deg, rgba(99,102,241,0.13) 0%, rgba(139,92,246,0.10) 100%)",
                transformOrigin: "left center",
                zIndex: 0,
              }}
            />
            <span className="relative text-indigo-600" style={{ zIndex: 1 }}>
              Without a team.
            </span>
          </span>
        </h1>

        {/* Subheading */}
        <p
          ref={subRef}
          className="mt-8 text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed tracking-[-0.01em]"
        >
          AI that plans your shots, guides your recording, and edits your video.
          <br className="hidden md:block" />
          Agency-quality content in minutes, not days.
        </p>

        {/* CTAs */}
        <div ref={ctaRef} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="group btn-indigo relative px-10 py-4 rounded-full text-[0.95rem] font-semibold"
          >
            {waitlistApproved ? "Start creating free" : "Get Early Access"}
            <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </button>
          <a
            href="#showcase"
            className="btn-outline-light px-7 py-4 text-sm font-medium rounded-full"
          >
            See how it works
          </a>
        </div>
      </div>

      {/* 3D Product Mockup */}
      <div
        ref={mockupRef}
        className="relative z-10 mt-20 w-full max-w-5xl mx-auto px-6"
        style={{
          perspective: "1400px",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            transform: "rotateX(8deg)",
            transformOrigin: "center bottom",
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.02), 0 20px 60px rgba(0,0,0,0.07), 0 40px 80px rgba(99,102,241,0.05), 0 0 0 1px rgba(0,0,0,0.03)",
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-400 font-mono shadow-sm">
                navinta.ai/studio
              </div>
            </div>
          </div>

          {/* App UI - light themed */}
          <div className="p-5 md:p-7 min-h-[320px] md:min-h-[400px] bg-gray-50/40">
            <div className="flex gap-5">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col gap-1 w-44 shrink-0">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100/60">
                  <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#6366f1"/>
                      <rect x="9" y="2" width="5" height="5" rx="1.5" fill="#6366f1" opacity="0.5"/>
                      <rect x="2" y="9" width="5" height="5" rx="1.5" fill="#6366f1" opacity="0.5"/>
                      <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#6366f1" opacity="0.3"/>
                    </svg>
                  </div>
                  <span className="text-xs text-indigo-700 font-semibold">Dashboard</span>
                </div>
                {["Content Plan", "Record", "Library", "Brand Kit"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 hover:bg-white transition-all duration-150">
                    <div className="w-5 h-5 rounded-lg bg-gray-200/70" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 space-y-4 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Your Studio</div>
                    <div className="text-xs text-gray-400 mt-0.5">4-week content calendar</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-600 font-semibold whitespace-nowrap">
                    + New Plan
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: "Total", value: "28", color: "text-gray-800" },
                    { label: "Done", value: "12", color: "text-emerald-600" },
                    { label: "Active", value: "8", color: "text-amber-600" },
                    { label: "Planned", value: "8", color: "text-indigo-600" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white border border-gray-100 p-3 shadow-sm">
                      <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Content cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { title: "Brand Launch Reel", status: "Recording", sc: "bg-amber-50 text-amber-700 border-amber-200" },
                    { title: "Product Demo #3", status: "Complete", sc: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { title: "Client Testimonial", status: "Planned", sc: "bg-indigo-50 text-indigo-700 border-indigo-200" },
                    { title: "Weekly Update", status: "Editing", sc: "bg-gray-100 text-gray-600 border-gray-200" },
                  ].map((card, idx) => (
                    <div key={card.title} className="rounded-xl bg-white border border-gray-100 p-3.5 shadow-sm space-y-2.5">
                      <div className="flex justify-between items-start gap-1.5">
                        <span className="text-xs font-medium text-gray-700 leading-tight">{card.title}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${card.sc}`}>{card.status}</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                          style={{ width: `${[72, 100, 35, 58][idx]}%` }}
                        />
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((s) => (
                          <div key={s} className="flex-1 h-7 rounded-lg bg-gray-50 border border-gray-100" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent" />
        </div>

        {/* Shadow glow underneath mockup */}
        <div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-40 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400">
        <span className="text-[10px] font-medium tracking-[0.3em] uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-gray-400/40 to-transparent" />
      </div>
    </section>
  );
}
