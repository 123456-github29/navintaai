import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  { question: "What is Navinta AI?", answer: "Navinta is an AI-powered video production platform. It plans your content, guides your recording with a built-in teleprompter, and automatically edits your footage into polished, platform-ready videos." },
  { question: "Do I need video editing experience?", answer: "No. Navinta handles all post-production automatically, including cuts, captions, B-roll, and transitions. You just need to show up on camera and follow the prompts." },
  { question: "What platforms can I export for?", answer: "Navinta supports export for TikTok, Instagram Reels, YouTube Shorts, LinkedIn, and standard 16:9 video. Each export is optimized for the platform's specifications." },
  { question: "How does Director Mode work?", answer: "Director Mode displays your AI-generated script as a teleprompter overlay while you record. It includes shot guidance, timing cues, and framing suggestions." },
  { question: "Can I cancel anytime?", answer: "Yes. All paid plans are billed monthly or annually with no long-term commitment. Cancel anytime and continue using your plan until the end of your billing period." },
  { question: "Is my content private?", answer: "Absolutely. Your content, scripts, and recordings are private by default. We do not use your content to train AI models or share it with third parties." },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".faq-item", {
        y: 20, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="nv-section" style={{ background: "#111111" }}>
      <div className="nv-container-sm">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>FAQ</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item rounded-xl overflow-hidden transition-all duration-300" style={{
              background: openIndex === i ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1px solid ${openIndex === i ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
            }}>
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full px-6 py-5 text-left flex justify-between items-center gap-4">
                <span className="text-[0.9375rem] font-semibold text-white">{faq.question}</span>
                <svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300" style={{ color: "rgba(255,255,255,0.3)", transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: openIndex === i ? "200px" : "0px", opacity: openIndex === i ? 1 : 0 }}>
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
