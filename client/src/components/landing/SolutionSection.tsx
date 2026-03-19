import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    title: "AI Content Planning",
    description: "Generate a full month of video ideas tailored to your brand, audience, and platform. Complete with scripts and shot lists.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    title: "Director Mode",
    description: "A built-in teleprompter that guides you through each shot. See your script, timing, and framing cues as you record.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242" />
        <path d="M12 12v9M8 17l4 4 4-4" />
      </svg>
    ),
    title: "Automatic Editing",
    description: "Smart cuts, B-roll insertion, captions, and transitions applied automatically. Your raw footage becomes a polished video.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Multi-Platform Export",
    description: "Export optimized for TikTok, Reels, Shorts, and LinkedIn. Correct aspect ratios and formatting handled automatically.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Brand Kit & Identity",
    description: "Upload your logos, colors, and fonts. Every export reflects your brand identity consistently.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    ),
    title: "Schedule & Analytics",
    description: "Schedule posts across platforms and track performance. Understand what works and optimize your content strategy.",
  },
];

export default function SolutionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="showcase" className="nv-section" style={{ background: "#f7f7f8" }}>
      <div className="nv-container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
            Features
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
            Everything you need to create consistently
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
            One platform replaces your content planner, teleprompter, video editor, and publishing tool.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="feature-card nv-card p-7">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style={{ background: "rgba(15,163,126,0.08)", color: "#0fa37e" }}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#202123" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6e6e80" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
