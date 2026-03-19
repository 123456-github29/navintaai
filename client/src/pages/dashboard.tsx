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
      <div className="p-8 lg:p-12 min-h-screen" style={{ background: "#0d0d0d" }}>
        <div className="max-w-[1400px] mx-auto space-y-8">
          <Skeleton className="h-10 w-48 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-52 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!contentPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] p-8" style={{ background: "#0d0d0d" }}>
        <div className="text-center space-y-10 max-w-sm">
          <div className="space-y-6">
            <div className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <SparklesIcon className="h-9 w-9" style={{ color: "rgba(255,255,255,0.5)" }} />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#ffffff" }}>Welcome to Navinta AI</h1>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Create your personalized content plan to start producing professional videos.
              </p>
            </div>
          </div>
          <Link href="/onboarding">
            <Button
              size="lg"
              className="h-12 px-10 text-sm font-semibold rounded-lg transition-all hover:opacity-90"
              style={{ background: "#ffffff", color: "#0d0d0d" }}
              data-testid="button-create-plan"
            >
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
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#0d0d0d" }}>
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Header */}
        <div ref={headerRef} className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#ffffff" }}>Your Studio</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Manage your video content</p>
          </div>
          <Link href="/onboarding">
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all hover:opacity-90"
              style={{ background: "#ffffff", color: "#0d0d0d" }}
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
          <StatCard icon={<CalendarIcon className="h-4 w-4" />} value={scheduledCount} label="Scheduled" accent="blue" />
          <StatCard icon={<ClockIcon className="h-4 w-4" />} value={plannedCount + recordingCount} label="In Progress" accent="amber" />
        </div>

        {/* Video sections */}
        <div ref={contentRef} className="space-y-10">

          {scheduledPosts.length > 0 && (
            <VideoSection title="Scheduled" subtitle={`${scheduledPosts.length} videos`} posts={scheduledPosts} />
          )}

          {inProgressPosts.length > 0 && (
            <VideoSection title="In Progress" subtitle={`${inProgressPosts.length} videos`} posts={inProgressPosts} />
          )}

          {completedPosts.length > 0 && (
            <VideoSection title="Completed" subtitle={`${completedPosts.length} videos`} posts={completedPosts} />
          )}

          {allPosts.length === 0 && (
            <div className="border border-dashed rounded-xl py-20 flex flex-col items-center justify-center text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <VideoCameraIcon className="h-12 w-12 mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>No videos yet</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Create a content plan to get started</p>
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
          <h3 className="text-lg font-semibold" style={{ color: "#ffffff" }}>{title}</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>{subtitle}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
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
  accent?: "emerald" | "blue" | "amber";
}) {
  return (
    <div className="rounded-xl p-5 transition-all duration-200" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {icon}
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: "#ffffff" }}>{value}</div>
      <div className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const statusConfig = {
    planned: { icon: CalendarIcon, label: "Planned", bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.06)" },
    recording: { icon: PlayCircleIcon, label: "Recording", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.1)" },
    editing: { icon: PencilSquareIcon, label: "Editing", bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "rgba(255,255,255,0.06)" },
    completed: { icon: CheckCircleIcon, label: "Completed", bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", border: "rgba(255,255,255,0.12)" },
    scheduled: { icon: CalendarIcon, label: "Scheduled", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "rgba(255,255,255,0.08)" },
  };

  const config = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.planned;
  const StatusIcon = config.icon;

  return (
    <Link href={`/post/${post.id}`}>
      <div
        className="group cursor-pointer rounded-xl p-5 h-full transition-all duration-200"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        data-testid={`card-post-${post.id}`}
      >
        <div className="flex flex-col gap-3.5 h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>Day {post.dayNumber}</span>
            <span
              className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
            >
              <StatusIcon className="h-3 w-3 shrink-0" /> {config.label}
            </span>
          </div>

          <h4 className="text-[0.95rem] font-semibold leading-snug line-clamp-2 group-hover:opacity-80 transition-opacity" style={{ color: "#ffffff" }}>
            {post.title}
          </h4>

          <p className="text-xs leading-relaxed line-clamp-2 flex-grow" style={{ color: "rgba(255,255,255,0.5)" }}>
            {post.concept}
          </p>

          <div className="flex items-center justify-between pt-3.5 text-xs font-medium" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}>
            <span>{post.shotList.length} shots</span>
            <span className="font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{post.platform}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
