import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  PlayCircleIcon,
  PencilSquareIcon,
  CalendarIcon,
  CheckCircleIcon,
  VideoCameraIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  SparklesIcon,
  CreditCardIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { Link } from "wouter";
import { gsap } from "gsap";

import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Post, ContentPlan } from "@shared/schema";

interface SubscriptionData {
  plan: string;
  status: string;
  watermarkRequired: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  maxExports: number;
  exportsUsedToday: number;
  exportAllowed: boolean;
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: "monthly" | "yearly" | null;
}

interface DebugData {
  userId: string;
  projectCount: number;
  projects: Array<{ id: string; name: string; userId: string }>;
  planCount: number;
  postCount: number;
}

export default function Dashboard() {
  const { isAuthenticated, session, user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: debugData } = useQuery<DebugData | null>({
    queryKey: ["/api/debug/user-data"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: contentPlan, isLoading: planLoading, error: planError, refetch: refetchPlan } = useQuery<ContentPlan | null>({
    queryKey: ["/api/content-plan"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: posts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useQuery<Post[] | null>({
    queryKey: ["/api/posts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<SubscriptionData | null>({
    queryKey: ["/api/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.from(".dash-card", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power3.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [planLoading, postsLoading]);

  if (!isAuthenticated || planLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-[#060606]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <Skeleton className="h-10 w-64 bg-white/5 rounded-xl mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-80 rounded-2xl bg-white/[0.03] lg:col-span-2" />
            <Skeleton className="h-80 rounded-2xl bg-white/[0.03]" />
          </div>
        </div>
      </div>
    );
  }

  if (!contentPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] p-8 bg-[#060606]">
        <div className="text-center space-y-12 max-w-sm">
          <div className="space-y-8">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
              <SparklesIcon className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to Navinta AI</h1>
              <p className="text-sm text-white/40 leading-relaxed">
                Create your personalized content plan to start producing professional videos.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button size="lg" className="h-12 px-8 text-sm font-semibold bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] rounded-full transition-all" data-testid="button-create-plan">
              Create Content Plan
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allPosts = posts || [];
  const completedCount = allPosts.filter(p => p.status === "completed").length;
  const recordingCount = allPosts.filter(p => p.status === "recording").length;
  const plannedCount = allPosts.filter(p => p.status === "planned").length;
  const editingCount = allPosts.filter(p => p.status === "editing").length;
  const totalProgress = allPosts.length > 0 ? Math.round((completedCount / allPosts.length) * 100) : 0;

  const recentPosts = allPosts.slice(0, 6);
  const nextUp = allPosts.find(p => p.status === "planned" || p.status === "recording");

  const plan = subscription?.plan || "free";
  const planLabels: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro", studio: "Studio" };
  const planName = planLabels[plan] || "Free";
  const exportsText = subscription?.maxExports === -1
    ? "Unlimited"
    : `${subscription?.exportsUsedToday || 0} / ${subscription?.maxExports || 3}`;

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Creator";

  return (
    <div ref={containerRef} className="min-h-screen bg-[#060606]">
      {/* Top header */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-8 pb-2">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm text-white/30 mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">{firstName}</h1>
          </div>
          <Link href="/onboarding">
            <button
              className="dash-card inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black bg-white rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all"
              data-testid="button-new-plan"
            >
              <PlusIcon className="h-4 w-4" />
              New Plan
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-12">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="dash-card rounded-2xl bg-white/[0.03] p-5 group hover:bg-white/[0.05] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <VideoCameraIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs text-white/20 font-medium">Total</span>
            </div>
            <div className="text-2xl font-bold text-white">{allPosts.length}</div>
            <div className="text-xs text-white/30 mt-1">Videos</div>
          </div>
          <div className="dash-card rounded-2xl bg-white/[0.03] p-5 group hover:bg-white/[0.05] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircleIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs text-white/20 font-medium">Done</span>
            </div>
            <div className="text-2xl font-bold text-white">{completedCount}</div>
            <div className="text-xs text-white/30 mt-1">Completed</div>
          </div>
          <div className="dash-card rounded-2xl bg-white/[0.03] p-5 group hover:bg-white/[0.05] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <PlayCircleIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs text-white/20 font-medium">Active</span>
            </div>
            <div className="text-2xl font-bold text-white">{recordingCount}</div>
            <div className="text-xs text-white/30 mt-1">Recording</div>
          </div>
          <div className="dash-card rounded-2xl bg-white/[0.03] p-5 group hover:bg-white/[0.05] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="h-9 w-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <ClockIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs text-white/20 font-medium">Queue</span>
            </div>
            <div className="text-2xl font-bold text-white">{plannedCount}</div>
            <div className="text-xs text-white/30 mt-1">Planned</div>
          </div>
        </div>

        {/* Bento grid - main content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Progress + Plan overview - spans 8 cols */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Progress ring card */}
            <div className="dash-card rounded-2xl bg-white/[0.03] p-6 flex flex-col items-center justify-center hover:bg-white/[0.05] transition-all duration-300">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${totalProgress * 3.27} ${327 - totalProgress * 3.27}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{totalProgress}%</span>
                  <span className="text-xs text-white/30">complete</span>
                </div>
              </div>
              <p className="text-sm text-white/50 text-center">
                {completedCount} of {allPosts.length} videos done
              </p>
            </div>

            {/* Plan details card */}
            <div className="dash-card rounded-2xl bg-white/[0.03] p-6 hover:bg-white/[0.05] transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Content Plan</h3>
                  <p className="text-xs text-white/30">4-week schedule</p>
                </div>
              </div>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Platforms</span>
                  <span className="text-white/70 font-medium">{contentPlan.platforms.join(", ")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Goals</span>
                  <span className="text-white/70 font-medium text-right max-w-[60%] truncate">{contentPlan.contentGoals.slice(0, 2).join(", ")}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {contentPlan.contentGoals.slice(0, 3).map((goal) => (
                  <span key={goal} className="px-2.5 py-1 text-[0.65rem] font-medium bg-white/[0.05] text-white/40 rounded-full">
                    {goal}
                  </span>
                ))}
              </div>
            </div>

            {/* Next up card - full width within this sub-grid */}
            {nextUp && (
              <div className="dash-card sm:col-span-2 rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.04] p-6 hover:from-indigo-500/[0.12] hover:to-violet-500/[0.06] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BoltIcon className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Next up</span>
                  </div>
                  <span className="text-xs text-white/30">Day {nextUp.dayNumber}</span>
                </div>
                <Link href={`/post/${nextUp.id}`}>
                  <h3 className="text-lg font-semibold text-white mb-2 hover:text-white/80 transition-colors cursor-pointer flex items-center gap-2">
                    {nextUp.title}
                    <ArrowUpRightIcon className="h-4 w-4 text-white/30" />
                  </h3>
                </Link>
                <p className="text-sm text-white/30 line-clamp-2 mb-4">{nextUp.concept}</p>
                <div className="flex items-center gap-4 text-xs text-white/30">
                  <span>{nextUp.shotList.length} shots</span>
                  <span className="text-white/50 font-medium">{nextUp.platform}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right column - Subscription + Exports */}
          <div className="lg:col-span-4 space-y-4">
            {/* Subscription card */}
            <div className="dash-card rounded-2xl bg-white/[0.03] p-6 hover:bg-white/[0.05] transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <CreditCardIcon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Plan</h3>
                    <span className="text-xs font-semibold text-indigo-400">{planName}</span>
                  </div>
                </div>
                {subscription?.status === "active" && plan !== "free" && !subscription?.cancelAtPeriodEnd && (
                  <span className="text-[0.65rem] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Exports today</span>
                  <span className="font-semibold text-white">{exportsText}</span>
                </div>
                <div className="flex gap-3">
                  {subscription?.aiBroll && (
                    <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                      <BoltIcon className="h-3 w-3" /> AI B-roll
                    </span>
                  )}
                  {subscription?.aiVoice && (
                    <span className="text-xs font-medium text-indigo-400 flex items-center gap-1">
                      <SparklesIcon className="h-3 w-3" /> AI Voice
                    </span>
                  )}
                  {!subscription?.aiBroll && !subscription?.aiVoice && (
                    <span className="text-xs text-white/30">Basic features</span>
                  )}
                </div>
                {subscription?.cancelAtPeriodEnd && (
                  <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                    Cancels {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "at period end"}
                  </div>
                )}
              </div>

              {plan !== "studio" && (
                <Link href="/pricing">
                  <button className="w-full py-2.5 text-sm font-semibold bg-white text-black rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                    Upgrade
                  </button>
                </Link>
              )}
            </div>

            {/* Quick actions */}
            <div className="dash-card rounded-2xl bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-all duration-300">
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="space-y-1">
                <Link href="/onboarding">
                  <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all">
                    <span className="flex items-center gap-2.5">
                      <PlusIcon className="h-4 w-4 text-indigo-400" />
                      New content plan
                    </span>
                    <ChevronRightIcon className="h-3.5 w-3.5 text-white/20" />
                  </button>
                </Link>
                {subscription?.stripeCustomerId && (
                  <BillingButton session={session} />
                )}
              </div>
            </div>
          </div>

          {/* All posts - full width below */}
          <div className="lg:col-span-12 dash-card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">All Videos</h2>
              <span className="text-xs text-white/30">{allPosts.length} total</span>
            </div>
            {allPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {allPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/[0.02] h-48 flex flex-col items-center justify-center text-center">
                <CalendarIcon className="h-10 w-10 text-white/10 mb-3" />
                <p className="text-sm text-white/20">No posts yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingButton({ session }: { session: any }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ returnUrl: "/dashboard" }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Failed to open billing portal:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50"
    >
      <span className="flex items-center gap-2.5">
        <CreditCardIcon className="h-4 w-4 text-white/40" />
        {loading ? "Opening..." : "Manage billing"}
      </span>
      <ChevronRightIcon className="h-3.5 w-3.5 text-white/20" />
    </button>
  );
}

function PostCard({ post }: { post: Post }) {
  const statusConfig = {
    planned: { icon: CalendarIcon, label: "Planned", color: "text-indigo-400", bg: "bg-indigo-500/10" },
    recording: { icon: PlayCircleIcon, label: "Recording", color: "text-amber-400", bg: "bg-amber-500/10" },
    editing: { icon: PencilSquareIcon, label: "Editing", color: "text-white/50", bg: "bg-white/[0.06]" },
    completed: { icon: CheckCircleIcon, label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    scheduled: { icon: CalendarIcon, label: "Scheduled", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  };

  const config = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.planned;
  const StatusIcon = config.icon;

  return (
    <Link href={`/post/${post.id}`}>
      <div
        className="group cursor-pointer rounded-2xl bg-white/[0.03] p-5 h-full hover:bg-white/[0.06] transition-all duration-300"
        data-testid={`card-post-${post.id}`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/25">Day {post.dayNumber}</span>
          <span className={`inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            <StatusIcon className="h-3 w-3" /> {config.label}
          </span>
        </div>

        <h4 className="text-sm font-semibold leading-snug text-white line-clamp-2 mb-2 group-hover:text-white/90 transition-colors">
          {post.title}
        </h4>

        <p className="text-xs text-white/25 leading-relaxed line-clamp-2 mb-4">
          {post.concept}
        </p>

        <div className="flex items-center justify-between text-xs text-white/25 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span>{post.shotList.length} shots</span>
          <span className="font-medium text-white/40">{post.platform}</span>
        </div>
      </div>
    </Link>
  );
}

function groupPostsByWeek(posts: Post[]): Record<number, Post[]> {
  return posts.reduce((acc, post) => {
    if (!acc[post.weekNumber]) {
      acc[post.weekNumber] = [];
    }
    acc[post.weekNumber].push(post);
    return acc;
  }, {} as Record<number, Post[]>);
}
