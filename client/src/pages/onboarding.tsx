import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingSchema, type OnboardingData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";

const STEPS = 8;

const CREATOR_TYPES = [
  { value: "founder", label: "Founder" },
  { value: "coach", label: "Coach" },
  { value: "creator", label: "Creator" },
  { value: "educator", label: "Educator" },
  { value: "business-owner", label: "Business Owner" },
  { value: "marketer", label: "Marketer" },
  { value: "consultant", label: "Consultant" },
  { value: "other", label: "Other" },
];

const CONTENT_GOALS = [
  { value: "leads", label: "Get leads" },
  { value: "authority", label: "Build authority" },
  { value: "educate", label: "Educate" },
  { value: "sell", label: "Sell" },
  { value: "trust", label: "Build trust" },
  { value: "audience", label: "Grow audience" },
  { value: "engage", label: "Engage community" },
  { value: "convert", label: "Convert followers" },
];

const DURATION_TYPES = [
  { value: "quick", label: "Quick hit", description: "15-25 seconds" },
  { value: "standard", label: "Standard", description: "30-45 seconds" },
  { value: "story", label: "Story", description: "60-90 seconds" },
  { value: "deep-dive", label: "Deep dive", description: "90-120 seconds" },
];

const EMOTIONAL_RESULTS = [
  { value: "inspired", label: "Inspired" },
  { value: "confident", label: "Confident" },
  { value: "entertained", label: "Entertained" },
  { value: "calm", label: "Calm" },
  { value: "motivated", label: "Motivated" },
  { value: "curious", label: "Curious" },
  { value: "emotional", label: "Emotional" },
  { value: "empowered", label: "Empowered" },
];

const CAMERA_COMFORT = [
  { value: "very-comfortable", label: "Very comfortable" },
  { value: "somewhat-comfortable", label: "Somewhat comfortable" },
  { value: "nervous", label: "Nervous" },
  { value: "voice-over", label: "Prefer voice-over" },
];

const BRAND_PERSONALITIES = [
  { value: "bold", label: "Bold" },
  { value: "calm", label: "Calm" },
  { value: "friendly", label: "Friendly" },
  { value: "cinematic", label: "Cinematic" },
  { value: "direct", label: "Direct" },
  { value: "playful", label: "Playful" },
  { value: "professional", label: "Professional" },
  { value: "authentic", label: "Authentic" },
];

function OptionButton({
  selected,
  onClick,
  children,
  description
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full h-14 px-5 rounded-xl border text-left transition-all duration-300",
        "hover:border-white/15 hover:bg-white/[0.04]",
        "flex items-center",
        selected
          ? "border-white/20 bg-white/[0.06] text-white"
          : "border-white/[0.06] bg-white/[0.02] text-white/50"
      )}
    >
      <div>
        <span className="text-sm font-medium">{children}</span>
        {description && (
          <span className="block text-xs text-white/25 mt-0.5">{description}</span>
        )}
      </div>
    </button>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-8 bg-white"
              : i + 1 < current
                ? "w-1.5 bg-white/40"
                : "w-1.5 bg-white/10"
          )}
        />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      creatorType: "",
      creatorTypeOther: "",
      audienceDescription: "",
      contentGoal: "",
      durationType: "",
      emotionalResult: "",
      cameraComfort: "",
      brandName: "",
      brandDescription: "",
      brandPersonality: "",
    },
  });

  const { watch, setValue } = form;
  const creatorType = watch("creatorType");
  const audienceDescription = watch("audienceDescription");
  const contentGoal = watch("contentGoal");
  const durationType = watch("durationType");
  const emotionalResult = watch("emotionalResult");
  const cameraComfort = watch("cameraComfort");
  const brandName = watch("brandName");
  const brandDescription = watch("brandDescription");
  const brandPersonality = watch("brandPersonality");

  useEffect(() => {
    if (contentRef.current) {
      gsap.from(contentRef.current, { opacity: 0, y: 15, duration: 0.4, ease: "power2.out" });
    }
  }, [step]);

  const createPlanMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await apiRequest("POST", "/api/onboarding", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Your content plan is ready",
        description: "Crafted with cinematic precision.",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create content plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!creatorType;
      case 2: return audienceDescription.length >= 10;
      case 3: return !!contentGoal;
      case 4: return !!durationType;
      case 5: return !!emotionalResult;
      case 6: return !!cameraComfort;
      case 7: return brandName.length >= 2 && brandDescription.length >= 20;
      case 8: return !!brandPersonality;
      default: return false;
    }
  };

  const nextStep = async () => {
    if (canProceed() && step < STEPS) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (canProceed()) {
      const data = form.getValues();
      createPlanMutation.mutate(data);
    }
  };

  if (createPlanMutation.isPending) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050505" }}>
        <div className="text-center space-y-8 max-w-sm px-6">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Creating your plan</h2>
            <p className="text-sm text-white/30">This will take a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#050505" }}>
      {/* Background orb */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)", filter: "blur(80px)" }} />

      <div className="absolute top-8 left-0 right-0 z-10">
        <ProgressDots current={step} total={STEPS} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div ref={contentRef} className="w-full max-w-lg space-y-10">
          <div className="text-center">
            <span className="text-white/20 text-xs font-medium tracking-widest">
              {step} / {STEPS}
            </span>
          </div>

          {step === 1 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
                What best describes you?
              </h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CREATOR_TYPES.map((type) => (
                  <OptionButton key={type.value} selected={creatorType === type.value} onClick={() => setValue("creatorType", type.value)}>
                    {type.label}
                  </OptionButton>
                ))}
              </div>
              {creatorType === "other" && (
                <Input
                  placeholder="Tell us more..."
                  value={watch("creatorTypeOther")}
                  onChange={(e) => setValue("creatorTypeOther", e.target.value)}
                  className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 h-12 text-sm rounded-xl focus:ring-indigo-500/30 focus:border-indigo-500/50"
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Describe your ideal audience</h1>
                <p className="text-sm text-white/30">In one sentence, who are you creating for?</p>
              </div>
              <Textarea
                placeholder="e.g., Founders trying to grow on LinkedIn"
                value={audienceDescription}
                onChange={(e) => setValue("audienceDescription", e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 min-h-[100px] text-sm resize-none rounded-xl focus:ring-indigo-500/30 focus:border-indigo-500/50"
                maxLength={120}
              />
              <div className="text-right">
                <span className="text-xs text-white/20">{audienceDescription.length}/120</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">What should these videos do for you?</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONTENT_GOALS.map((goal) => (
                  <OptionButton key={goal.value} selected={contentGoal === goal.value} onClick={() => setValue("contentGoal", goal.value)}>
                    {goal.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">How long should each video feel?</h1>
              <div className="space-y-3">
                {DURATION_TYPES.map((duration) => (
                  <OptionButton key={duration.value} selected={durationType === duration.value} onClick={() => setValue("durationType", duration.value)} description={duration.description}>
                    {duration.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">How should people feel after watching?</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {EMOTIONAL_RESULTS.map((emotion) => (
                  <OptionButton key={emotion.value} selected={emotionalResult === emotion.value} onClick={() => setValue("emotionalResult", emotion.value)}>
                    {emotion.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">How comfortable are you on camera?</h1>
              <div className="space-y-3">
                {CAMERA_COMFORT.map((comfort) => (
                  <OptionButton key={comfort.value} selected={cameraComfort === comfort.value} onClick={() => setValue("cameraComfort", comfort.value)}>
                    {comfort.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">Tell us about your brand</h1>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs text-white/30 font-medium">Brand name</label>
                  <Input
                    placeholder="Your brand name"
                    value={brandName}
                    onChange={(e) => setValue("brandName", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 h-12 text-sm rounded-xl focus:ring-indigo-500/30 focus:border-indigo-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/30 font-medium">Brand description</label>
                  <Textarea
                    placeholder="What do you stand for? What do you want to be known for?"
                    value={brandDescription}
                    onChange={(e) => setValue("brandDescription", e.target.value)}
                    className="bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/20 min-h-[100px] text-sm resize-none rounded-xl focus:ring-indigo-500/30 focus:border-indigo-500/50"
                  />
                  <div className="text-right">
                    <span className="text-xs text-white/20">
                      {brandDescription.length} {brandDescription.length < 20 && "/ 20 min"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center">What personality should your videos have?</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BRAND_PERSONALITIES.map((personality) => (
                  <OptionButton key={personality.value} selected={brandPersonality === personality.value} onClick={() => setValue("brandPersonality", personality.value)}>
                    {personality.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 relative z-10">
        <div className="max-w-xl mx-auto flex gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex-1 h-12 text-sm font-medium border border-white/10 text-white/60 hover:bg-white/5 rounded-full bg-transparent"
            >
              Back
            </Button>
          )}
          {step < STEPS ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className={cn(
                "flex-1 h-12 text-sm font-medium rounded-full transition-all",
                step === 1 ? "w-full" : "",
                canProceed()
                  ? "bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              )}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed()}
              className={cn(
                "flex-1 h-12 text-sm font-medium rounded-full transition-all",
                canProceed()
                  ? "bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              )}
            >
              Create content plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
