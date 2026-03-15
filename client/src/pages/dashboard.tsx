import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import { Link } from "wouter";

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

  if (!isAuthenticated || planLoading || postsLoading) {
    return (
      <div className="p-8 lg:p-12 min-h-screen bg-[#0a0a0a]">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <Skeleton className="h-10 w-48 bg-white/5 rounded-xl" />
                <Skeleton className="h-5 w-64 bg-white/5 rounded-xl" />
              </div>
              <Skeleton className="h-14 w-full rounded-full bg-white/5" />
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl bg-white/5" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contentPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] p-8 bg-[#0a0a0a]">
        <div className="text-center space-y-12 max-w-sm">
          <div className="space-y-8">
            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
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
  const groupedPosts = groupPostsByWeek(allPosts);
  const completedCount = allPosts.filter(p => p.status === "completed").length;
  const recordingCount = allPosts.filter(p => p.status === "recording").length;
  const plannedCount = allPosts.filter(p => p.status === "planned").length;

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a]">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

          <div className="space-y-8">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[2rem] font-bold text-white mb-2">Your Studio</h1>
                <p className="text-[0.95rem] text-white/40">4-week content calendar</p>
              </div>
              <div className="flex gap-3">
                <Link href="/onboarding">
                  <button
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[0.9rem] font-medium text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/15 transition-all"
                    data-testid="button-new-plan"
                  >
                    <PlusIcon className="h-4 w-4" />
                    New Plan
                  </button>
                </Link>
              </div>
            </div>

            {contentPlan && (
              <div className="flex items-center justify-between px-6 py-4 bg-white/[0.03] border border-white/8 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[0.9rem] font-semibold text-white block">Plan Overview</span>
                    <span className="text-[0.8rem] text-white/30">
                      {contentPlan.platforms.join(", ")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {contentPlan.contentGoals.slice(0, 3).map((goal) => (
                    <span key={goal} className="px-3 py-1 text-[0.7rem] font-semibold bg-white/5 text-white/50 rounded-full border border-white/8">
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-10">
              {[1, 2, 3, 4].map((weekNum) => (
                <div key={weekNum}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[1.1rem] font-semibold text-white">Week {weekNum}</h3>
                    <span className="text-[0.8rem] text-white/30">
                      {groupedPosts[weekNum]?.length || 0} posts
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {groupedPosts[weekNum]?.map((post, postIndex) => (
                      <PostCard key={post.id} post={post} index={postIndex} />
                    ))}
                    {(!groupedPosts[weekNum] || groupedPosts[weekNum].length === 0) && (
                      <div className="border border-dashed border-white/8 bg-white/[0.01] rounded-2xl h-56 flex flex-col items-center justify-center text-center">
                        <CalendarIcon className="h-10 w-10 text-white/10 mb-3" />
                        <p className="text-sm text-white/20">No posts scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<VideoCameraIcon className="h-4 w-4" />}
                value={allPosts.length}
                label="Total Posts"
              />
              <StatCard
                icon={<CheckCircleIcon className="h-4 w-4" />}
                value={completedCount}
                label="Completed"
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-400"
                iconBorder="border-emerald-500/20"
              />
              <StatCard
                icon={<PlayCircleIcon className="h-4 w-4" />}
                value={recordingCount}
                label="Recording"
                iconBg="bg-amber-500/10"
                iconColor="text-amber-400"
                iconBorder="border-amber-500/20"
              />
              <StatCard
                icon={<ClockIcon className="h-4 w-4" />}
                value={plannedCount}
                label="Planned"
                iconBg="bg-indigo-500/10"
                iconColor="text-indigo-400"
                iconBorder="border-indigo-500/20"
              />
            </div>

            <PlanWidget subscription={subscription} isLoading={subscriptionLoading} error={subscriptionError} />
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  iconBg = "bg-white/5",
  iconColor = "text-white/50",
  iconBorder = "border-white/8",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  iconBg?: string;
  iconColor?: string;
  iconBorder?: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 transition-all duration-300 hover:border-white/12 hover:bg-white/[0.04]">
      <div className={`h-8 w-8 rounded-lg ${iconBg} ${iconColor} border ${iconBorder} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-[1.75rem] font-bold text-white">{value}</div>
      <div className="text-[0.8rem] text-white/30 font-medium">{label}</div>
    </div>
  );
}

function PlanWidget({ subscription, isLoading, error }: { subscription: SubscriptionData | null | undefined; isLoading: boolean; error: Error | null }) {
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const { session } = useAuth();

  const handleManageBilling = async () => {
    setBillingPortalLoading(true);
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
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to open billing portal:", err);
    } finally {
      setBillingPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-lg bg-white/5" />
          <Skeleton className="h-5 w-32 bg-white/5 rounded" />
        </div>
        <div className="space-y-4 mb-6">
          <Skeleton className="h-4 w-full bg-white/5 rounded" />
          <Skeleton className="h-4 w-3/4 bg-white/5 rounded" />
        </div>
        <Skeleton className="h-10 w-full rounded-full bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">Plan Status Unavailable</div>
          </div>
        </div>
        <Link href="/pricing">
          <button className="w-full py-3 text-sm font-medium bg-indigo-500 text-white rounded-full hover:bg-indigo-400 transition-colors">
            View Plans
          </button>
        </Link>
      </div>
    );
  }

  const plan = subscription?.plan || "free";
  const planLabels: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro", studio: "Studio" };
  const planName = planLabels[plan] || "Free";
  const isPaid = plan !== "free";
  const exportsText = subscription?.maxExports === -1
    ? "Unlimited"
    : `${subscription?.exportsUsedToday || 0}/${subscription?.maxExports || 3}`;

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-white flex items-center gap-2">
            Your Plan
            <span className="text-[0.7rem] font-semibold border border-indigo-500/30 text-indigo-400 px-1.5 py-0.5 rounded">
              {planName}
            </span>
            {subscription?.status === "active" && isPaid && !subscription?.cancelAtPeriodEnd && (
              <span className="text-[0.7rem] font-semibold border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-[0.9rem]">
          <span className="text-white/30">Exports today:</span>
          <span className="font-semibold text-white">{exportsText}</span>
        </div>
        <div className="flex gap-4">
          {subscription?.aiBroll && (
            <span className="text-[0.8rem] font-medium text-emerald-400 flex items-center gap-1">
              <BoltIcon className="h-3.5 w-3.5" /> AI B-roll
            </span>
          )}
          {subscription?.aiVoice && (
            <span className="text-[0.8rem] font-medium text-indigo-400 flex items-center gap-1">
              <SparklesIcon className="h-3.5 w-3.5" /> AI Voice
            </span>
          )}
          {!subscription?.aiBroll && !subscription?.aiVoice && (
            <span className="text-[0.8rem] text-white/30">Basic features</span>
          )}
        </div>
        {subscription?.cancelAtPeriodEnd && (
          <div className="text-[0.8rem] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
            Cancels {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "at period end"}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {plan !== "studio" && (
          <Link href="/pricing">
            <button className="w-full py-3 text-sm font-semibold bg-white text-black rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
              Upgrade
            </button>
          </Link>
        )}
        {isPaid && subscription?.stripeCustomerId && (
          <button
            onClick={handleManageBilling}
            disabled={billingPortalLoading}
            className="w-full py-3 text-sm font-medium text-white/70 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {billingPortalLoading ? "Opening..." : "Manage Billing"}
          </button>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const statusConfig = {
    planned: { icon: CalendarIcon, label: "Planned", badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" },
    recording: { icon: PlayCircleIcon, label: "Recording", badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
    editing: { icon: PencilSquareIcon, label: "Editing", badgeClass: "bg-white/5 text-white/50 border border-white/10" },
    completed: { icon: CheckCircleIcon, label: "Completed", badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
    scheduled: { icon: CalendarIcon, label: "Scheduled", badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" },
  };

  const config = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.planned;
  const StatusIcon = config.icon;

  return (
    <Link href={`/post/${post.id}`}>
      <div
        className="group cursor-pointer bg-white/[0.03] border border-white/8 rounded-2xl p-6 h-full hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300"
        data-testid={`card-post-${post.id}`}
      >
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between">
            <span className="text-[0.85rem] font-medium text-white/30">
              Day {post.dayNumber}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full ${config.badgeClass}`}>
              <StatusIcon className="h-3 w-3 shrink-0" /> {config.label}
            </span>
          </div>

          <h4 className="text-[1.05rem] font-semibold leading-snug text-white line-clamp-2 group-hover:text-white/90 transition-colors">
            {post.title}
          </h4>

          <p className="text-[0.85rem] text-white/30 leading-relaxed line-clamp-2 flex-grow">
            {post.concept}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[0.8rem] text-white/30 font-medium">
            <span>{post.shotList.length} shots</span>
            <span className="font-semibold text-white/60">{post.platform}</span>
          </div>
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
