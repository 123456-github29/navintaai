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
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".faq-heading > *", {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
      });

      gsap.from(".faq-item", {
        y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Smooth accordion height animation
  useEffect(() => {
    answerRefs.current.forEach((el, i) => {
      if (!el) return;
      if (openIndex === i) {
        gsap.to(el, { height: "auto", opacity: 1, duration: 0.4, ease: "power3.out" });
      } else {
        gsap.to(el, { height: 0, opacity: 0, duration: 0.3, ease: "power3.inOut" });
      }
    });
  }, [openIndex]);

  return (
    <section ref={sectionRef} className="nv-section relative" style={{ background: "#111111" }}>
      <div className="nv-orb nv-orb-violet" style={{ width: 250, height: 250, bottom: "10%", right: "15%", opacity: 0.03 }} />

      <div className="nv-container-sm relative z-10">
        <div className="faq-heading text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(0,212,255,0.6)" }}>FAQ</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-white">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`faq-item rounded-xl overflow-hidden transition-all duration-500 ${openIndex === i ? "nv-faq-active" : ""}`}
              style={{
                background: openIndex === i ? undefined : "transparent",
                border: `1px solid ${openIndex === i ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 group">
                <span className="text-[0.9375rem] font-semibold text-white transition-colors duration-300">{faq.question}</span>
                <div className="relative w-5 h-5 flex-shrink-0">
                  <svg
                    className="w-5 h-5 transition-all duration-500"
                    style={{
                      color: openIndex === i ? "rgba(124,92,252,0.7)" : "rgba(255,255,255,0.3)",
                      transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              <div
                ref={(el) => { answerRefs.current[i] = el; }}
                className="overflow-hidden"
                style={{ height: 0, opacity: 0 }}
              >
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 nv-section-glow-divider" />
    </section>
  );
}
