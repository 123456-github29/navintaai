import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SparklesIcon, VideoCameraIcon, CalendarIcon, PencilSquareIcon, ArrowRightIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const ACCESS_CODE = "navintaai";
const STORAGE_KEY = "navinta_access_granted";

export default function Login() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setHasAccess(stored === "true");
  }, []);

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.toLowerCase().trim() === ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, "true");
      setHasAccess(true);
      setError("");
    } else {
      setError("Invalid access code");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-12" style={{ animation: "fade-in-up 0.4s ease-out" }}>
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gray-50 border border-gray-200">
              <LockClosedIcon className="w-7 h-7 text-[#666666]" />
            </div>
            <div className="space-y-2">
              <span className="text-[#111111] text-2xl font-bold block tracking-tight">Navinta AI</span>
              <h1 className="text-xl font-medium text-[#111111]">Private Beta Access</h1>
              <p className="text-[#666666] text-base">Enter your access code to continue</p>
            </div>
          </div>
          <form onSubmit={handleAccessSubmit} className="space-y-4">
            <div className={isShaking ? "animate-shake" : ""}>
              <Input
                type="text"
                placeholder="Enter access code"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                className="h-12 bg-white border-gray-200 text-[#111111] placeholder:text-[#9CA3AF] text-center text-sm tracking-widest uppercase focus:border-[#111111] focus:ring-[#111111] rounded-full shadow-sm"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full h-12 vyro-btn-primary font-medium text-sm">
              <span>Continue</span>
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </form>
          <div className="text-center">
            <Link href="/">
              <span className="text-sm text-[#666666] hover:text-[#111111] cursor-pointer">Back to home</span>
            </Link>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>AI-powered video production</span>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake { animation: shake 0.5s ease-in-out; }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  const features = [
    {
      icon: SparklesIcon,
      title: "AI Content Planning",
      description: "Get personalized video ideas tailored to your brand"
    },
    {
      icon: VideoCameraIcon,
      title: "Director Mode",
      description: "Shot-by-shot guidance for professional recordings"
    },
    {
      icon: PencilSquareIcon,
      title: "Smart Editing",
      description: "AI-powered captions and automated editing"
    },
    {
      icon: CalendarIcon,
      title: "Content Calendar",
      description: "Plan and schedule your content weeks ahead"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, rgba(0,0,0,0.02) 0%, transparent 50%),
                           radial-gradient(circle at 70% 80%, rgba(0,0,0,0.02) 0%, transparent 50%)`
        }} />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="space-y-8">
            <div>
              <span className="text-[#111111] text-3xl font-bold tracking-tight">Navinta AI</span>
              <p className="text-[#666666] text-lg mt-2">
                Create professional videos with AI-powered guidance
              </p>
            </div>
            
            <div className="grid gap-5">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="flex items-start gap-4 p-4 rounded-3xl bg-white/60 border border-gray-100 backdrop-blur-sm"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-[#111111]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#111111]">{feature.title}</h3>
                    <p className="text-sm text-[#666666] mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-[#111111] to-[#444444] border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#666666]">
                <span className="font-semibold text-[#111111]">500+</span> creators already using Navinta AI
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-sm space-y-10">
          <div className="lg:hidden text-center mb-8">
            <span className="text-[#111111] text-2xl font-bold tracking-tight">Navinta AI</span>
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#111111]">
              Welcome back
            </h1>
            <p className="text-[#666666]">
              Sign in to continue creating amazing videos
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full h-14 bg-[#111111] hover:opacity-90 text-white rounded-full font-medium text-sm shadow-sm hover:shadow-md transition-opacity flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="text-center space-y-4">
            <p className="text-xs text-[#666666] leading-relaxed">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-[#111111] font-medium hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-[#111111] font-medium hover:underline">Privacy Policy</a>
            </p>
          </div>

          <div className="pt-8 flex items-center justify-center gap-2 text-[#666666]/60 text-xs">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>AI-powered video production</span>
          </div>
        </div>
      </div>
    </div>
  );
}
