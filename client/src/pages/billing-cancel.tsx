import { useLocation } from "wouter";
import { XCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function BillingCancel() {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        containerRef.current.querySelector(".cancel-icon"),
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      )
        .fromTo(
          containerRef.current.querySelector(".cancel-title"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2"
        )
        .fromTo(
          containerRef.current.querySelector(".cancel-message"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2"
        )
        .fromTo(
          containerRef.current.querySelector(".cancel-buttons"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          "-=0.2"
        );
    }
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div ref={containerRef} className="max-w-md w-full text-center space-y-6">
        <div className="cancel-icon inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100">
          <XCircleIcon className="w-12 h-12 text-orange-500" />
        </div>

        <div className="space-y-3">
          <h1 className="cancel-title text-3xl font-bold text-[#111111]">
            Payment cancelled
          </h1>
          <p className="cancel-message text-[#666666]">
            No worries! Your payment was not processed. You can try again whenever you're ready.
          </p>
        </div>

        <div className="cancel-buttons pt-4 space-y-3">
          <Button
            onClick={() => setLocation("/pricing")}
            className="w-full h-12 rounded-full bg-[#111111] text-white font-medium hover:opacity-90 transition-all duration-200"
          >
            Try Again
          </Button>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="w-full h-12 rounded-full border border-gray-200 text-[#111111] hover:bg-gray-50 transition-all duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
