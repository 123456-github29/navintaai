import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Instagram, Youtube, Facebook } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { format, addDays } from "date-fns";
import type { Post } from "@shared/schema";

export default function Schedule() {
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const scheduledPosts = posts?.filter((p) => p.status === "scheduled" || p.scheduledFor) || [];
  const upcomingDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 min-h-screen" style={{ background: "#050505" }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48 bg-white/5 rounded-xl" />
          <Skeleton className="h-32 bg-white/[0.03] rounded-2xl" />
          <Skeleton className="h-96 bg-white/[0.03] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Schedule</h1>
            <p className="text-sm text-white/30 mt-1">Plan and schedule your social media posts</p>
          </div>
          <span className="text-xs font-medium text-white/40 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06]">
            {scheduledPosts.length} scheduled
          </span>
        </div>

        {/* Connect platforms banner */}
        <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-indigo-400">Scheduling Demo</h2>
          </div>
          <p className="text-sm text-white/30 mb-4">Real social media integration will be added in the next phase.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" disabled className="border-white/10 text-white/30 bg-transparent rounded-xl">
              <Instagram className="h-4 w-4 mr-2" /> Connect Instagram
            </Button>
            <Button variant="outline" size="sm" disabled className="border-white/10 text-white/30 bg-transparent rounded-xl">
              <SiTiktok className="h-4 w-4 mr-2" /> Connect TikTok
            </Button>
            <Button variant="outline" size="sm" disabled className="border-white/10 text-white/30 bg-transparent rounded-xl">
              <Youtube className="h-4 w-4 mr-2" /> Connect YouTube
            </Button>
            <Button variant="outline" size="sm" disabled className="border-white/10 text-white/30 bg-transparent rounded-xl">
              <Facebook className="h-4 w-4 mr-2" /> Connect Facebook
            </Button>
          </div>
        </div>

        {/* Upcoming Week */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Upcoming Week</h2>
          <div className="grid grid-cols-1 gap-4">
            {upcomingDays.map((day, index) => (
              <div key={day.toISOString()} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] overflow-hidden" data-testid={`day-${index}`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{format(day, "EEEE, MMMM d")}</h3>
                    <p className="text-xs text-white/25">{index === 0 ? "Today" : index === 1 ? "Tomorrow" : format(day, "yyyy")}</p>
                  </div>
                  {index < 3 && (
                    <span className="text-xs font-medium text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                      {Math.floor(Math.random() * 3) + 1} posts
                    </span>
                  )}
                </div>
                <div className="p-4">
                  {index < 3 ? (
                    <div className="space-y-3">
                      {Array.from({ length: Math.floor(Math.random() * 2) + 1 }).map((_, i) => (
                        <ScheduledPostCard key={i} dayIndex={index} postIndex={i} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/20 py-4 text-center">No posts scheduled</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduledPostCard({ dayIndex, postIndex }: { dayIndex: number; postIndex: number }) {
  const platforms = ["Instagram Reels", "TikTok", "YouTube Shorts"];
  const times = ["9:00 AM", "2:00 PM", "6:00 PM"];
  const platformIcons: Record<string, any> = {
    "Instagram Reels": Instagram,
    "TikTok": SiTiktok,
    "YouTube Shorts": Youtube,
  };

  const platform = platforms[postIndex % platforms.length];
  const time = times[postIndex % times.length];
  const Icon = platformIcons[platform];

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors" data-testid={`scheduled-post-${dayIndex}-${postIndex}`}>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white/70 text-sm">Example Post Title</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3 text-white/25" />
            <span className="text-xs text-white/25">{time}</span>
          </div>
        </div>
      </div>
      <span className="text-xs font-medium text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">{platform}</span>
    </div>
  );
}
