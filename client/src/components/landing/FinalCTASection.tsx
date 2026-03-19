interface FinalCTASectionProps {
  onGetStarted: () => void;
  waitlistApproved?: boolean;
}

export default function FinalCTASection({ onGetStarted, waitlistApproved }: FinalCTASectionProps) {
  return (
    <section className="nv-section" style={{ background: "#202123" }}>
      <div className="nv-container text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-5">
          Start creating professional video content today
        </h2>
        <p className="text-lg max-w-2xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.55)" }}>
          Join thousands of creators and businesses who use Navinta to produce consistent, high-quality video without a production team.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="px-8 py-3.5 rounded-lg text-base font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#0fa37e", color: "#fff" }}
          >
            {waitlistApproved ? "Get started free" : "Get early access"} <span className="ml-1">&#8594;</span>
          </button>
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
  );
}
