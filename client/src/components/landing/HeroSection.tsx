import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";

interface HeroSectionProps {
  onGetStarted: () => void;
  waitlistApproved?: boolean;
}

const words = ["reimagined", "accelerated", "simplified", "automated"];

// Tiny floating particle component
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        hue: Math.random() > 0.5 ? 35 : 30, // warm amber tones
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
        ctx.fill();
      }

      // Draw faint lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201, 152, 90, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} />;
}

export default function HeroSection({ onGetStarted, waitlistApproved }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const mockupInnerRef = useRef<HTMLDivElement>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const wordRef = useRef<HTMLSpanElement>(null);

  // Mouse parallax for mockup
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mockupInnerRef.current) return;
    const rect = mockupInnerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(mockupInnerRef.current, {
      rotateY: x * 6,
      rotateX: -y * 4,
      duration: 0.6,
      ease: "power2.out",
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!mockupInnerRef.current) return;
    gsap.to(mockupInnerRef.current, {
      rotateY: 0,
      rotateX: 3,
      duration: 0.8,
      ease: "power3.out",
    });
  }, []);

  // Rotating word animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (wordRef.current) {
        gsap.to(wordRef.current, {
          y: -14,
          opacity: 0,
          scale: 0.95,
          filter: "blur(4px)",
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setWordIdx((prev) => (prev + 1) % words.length);
            gsap.fromTo(wordRef.current,
              { y: 14, opacity: 0, scale: 0.95, filter: "blur(4px)" },
              { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "power2.out" }
            );
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
      tl.from(badgeRef.current, { y: 24, opacity: 0, scale: 0.9, duration: 0.8 }, 0.2);
      tl.from(headlineRef.current, { y: 60, opacity: 0, duration: 1.0 }, 0.35);
      tl.from(subRef.current, { y: 40, opacity: 0, duration: 0.9 }, 0.55);
      tl.from(ctaRef.current, { y: 30, opacity: 0, duration: 0.8 }, 0.7);
      tl.from(mockupRef.current, { y: 100, opacity: 0, scale: 0.92, duration: 1.4, ease: "power2.out" }, 0.8);

      // Animate the orbs in
      tl.from(".hero-orb", { scale: 0, opacity: 0, duration: 2, stagger: 0.3, ease: "power2.out" }, 0.2);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-40 pb-28 md:pt-48 md:pb-36 nv-noise" style={{ background: "#0d0d0d" }}>
      {/* Floating color orbs */}
      <div className="hero-orb nv-orb nv-orb-violet" style={{ width: 500, height: 500, top: "-10%", left: "20%" }} />
      <div className="hero-orb nv-orb nv-orb-cyan" style={{ width: 400, height: 400, top: "30%", right: "10%" }} />
      <div className="hero-orb nv-orb nv-orb-rose" style={{ width: 300, height: 300, bottom: "5%", left: "40%" }} />

      {/* Particles */}
      <Particles />

      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,152,90,0.06), transparent 60%)",
        zIndex: 2,
      }} />

      {/* Subtle grid with color tint */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(201,152,90,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,152,90,0.03) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 70%)",
        zIndex: 2,
      }} />

      <div className="relative z-10 nv-container text-center" style={{ zIndex: 10 }}>
        {/* Badge with accent */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 mb-10 px-4 py-2 rounded-full nv-float" style={{
          background: "rgba(201,152,90,0.06)",
          border: "1px solid rgba(201,152,90,0.15)",
        }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full nv-live-dot-ping opacity-40" />
            <span className="relative inline-flex rounded-full h-2 w-2 nv-live-dot" />
          </span>
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Now in private beta</span>
        </div>

        {/* Headline */}
        <h1 ref={headlineRef} className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold tracking-[-0.04em] leading-[1.05] max-w-4xl mx-auto text-white">
          Video content,{" "}
          <span ref={wordRef} className="inline-block nv-gradient-text-accent">
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
          <button onClick={onGetStarted} className="nv-btn-primary nv-btn-glow px-8 py-3.5 text-[0.9375rem] group">
            {waitlistApproved ? "Start creating" : "Get early access"}{" "}
            <span className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-1">&#8594;</span>
          </button>
          <a href="#how-it-works" className="nv-btn-secondary px-7 py-3.5 text-[0.9375rem] nv-animated-underline">
            See how it works
          </a>
        </div>

        {/* 3D Mockup */}
        <div ref={mockupRef} className="mt-20 md:mt-24 w-full max-w-5xl mx-auto nv-mockup-3d"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div ref={mockupInnerRef} className="nv-mockup-3d-inner relative rounded-xl overflow-hidden nv-gradient-border" style={{
            background: "#161616",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), 0 0 80px rgba(201,152,90,0.05)",
          }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#111" }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full transition-transform duration-300 hover:scale-125" style={{ background: "#ff5f57" }} />
                <div className="w-3 h-3 rounded-full transition-transform duration-300 hover:scale-125" style={{ background: "#febc2e" }} />
                <div className="w-3 h-3 rounded-full transition-transform duration-300 hover:scale-125" style={{ background: "#28c840" }} />
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
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-300" style={{ background: "rgba(201,152,90,0.08)", border: "1px solid rgba(201,152,90,0.15)" }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(201,152,90,0.2)" }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" fill="#c9985a"/><rect x="9" y="2" width="5" height="5" rx="1.5" fill="#c9985a" opacity="0.5"/><rect x="2" y="9" width="5" height="5" rx="1.5" fill="#c9985a" opacity="0.5"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="#c9985a" opacity="0.3"/></svg>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "rgba(201,152,90,0.9)" }}>Dashboard</span>
                  </div>
                  {["Content Plan", "Record", "Library", "Brand Kit"].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors duration-300 hover:bg-white/[0.03]" style={{ color: "rgba(255,255,255,0.3)" }}>
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
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 hover:bg-white/[0.1] cursor-pointer" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
                      <div key={s.label} className="rounded-lg p-3 transition-all duration-300 hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-lg font-bold text-white" style={{ opacity: s.opacity }}>{s.value}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { title: "Brand Launch Reel", status: "Recording", pct: 72, color: "#c9985a" },
                      { title: "Product Demo #3", status: "Complete", pct: 100, color: "#a07d50" },
                      { title: "Client Testimonial", status: "Planned", pct: 35, color: "#e0b97a" },
                      { title: "Weekly Update", status: "Editing", pct: 58, color: "#c9985a" },
                    ].map((card) => (
                      <div key={card.title} className="rounded-lg p-3.5 space-y-2.5 transition-all duration-300 hover:bg-white/[0.03]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex justify-between items-start gap-1.5">
                          <span className="text-xs font-medium text-white/70">{card.title}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{card.status}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${card.pct}%`, background: card.color, opacity: 0.7 }} />
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

      {/* Section divider glow */}
      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
