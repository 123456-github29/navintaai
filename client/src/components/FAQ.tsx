import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TIMING, EASE, STAGGER } from '@/lib/animation';

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    question: 'What makes Navinta AI different from other AI video tools?',
    answer: 'Navinta AI thinks like a director, not a prompt machine. We guide you shot-by-shot through the entire recording process, then handle all editing automatically. You never need to learn video editing software.',
  },
  {
    question: 'Do I need any video editing experience?',
    answer: 'None at all. Navinta AI is designed for creators who want to skip the learning curve. Just follow the on-screen prompts, record your clips, and we handle the rest.',
  },
  {
    question: 'What kind of videos can I create?',
    answer: 'Everything from product demos and tutorials to talking-head content, vlogs, and social media shorts. Navinta AI adapts to your content type during onboarding.',
  },
  {
    question: 'How does the AI editing work?',
    answer: 'Our AI analyzes your clips to remove pauses, stitch shots seamlessly, add relevant b-roll, generate captions, and apply professional color grading. No manual editing required.',
  },
  {
    question: 'Can I export for different platforms?',
    answer: 'Yes. One recording becomes multiple formats: 9:16 for TikTok and Reels, 1:1 for Instagram, 16:9 for YouTube and LinkedIn. All optimized for each platform.',
  },
  {
    question: 'Is my content secure?',
    answer: 'Your content is encrypted and stored securely. We use Google OAuth for authentication, Supabase for secure data storage with row-level security, and never share your videos without permission.',
  },
];

function FAQItem({ question, answer, isOpen, onClick }: { 
  question: string; 
  answer: string; 
  isOpen: boolean;
  onClick: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-start justify-between gap-4 text-left group"
        aria-expanded={isOpen}
      >
        <span className="text-[#F5F1EC] text-lg group-hover:text-[#B08A5A] transition-colors duration-300">
          {question}
        </span>
        <ChevronDownIcon 
          className={`w-5 h-5 text-[#F5F1EC]/40 flex-shrink-0 mt-1 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{ 
          maxHeight: isOpen ? '200px' : '0',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p className="text-[#F5F1EC]/50 pb-6 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.set([titleRef.current, listRef.current, securityRef.current], { opacity: 0, y: 40 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          end: 'center center',
          scrub: 1,
        },
      });

      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: TIMING.MEDIUM,
        ease: EASE,
      }, 0);

      tl.to(listRef.current, {
        opacity: 1,
        y: 0,
        duration: TIMING.MEDIUM,
        ease: EASE,
      }, TIMING.MEDIUM * 0.5);

      tl.to(securityRef.current, {
        opacity: 1,
        y: 0,
        duration: TIMING.MEDIUM,
        ease: EASE,
      }, TIMING.MEDIUM);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={containerRef}
      id="faq"
      className="relative py-32 px-8 bg-black overflow-hidden"
      aria-labelledby="faq-title"
    >
      <div className="max-w-4xl mx-auto">
        <div ref={titleRef} className="text-center mb-16">
          <p className="text-[#B08A5A] uppercase tracking-[0.2em] text-sm mb-4">Questions</p>
          <h2 id="faq-title" className="font-display text-4xl md:text-5xl text-[#F5F1EC] mb-6">
            Frequently <span className="italic">Asked</span>
          </h2>
        </div>

        <div ref={listRef} className="mb-20">
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>

        <div 
          ref={securityRef}
          className="rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-8 md:p-12"
        >
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl border border-[#4338CA]/30 bg-[#4338CA]/5 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#4338CA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-xl text-[#F5F1EC] mb-2">Security & Privacy</h3>
              <p className="text-[#F5F1EC]/50 leading-relaxed">
                Your authentication is handled securely through Google OAuth and Supabase. 
                All API keys are stored server-side, never exposed to the client. 
                Your data is protected with row-level security policies. 
                We never share your content without explicit permission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
