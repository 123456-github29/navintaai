import { useState } from "react";

const faqs = [
  {
    question: "What is Navinta AI?",
    answer: "Navinta is an AI-powered video production platform. It plans your content, guides your recording with a built-in teleprompter, and automatically edits your footage into polished, platform-ready videos.",
  },
  {
    question: "Do I need video editing experience?",
    answer: "No. Navinta handles all post-production automatically, including cuts, captions, B-roll, and transitions. You just need to show up on camera and follow the prompts.",
  },
  {
    question: "What platforms can I export for?",
    answer: "Navinta supports export for TikTok, Instagram Reels, YouTube Shorts, LinkedIn, and standard 16:9 video. Each export is optimized for the platform's specifications.",
  },
  {
    question: "How does Director Mode work?",
    answer: "Director Mode displays your AI-generated script as a teleprompter overlay while you record. It includes shot guidance, timing cues, and framing suggestions so you always know what to say and how to frame your shot.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. All paid plans are billed monthly or annually with no long-term commitment. You can cancel anytime and continue using your plan until the end of your billing period.",
  },
  {
    question: "Is my content private?",
    answer: "Absolutely. Your content, scripts, and recordings are private by default. We do not use your content to train AI models or share it with third parties.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="nv-section" style={{ background: "#fff" }}>
      <div className="nv-container-sm">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold tracking-wide uppercase mb-3" style={{ color: "#0fa37e" }}>
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#202123" }}>
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden transition-colors duration-200"
              style={{
                background: "#fff",
                border: openIndex === i ? "1px solid #d1d1d1" : "1px solid #e5e5e5",
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 text-left flex justify-between items-center gap-4"
              >
                <span className="text-[0.9375rem] font-semibold" style={{ color: "#202123" }}>
                  {faq.question}
                </span>
                <svg
                  className="w-5 h-5 flex-shrink-0 transition-transform duration-200"
                  style={{
                    color: "#acacbe",
                    transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed" style={{ color: "#6e6e80" }}>
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
