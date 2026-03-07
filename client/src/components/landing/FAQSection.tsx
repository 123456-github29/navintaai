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
  const labelRef = useRef<HTMLParagraphElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(labelRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.6,
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
    <section ref={sectionRef} className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <p ref={labelRef} className="text-sm font-medium text-[#666666] uppercase tracking-widest mb-12 text-center">
          FAQ
        </p>

        <div>
          {faqs.map((faq, i) => (
            <div
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="border-b border-gray-100"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex justify-between items-center py-6 text-left"
              >
                <span className="text-lg font-medium text-[#111111]">
                  {faq.q}
                </span>
                <span className="text-xl text-[#999999] shrink-0 ml-4 transition-transform duration-300" style={{ transform: openIndex === i ? "rotate(45deg)" : "none" }}>
                  +
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-400 ease-in-out"
                style={{
                  maxHeight: openIndex === i ? "200px" : "0px",
                  opacity: openIndex === i ? 1 : 0,
                }}
              >
                <div className="pb-6 text-[#666666] leading-relaxed">
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
