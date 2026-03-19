import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    title: "Onboard your brand",
    description: "Tell us about your business, audience, and goals. Our AI builds a personalized content strategy tailored to your niche.",
    visual: (
      <div className="rounded-lg p-5 space-y-3" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(15,163,126,0.1)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0fa37e" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "#202123" }}>Brand Profile</div>
            <div className="text-xs" style={{ color: "#acacbe" }}>Fitness coaching business</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md px-3 py-2 text-xs" style={{ background: "#fff", border: "1px solid #e5e5e5", color: "#6e6e80" }}>Audience: 25-40</div>
          <div className="rounded-md px-3 py-2 text-xs" style={{ background: "#fff", border: "1px solid #e5e5e5", color: "#6e6e80" }}>Tone: Motivational</div>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Get your content plan",
    description: "Receive a 4-week calendar of video ideas, complete with scripts, shot lists, and talking points for each day.",
    visual: (
      <div className="rounded-lg p-5" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium py-1" style={{ color: "#acacbe" }}>{d}</div>
          ))}
          {Array.from({ length: 28 }, (_, i) => (
            <div
              key={i}
              className="text-center text-[10px] py-1.5 rounded"
              style={{
                background: [2, 5, 9, 12, 16, 19, 23, 26].includes(i) ? "rgba(15,163,126,0.1)" : "transparent",
                color: [2, 5, 9, 12, 16, 19, 23, 26].includes(i) ? "#0fa37e" : "#acacbe",
                fontWeight: [2, 5, 9, 12, 16, 19, 23, 26].includes(i) ? 600 : 400,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Record with direction",
    description: "Director Mode shows your script as a teleprompter with shot-by-shot guidance. Just follow the prompts and speak naturally.",
    visual: (
      <div className="rounded-lg overflow-hidden" style={{ background: "#111", border: "1px solid #333" }}>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono text-red-400">REC 00:42</span>
          </div>
          <div className="text-sm text-white/90 leading-relaxed">
            "The biggest mistake I see new clients make is trying to change everything at once..."
          </div>
          <div className="flex gap-1.5">
            <div className="text-[9px] px-2 py-1 rounded text-emerald-400" style={{ background: "rgba(15,163,126,0.15)" }}>Shot 2 of 4</div>
            <div className="text-[9px] px-2 py-1 rounded text-white/40" style={{ background: "rgba(255,255,255,0.05)" }}>Medium close-up</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "04",
    title: "AI edits and exports",
    description: "Your footage is automatically cut, captioned, and polished. Export platform-ready videos with one click.",
    visual: (
      <div className="rounded-lg p-5 space-y-3" style={{ background: "#fafafa", border: "1px solid #e5e5e5" }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xs font-semibold" style={{ color: "#202123" }}>Exporting...</div>
          <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(15,163,126,0.1)", color: "#0fa37e" }}>HD 1080p</div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#e5e5e5" }}>
          <div className="h-full rounded-full" style={{ width: "78%", background: "#0fa37e" }} />
        </div>
        <div className="flex justify-between text-[10px]" style={{ color: "#acacbe" }}>
          <span>Auto-captions applied</span>
          <span>78%</span>
        </div>
      </div>
    ),
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(".step-item", {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
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
    <section ref={sectionRef} id="how-it-works" className="nv-section" style={{ background: "#fff" }}>
      <div className="nv-container">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
            From idea to published video in four steps
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "#6e6e80" }}>
            Navinta handles the complexity so you can focus on what you do best: being you.
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`step-item grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center`}
            >
              <div className={`space-y-4 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-bold" style={{ color: "#0fa37e" }}>{step.number}</span>
                  <div className="h-px flex-1" style={{ background: "#e5e5e5" }} />
                </div>
                <h3 className="text-2xl font-bold" style={{ color: "#202123" }}>
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: "#6e6e80" }}>
                  {step.description}
                </p>
              </div>
              <div className={`${i % 2 === 1 ? "md:order-1" : ""}`}>
                {step.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
