import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  PlayCircleIcon,
  PencilSquareIcon,
  CalendarIcon,
  CheckCircleIcon,
  VideoCameraIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Link } from "wouter";
import { gsap } from "gsap";

import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Post, ContentPlan } from "@shared/schema";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: contentPlan, isLoading: planLoading } = useQuery<ContentPlan | null>({
    queryKey: ["/api/content-plan"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: posts, isLoading: postsLoading } = useQuery<Post[] | null>({
    queryKey: ["/api/posts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || planLoading || postsLoading) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" });
      }
      if (statsRef.current) {
        gsap.from(statsRef.current.children, { y: 20, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", delay: 0.15 });
      }
      if (contentRef.current) {
        gsap.from(contentRef.current, { y: 20, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.3 });
      }
    });
    return () => ctx.revert();
  }, [planLoading, postsLoading]);

  if (!isAuthenticated || planLoading || postsLoading) {
    return (
      <div className="p-8 lg:p-12 min-h-screen" style={{ background: "#050505" }}>
        <div className="max-w-[1400px] mx-auto space-y-8">
          <Skeleton className="h-10 w-48 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.03]" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-52 rounded-2xl bg-white/[0.03]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!contentPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] p-8" style={{ background: "#050505" }}>
        <div className="text-center space-y-10 max-w-sm">
          <div className="space-y-6">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <SparklesIcon className="h-9 w-9 text-indigo-400" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to Navinta AI</h1>
              <p className="text-sm text-white/35 leading-relaxed">
                Create your personalized content plan to start producing professional videos.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button size="lg" className="h-13 px-10 text-sm font-semibold bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.12)] rounded-full transition-all" data-testid="button-create-plan">
              Create Content Plan
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const allPosts = posts || [];
  const scheduledPosts = allPosts.filter(p => p.status === "scheduled");
  const completedPosts = allPosts.filter(p => p.status === "completed");
  const inProgressPosts = allPosts.filter(p => !["scheduled", "completed"].includes(p.status as string));
  const completedCount = completedPosts.length;
  const scheduledCount = scheduledPosts.length;
  const recordingCount = allPosts.filter(p => p.status === "recording").length;
  const plannedCount = allPosts.filter(p => p.status === "planned").length;

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Header */}
        <div ref={headerRef} className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Your Studio</h1>
            <p className="text-sm text-white/30 mt-1">Manage your video content</p>
          </div>
          <Link href="/onboarding">
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-black bg-white rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.12)] transition-all"
              data-testid="button-new-plan"
            >
              <PlusIcon className="h-4 w-4" />
              New Plan
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<VideoCameraIcon className="h-4 w-4" />} value={allPosts.length} label="Total" />
          <StatCard icon={<CheckCircleIcon className="h-4 w-4" />} value={completedCount} label="Completed" accent="emerald" />
          <StatCard icon={<CalendarIcon className="h-4 w-4" />} value={scheduledCount} label="Scheduled" accent="indigo" />
          <StatCard icon={<ClockIcon className="h-4 w-4" />} value={plannedCount + recordingCount} label="In Progress" accent="amber" />
        </div>

        {/* Video sections */}
        <div ref={contentRef} className="space-y-10">

          {/* Scheduled Videos */}
          {scheduledPosts.length > 0 && (
            <VideoSection title="Scheduled" subtitle={`${scheduledPosts.length} videos`} posts={scheduledPosts} />
          )}

          {/* In Progress */}
          {inProgressPosts.length > 0 && (
            <VideoSection title="In Progress" subtitle={`${inProgressPosts.length} videos`} posts={inProgressPosts} />
          )}

          {/* Completed Videos */}
          {completedPosts.length > 0 && (
            <VideoSection title="Completed" subtitle={`${completedPosts.length} videos`} posts={completedPosts} />
          )}

          {/* Empty state */}
          {allPosts.length === 0 && (
            <div className="border border-dashed border-white/8 rounded-2xl py-20 flex flex-col items-center justify-center text-center">
              <VideoCameraIcon className="h-12 w-12 text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-1">No videos yet</p>
              <p className="text-white/15 text-xs">Create a content plan to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoSection({ title, subtitle, posts }: { title: string; subtitle: string; posts: Post[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="text-xs text-white/25 font-medium bg-white/[0.04] px-2.5 py-1 rounded-full">{subtitle}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent?: "emerald" | "indigo" | "amber";
}) {
  const colors = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
    indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
  };
  const c = accent ? colors[accent] : { bg: "bg-white/5", border: "border-white/8", text: "text-white/50" };

  return (
    <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
      <div className={`h-8 w-8 rounded-lg ${c.bg} ${c.text} border ${c.border} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-white/25 font-medium mt-0.5">{label}</div>
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const statusConfig = {
    planned: { icon: CalendarIcon, label: "Planned", badgeClass: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" },
    recording: { icon: PlayCircleIcon, label: "Recording", badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
    editing: { icon: PencilSquareIcon, label: "Editing", badgeClass: "bg-white/5 text-white/40 border border-white/10" },
    completed: { icon: CheckCircleIcon, label: "Completed", badgeClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
    scheduled: { icon: CalendarIcon, label: "Scheduled", badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  };

  const config = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.planned;
  const StatusIcon = config.icon;

  return (
    <Link href={`/post/${post.id}`}>
      <div
        className="group cursor-pointer bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5 h-full hover:border-white/12 hover:bg-white/[0.04] transition-all duration-400"
        data-testid={`card-post-${post.id}`}
      >
        <div className="flex flex-col gap-3.5 h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/25">Day {post.dayNumber}</span>
            <span className={`inline-flex items-center gap-1.5 text-[0.65rem] font-semibold px-2.5 py-1 rounded-full ${config.badgeClass}`}>
              <StatusIcon className="h-3 w-3 shrink-0" /> {config.label}
            </span>
          </div>

          <h4 className="text-[0.95rem] font-semibold leading-snug text-white line-clamp-2 group-hover:text-white/90 transition-colors">
            {post.title}
          </h4>

          <p className="text-xs text-white/25 leading-relaxed line-clamp-2 flex-grow">
            {post.concept}
          </p>

          <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.04] text-xs text-white/25 font-medium">
            <span>{post.shotList.length} shots</span>
            <span className="font-semibold text-white/40">{post.platform}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
