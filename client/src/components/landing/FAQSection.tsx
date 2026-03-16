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
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
      });

      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.6,
          delay: i * 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 78%" },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-32 px-6" style={{ background: "#FAFBFF" }}>
      {/* Top divider */}
      <div className="hr-fade absolute left-0 right-0" style={{ position: "relative", marginBottom: 0 }} />

      <div className="max-w-3xl mx-auto">
        <div ref={headingRef} className="text-center mb-14">
          <p className="section-label mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-gray-500 text-base">
            Everything you need to know about Navinta AI.
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`faq-item-light ${openIndex === i ? "open" : ""}`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex justify-between items-center px-6 py-5 text-left"
              >
                <span className="text-base font-semibold text-gray-800 pr-4">
                  {faq.q}
                </span>
                <span
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                    openIndex === i
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                  style={{ transform: openIndex === i ? "rotate(45deg)" : "none" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: openIndex === i ? "200px" : "0px",
                  opacity: openIndex === i ? 1 : 0,
                }}
              >
                <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
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
