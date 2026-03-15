import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { LEGAL_CONFIG } from "@/lib/legal-config";

const TERMS_ACCEPTED_KEY = "navinta_terms_accepted";
const VISITOR_ID_KEY = "navinta_visitor_id";
const PUBLIC_ROUTES = ["/privacy", "/terms", "/pricing"];

function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

interface TermsAcceptanceProps {
  children: React.ReactNode;
}

export function TermsAcceptance({ children }: TermsAcceptanceProps) {
  const [location] = useLocation();
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.startsWith(route));

  useEffect(() => {
    const stored = localStorage.getItem(TERMS_ACCEPTED_KEY);
    const accepted = stored === "true";
    setHasAccepted(accepted);
    
    if (!accepted && !isPublicRoute) {
      const timer = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isPublicRoute]);

  const handleAccept = async () => {
    if (!isChecked || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const visitorId = getOrCreateVisitorId();
      
      const response = await fetch("/api/terms/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitorId,
          privacyPolicyVersion: LEGAL_CONFIG.privacyPolicyVersion,
          termsOfServiceVersion: LEGAL_CONFIG.termsOfServiceVersion,
        }),
      });

      if (!response.ok) {
        console.error("Failed to record terms acceptance");
      }
    } catch (error) {
      console.error("Error recording terms acceptance:", error);
    } finally {
      localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
      setHasAccepted(true);
      setShowModal(false);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      
      {showModal && !hasAccepted && !isPublicRoute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in"
            onClick={handleClose}
          />
          
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 shadow-2xl animate-scale-in" style={{ background: "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)" }}>
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-white/30" />
            </button>

            <div className="p-6 space-y-6">
              <div className="text-center space-y-4 pt-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-white/5 border border-white/10">
                  <ShieldCheckIcon className="w-7 h-7 text-white/70" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">
                    Welcome to Navinta AI
                  </h2>
                  <p className="text-sm text-white/35">
                    Please review and accept our terms to continue
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <div className="flex-1">
                    <h3 className="font-medium text-white text-sm">Privacy Policy</h3>
                    <Link href="/privacy" className="text-xs text-white/40 hover:underline">
                      Read Privacy Policy
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <div className="flex-1">
                    <h3 className="font-medium text-white text-sm">Terms of Service</h3>
                    <Link href="/terms" className="text-xs text-white/40 hover:underline">
                      Read Terms of Service
                    </Link>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked === true)}
                  className="mt-0.5 border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
                />
                <span className="text-sm text-white/70 leading-relaxed">
                  I have read and agree to the{" "}
                  <Link href="/privacy" className="text-white font-medium hover:underline">Privacy Policy</Link>
                  {" "}and{" "}
                  <Link href="/terms" className="text-white font-medium hover:underline">Terms of Service</Link>
                </span>
              </label>

              <Button
                onClick={handleAccept}
                disabled={!isChecked || isSubmitting}
                className="w-full h-11 bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] text-black font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? "Saving..." : "Accept & Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.25s ease-out forwards;
        }
      `}</style>
    </>
  );
}
