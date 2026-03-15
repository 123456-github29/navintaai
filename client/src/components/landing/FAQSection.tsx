import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    q: "Do I need editing experience?",
    a: "Not at all. Navinta AI handles everything — smart cuts, captions, b-roll, and color grading are applied automatically. You just record and export.",
  },
  {
    q: "What types of videos can I make?",
    a: "Talking-head content, brand intros, product demos, client testimonials, weekly updates — anything where you're speaking to camera. Single-shot or multi-shot.",
  },
  {
    q: "How does b-roll work?",
    a: "Navinta AI suggests b-roll clips from Pexels that match your content. You can swap, remove, or upload your own footage before exporting.",
  },
  {
    q: "Can I export for multiple platforms?",
    a: "Yes. Every video exports in 9:16 (Reels, TikTok), 1:1 (Feed), and 16:9 (YouTube) with one click.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan includes 1 content plan, 3 videos, and single-shot mode. Upgrade anytime for more features and exports.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(headingRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });

      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.6,
          delay: i * 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-32 px-6" style={{ background: "#0a0a0a" }}>
      <div className="max-w-3xl mx-auto">
        <div ref={headingRef} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Frequently asked questions
          </h2>
          <p className="text-white/40 text-base">
            Everything you need to know about Navinta AI.
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`rounded-xl transition-all duration-300 ${
                openIndex === i
                  ? "bg-white/[0.06]"
                  : "bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex justify-between items-center p-6 text-left"
              >
                <span className="text-base font-medium text-white/90 pr-4">
                  {faq.q}
                </span>
                <span
                  className="text-white/30 shrink-0 w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center transition-all duration-300"
                  style={{ transform: openIndex === i ? "rotate(45deg)" : "none" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-400 ease-in-out"
                style={{
                  maxHeight: openIndex === i ? "200px" : "0px",
                  opacity: openIndex === i ? 1 : 0,
                }}
              >
                <div className="px-6 pb-6 text-sm text-white/40 leading-relaxed">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
