import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      // Hero entrance timeline
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(gridRef.current, { opacity: 0, duration: 1.5 }, 0);
      tl.from(orb1Ref.current, { opacity: 0, scale: 0.5, duration: 1.8 }, 0.2);
      tl.from(orb2Ref.current, { opacity: 0, scale: 0.5, duration: 1.8 }, 0.4);
      tl.from(badgeRef.current, { y: 20, opacity: 0, duration: 0.8 }, 0.3);
      tl.from(headlineRef.current, { y: 60, opacity: 0, duration: 1.2 }, 0.4);
      tl.from(subRef.current, { y: 40, opacity: 0, duration: 1 }, 0.7);
      tl.from(ctaRef.current, { y: 30, opacity: 0, duration: 0.9 }, 0.9);
      tl.from(mockupRef.current, {
        y: 120,
        opacity: 0,
        rotateX: 25,
        scale: 0.85,
        duration: 1.4,
        ease: "power3.out",
      }, 0.6);

      // Scroll-triggered 3D perspective on mockup
      gsap.to(mockupRef.current, {
        rotateX: 0,
        y: -40,
        scale: 1.02,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
        },
      });

      // Parallax orbs
      gsap.to(orb1Ref.current, {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(orb2Ref.current, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Grid fade on scroll
      gsap.to(gridRef.current, {
        opacity: 0.02,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "center center",
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
      className="relative min-h-screen overflow-hidden flex flex-col items-center pt-32 pb-20"
      style={{ background: "linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #111111 100%)" }}
    >
      {/* Animated grid background */}
      <div
        ref={gridRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
        }}
      />

      {/* Gradient orbs */}
      <div
        ref={orb1Ref}
        className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        ref={orb2Ref}
        className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* YC-style badge */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-white/70 font-medium">Now in public beta</span>
          <span className="text-xs text-white/40">|</span>
          <span className="text-sm text-emerald-400 font-medium">5,000+ videos created</span>
        </div>

        <h1
          ref={headlineRef}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[0.95]"
          style={{ textWrap: "balance" }}
        >
          Agency-quality video.
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Zero production team.
          </span>
        </h1>

        <p
          ref={subRef}
          className="mt-6 text-lg md:text-xl text-white/50 max-w-xl mx-auto leading-relaxed"
        >
          AI that plans your shots, guides your recording, and edits your video — all in minutes, not days.
        </p>

        <div ref={ctaRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="group relative px-8 py-4 bg-white text-black rounded-full text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Start creating free
            <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
          <a
            href="#showcase"
            className="px-6 py-4 text-sm font-medium text-white/60 hover:text-white transition-colors border border-white/10 rounded-full hover:border-white/20"
          >
            Watch it work
          </a>
        </div>
      </div>

      {/* 3D Product Mockup */}
      <div
        ref={mockupRef}
        className="relative z-10 mt-16 w-full max-w-5xl mx-auto px-6"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{
            transform: "rotateX(8deg)",
            transformOrigin: "center bottom",
            background: "linear-gradient(180deg, #161616 0%, #0d0d0d 100%)",
          }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#1a1a1a]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-white/30 font-mono">
                navinta.ai/studio
              </div>
            </div>
          </div>

          {/* Product UI mockup */}
          <div className="p-6 md:p-8 min-h-[320px] md:min-h-[420px]">
            {/* Simulated UI */}
            <div className="flex gap-6">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col gap-3 w-48 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <div className="w-5 h-5 rounded bg-indigo-500/30 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="#818cf8"/><rect x="9" y="2" width="5" height="5" rx="1" fill="#818cf8" opacity="0.5"/><rect x="2" y="9" width="5" height="5" rx="1" fill="#818cf8" opacity="0.5"/><rect x="9" y="9" width="5" height="5" rx="1" fill="#818cf8" opacity="0.3"/></svg>
                  </div>
                  <span className="text-xs text-white/80 font-medium">Dashboard</span>
                </div>
                {["Content Plan", "Record", "Library", "Brand Kit"].map((item, i) => (
                  <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/30 hover:text-white/50 transition-colors">
                    <div className="w-5 h-5 rounded bg-white/5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white/90">Your Studio</div>
                    <div className="text-xs text-white/30 mt-0.5">4-week content calendar</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-xs text-indigo-400 font-medium">
                    + New Plan
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: "28", color: "text-white/80" },
                    { label: "Done", value: "12", color: "text-emerald-400" },
                    { label: "Active", value: "8", color: "text-amber-400" },
                    { label: "Planned", value: "8", color: "text-indigo-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                      <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Content cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "Brand Launch Reel", status: "Recording", statusColor: "bg-amber-500/20 text-amber-400" },
                    { title: "Product Demo #3", status: "Complete", statusColor: "bg-emerald-500/20 text-emerald-400" },
                    { title: "Client Testimonial", status: "Planned", statusColor: "bg-indigo-500/20 text-indigo-400" },
                    { title: "Weekly Update", status: "Editing", statusColor: "bg-white/10 text-white/50" },
                  ].map((card) => (
                    <div key={card.title} className="rounded-xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-medium text-white/70">{card.title}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${card.statusColor}`}>{card.status}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${Math.random() * 60 + 30}%` }} />
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((s) => (
                          <div key={s} className="flex-1 h-8 rounded bg-white/[0.03] border border-white/5" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        </div>

        {/* Reflection/glow underneath */}
        <div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-3/4 h-40 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20">
        <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}
