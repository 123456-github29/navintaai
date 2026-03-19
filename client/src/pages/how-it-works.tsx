import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const pipeline = [
  {
    number: "01",
    title: "Intelligent Content Strategy",
    description: "When you onboard, our AI analyzes your industry, target audience, and content goals to generate a personalized 4-week video calendar. Each video comes with a tailored script, shot list, and talking points designed to resonate with your specific audience.",
    detail: "The system uses advanced language models to understand your niche and create content strategies that align with platform-specific best practices and audience engagement patterns.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "AI-Guided Recording",
    description: "Director Mode transforms your browser into a professional teleprompter studio. As you record, the AI displays your script with real-time shot guidance, timing cues, and framing suggestions. Think of it as having a professional director in your pocket.",
    detail: "The recording system captures video directly in your browser using the MediaRecorder API, with support for remote recording via phone. Shot-by-shot guidance ensures comprehensive coverage of your talking points.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Automated Post-Production",
    description: "Once you've finished recording, our AI pipeline takes over. It analyzes your footage to make intelligent cuts, removes dead air and filler, generates accurate captions, and can even insert contextually relevant B-roll footage.",
    detail: "The editing pipeline uses a combination of audio analysis for silence detection, natural language processing for caption generation, and computer vision techniques for scene detection and B-roll matching.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" />
        <path d="M12 12v9M8 17l4 4 4-4" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Server-Side Rendering & Export",
    description: "Your final video is rendered server-side for consistent, high-quality output. The rendering engine composites your footage with captions, transitions, and branding elements, then exports in the optimal format for each target platform.",
    detail: "Videos are rendered using a programmatic video composition engine that handles frame-by-frame assembly. This ensures pixel-perfect output regardless of your device's processing power.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

const techHighlights = [
  {
    title: "Natural Language Processing",
    description: "Advanced language models generate scripts, captions, and content strategies that sound natural and match your brand voice.",
  },
  {
    title: "Audio Intelligence",
    description: "Silence detection, speech-to-text, and audio analysis power smart cuts and accurate caption generation.",
  },
  {
    title: "Cloud Rendering",
    description: "Server-side video composition ensures consistent quality. Your device's hardware doesn't limit your output.",
  },
  {
    title: "Secure Storage",
    description: "All content is encrypted and stored securely. Your videos, scripts, and brand assets remain completely private.",
  },
  {
    title: "Real-Time Collaboration",
    description: "WebSocket-powered live sessions enable remote recording from phone to desktop seamlessly.",
  },
  {
    title: "Platform Optimization",
    description: "Automatic aspect ratio conversion, bitrate optimization, and format selection for each social platform.",
  },
];

export default function HowItWorksPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.from(heroRef.current.children, {
          y: 30,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
        });
      }

      gsap.from(".pipeline-step", {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: pipelineRef.current,
          start: "top 75%",
          once: true,
        },
      });

      gsap.from(".tech-card", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".tech-grid",
          start: "top 80%",
          once: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="nv-navbar fixed top-0 left-0 right-0 z-50 py-3">
        <div className="nv-container flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/navinta-logo.png" alt="Navinta AI" className="h-7 w-7" />
            <span className="logo-text text-lg" style={{ color: "#202123" }}>Navinta AI</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "#6e6e80" }}>
            <a href="/#showcase" className="hover:text-[#202123] transition-colors">Features</a>
            <a href="/pricing" className="hover:text-[#202123] transition-colors">Pricing</a>
          </div>
          <a href="/" className="nv-btn-dark text-sm">Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20" style={{ background: "#fff" }}>
        <div ref={heroRef} className="nv-container text-center">
          <div className="nv-badge inline-flex items-center gap-2 mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            <span>Under the hood</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em] leading-[1.1] max-w-3xl mx-auto mb-6" style={{ color: "#202123" }}>
            How Navinta transforms raw footage into polished content
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: "#6e6e80" }}>
            A look at the AI-powered pipeline that takes you from a blank page to a published video, without requiring any technical expertise.
          </p>
        </div>
      </section>

      {/* Pipeline */}
      <section className="nv-section" style={{ background: "#f7f7f8" }}>
        <div ref={pipelineRef} className="nv-container">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
              The Pipeline
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
              Four stages, fully automated
            </h2>
          </div>

          <div className="space-y-6">
            {pipeline.map((step, i) => (
              <div key={i} className="pipeline-step bg-white rounded-xl p-8 md:p-10" style={{ border: "1px solid #e5e5e5" }}>
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(15,163,126,0.08)", color: "#0fa37e" }}>
                      {step.icon}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold" style={{ color: "#0fa37e" }}>{step.number}</span>
                      <h3 className="text-xl font-bold" style={{ color: "#202123" }}>{step.title}</h3>
                    </div>
                    <p className="text-base leading-relaxed" style={{ color: "#6e6e80" }}>
                      {step.description}
                    </p>
                    <div className="rounded-lg p-4" style={{ background: "#f7f7f8", border: "1px solid #e5e5e5" }}>
                      <p className="text-sm leading-relaxed" style={{ color: "#acacbe" }}>
                        <span className="font-semibold" style={{ color: "#6e6e80" }}>Technical note:</span> {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Diagram (simplified visual) */}
      <section className="nv-section" style={{ background: "#fff" }}>
        <div className="nv-container">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
              Architecture
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
              Built on modern infrastructure
            </h2>
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
              Navinta's architecture is designed for reliability, speed, and security at every stage of the content creation pipeline.
            </p>
          </div>

          {/* Simplified flow diagram */}
          <div className="rounded-xl p-8 md:p-12" style={{ background: "#f7f7f8", border: "1px solid #e5e5e5" }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
              {[
                { label: "Your Browser", sub: "Recording & UI", icon: "🖥️" },
                { label: "AI Engine", sub: "Planning & Editing", icon: "🧠" },
                { label: "Render Farm", sub: "Video Composition", icon: "⚡" },
                { label: "CDN", sub: "Fast Delivery", icon: "🌐" },
              ].map((node, i) => (
                <div key={i} className="flex items-center gap-4 md:flex-col md:gap-3 md:text-center flex-1">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{ background: "#fff", border: "1px solid #e5e5e5" }}>
                    {node.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#202123" }}>{node.label}</div>
                    <div className="text-xs" style={{ color: "#acacbe" }}>{node.sub}</div>
                  </div>
                  {i < 3 && (
                    <div className="hidden md:block text-lg" style={{ color: "#d9d9e3" }}>&#8594;</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Highlights */}
      <section className="nv-section" style={{ background: "#f7f7f8" }}>
        <div className="nv-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
              Technology
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
              Powered by cutting-edge AI
            </h2>
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
              The core technologies that make Navinta's automated pipeline possible.
            </p>
          </div>

          <div className="tech-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techHighlights.map((tech, i) => (
              <div key={i} className="tech-card bg-white rounded-xl p-7" style={{ border: "1px solid #e5e5e5" }}>
                <h3 className="text-base font-semibold mb-2" style={{ color: "#202123" }}>
                  {tech.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6e6e80" }}>
                  {tech.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section className="nv-section" style={{ background: "#fff" }}>
        <div className="nv-container-sm text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(15,163,126,0.08)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4" style={{ color: "#202123" }}>
            Your content stays yours
          </h2>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "#6e6e80" }}>
            We take privacy seriously. Your recordings, scripts, and brand assets are encrypted at rest and in transit. We never use your content to train our models, and we never share your data with third parties. You can delete your content at any time.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium" style={{ color: "#6e6e80" }}>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              End-to-end encryption
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              No training on your data
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Delete anytime
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="nv-section" style={{ background: "#202123" }}>
        <div className="nv-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-5">
            Ready to see it in action?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
            Start creating professional video content with AI that handles the heavy lifting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/"
              className="px-8 py-3.5 rounded-lg text-base font-semibold transition-all duration-200 hover:opacity-90"
              style={{ background: "#0fa37e", color: "#fff" }}
            >
              Get started free &#8594;
            </a>
            <a
              href="/pricing"
              className="px-7 py-3.5 rounded-lg text-base font-medium transition-all duration-200"
              style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              View pricing
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6" style={{ background: "#f7f7f8", borderTop: "1px solid #e5e5e5" }}>
        <div className="nv-container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/navinta-logo.png" alt="Navinta AI" className="h-6 w-6 opacity-70" />
              <span className="text-sm font-semibold" style={{ color: "#6e6e80" }}>Navinta AI</span>
            </div>
            <div className="flex gap-8 text-sm" style={{ color: "#acacbe" }}>
              <a href="/contact" className="hover:text-[#202123] transition-colors">Contact</a>
              <a href="/privacy" className="hover:text-[#202123] transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-[#202123] transition-colors">Terms</a>
            </div>
            <p className="text-sm" style={{ color: "#acacbe" }}>&copy; 2026 Navinta AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
