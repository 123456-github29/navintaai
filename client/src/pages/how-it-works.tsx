import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const pipeline = [
  {
    number: "01", title: "Intelligent Content Strategy",
    description: "When you onboard, our AI analyzes your industry, target audience, and content goals to generate a personalized 4-week video calendar. Each video comes with a tailored script, shot list, and talking points.",
    detail: "The system uses advanced language models to understand your niche and create content strategies that align with platform-specific best practices and audience engagement patterns.",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  },
  {
    number: "02", title: "AI-Guided Recording",
    description: "Director Mode transforms your browser into a professional teleprompter studio. As you record, the AI displays your script with real-time shot guidance, timing cues, and framing suggestions.",
    detail: "The recording system captures video directly in your browser using the MediaRecorder API, with support for remote recording via phone. Shot-by-shot guidance ensures comprehensive coverage.",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  },
  {
    number: "03", title: "Automated Post-Production",
    description: "Once you've finished recording, our AI pipeline takes over. It analyzes your footage to make intelligent cuts, removes dead air, generates accurate captions, and can insert contextually relevant B-roll.",
    detail: "The editing pipeline uses audio analysis for silence detection, natural language processing for caption generation, and scene detection for B-roll matching.",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242"/><path d="M12 12v9M8 17l4 4 4-4"/></svg>,
  },
  {
    number: "04", title: "Server-Side Rendering & Export",
    description: "Your final video is rendered server-side for consistent, high-quality output. The rendering engine composites your footage with captions, transitions, and branding, then exports in the optimal format.",
    detail: "Videos are rendered using a programmatic video composition engine that handles frame-by-frame assembly, ensuring pixel-perfect output regardless of your device.",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  },
];

const techHighlights = [
  { title: "Natural Language Processing", description: "Advanced language models generate scripts, captions, and content strategies that match your brand voice." },
  { title: "Audio Intelligence", description: "Silence detection, speech-to-text, and audio analysis power smart cuts and accurate caption generation." },
  { title: "Cloud Rendering", description: "Server-side video composition ensures consistent quality. Your device's hardware doesn't limit your output." },
  { title: "Secure Storage", description: "All content is encrypted and stored securely. Your videos, scripts, and brand assets remain completely private." },
  { title: "Real-Time Collaboration", description: "WebSocket-powered live sessions enable remote recording from phone to desktop seamlessly." },
  { title: "Platform Optimization", description: "Automatic aspect ratio conversion, bitrate optimization, and format selection for each social platform." },
];

export default function HowItWorksPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
      }
      gsap.from(".pipeline-step", { y: 40, opacity: 0, duration: 0.7, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: pipelineRef.current, start: "top 75%", once: true } });
      gsap.from(".tech-card", { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: ".tech-grid", start: "top 80%", once: true } });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="nv-nav-glass fixed top-0 left-0 right-0 z-50 py-3">
        <div className="nv-container flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
            <span className="logo-text text-lg text-white">Navinta AI</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            <a href="/#showcase" className="hover:text-white transition-colors">Features</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <a href="/" className="nv-btn-primary text-sm">Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20" style={{ background: "#0d0d0d" }}>
        <div ref={heroRef} className="nv-container text-center">
          <div className="nv-badge inline-flex items-center gap-2 mb-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span>Under the hood</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] leading-[1.1] max-w-3xl mx-auto mb-6 text-white">
            How Navinta transforms raw footage into polished content
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            A look at the AI-powered pipeline that takes you from a blank page to a published video.
          </p>
        </div>
      </section>

      {/* Pipeline */}
      <section className="nv-section" style={{ background: "#111111" }}>
        <div ref={pipelineRef} className="nv-container">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>The Pipeline</p>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">Four stages, fully automated</h2>
          </div>

          <div className="space-y-5">
            {pipeline.map((step, i) => (
              <div key={i} className="pipeline-step nv-card p-8 md:p-10 group">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-white/[0.06]" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
                    {step.icon}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{step.number}</span>
                      <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-[0.9375rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{step.description}</p>
                    <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <span className="font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Technical note:</span> {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="nv-section" style={{ background: "#0d0d0d" }}>
        <div className="nv-container">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>Architecture</p>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">Built on modern infrastructure</h2>
            <p className="mt-5 text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              Designed for reliability, speed, and security at every stage.
            </p>
          </div>

          <div className="rounded-xl p-8 md:p-12" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
              {[
                { label: "Your Browser", sub: "Recording & UI" },
                { label: "AI Engine", sub: "Planning & Editing" },
                { label: "Render Farm", sub: "Video Composition" },
                { label: "CDN", sub: "Fast Delivery" },
              ].map((node, i) => (
                <div key={i} className="flex items-center gap-4 md:flex-col md:gap-3 md:text-center flex-1">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="w-6 h-6 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{node.label}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{node.sub}</div>
                  </div>
                  {i < 3 && <div className="hidden md:block text-lg" style={{ color: "rgba(255,255,255,0.15)" }}>&#8594;</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech */}
      <section className="nv-section" style={{ background: "#111111" }}>
        <div className="nv-container">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>Technology</p>
            <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">Powered by cutting-edge AI</h2>
          </div>
          <div className="tech-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {techHighlights.map((t, i) => (
              <div key={i} className="tech-card nv-card p-7">
                <h3 className="text-[0.9375rem] font-semibold text-white mb-2">{t.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="nv-section" style={{ background: "#0d0d0d" }}>
        <div className="nv-container-sm text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Your content stays yours</h2>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
            We take privacy seriously. Your recordings, scripts, and brand assets are encrypted at rest and in transit. We never use your content to train our models.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            {["End-to-end encryption", "No training on your data", "Delete anytime"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="nv-section relative overflow-hidden" style={{ background: "#111111" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,255,255,0.02), transparent 70%)" }} />
        <div className="nv-container text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6">Ready to see it in action?</h2>
          <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
            Start creating professional video content with AI that handles the heavy lifting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/" className="nv-btn-primary px-8 py-3.5 text-base">Get started free &#8594;</a>
            <a href="/pricing" className="nv-btn-secondary px-7 py-3.5 text-base">View pricing</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6" style={{ background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="nv-container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/navinta-logo.png" alt="Navinta AI" className="h-6 w-6 opacity-50" />
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Navinta AI</span>
            </div>
            <div className="flex gap-8 text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
              <a href="/contact" className="hover:text-white transition-colors">Contact</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>&copy; 2026 Navinta AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
