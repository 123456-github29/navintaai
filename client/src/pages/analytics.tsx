import { BarChart3, TrendingUp, Eye, Heart, Share2, MessageCircle } from "lucide-react";

export default function Analytics() {
  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-sm text-white/30 mt-1">Track your content performance</p>
        </div>

        {/* Coming Soon Banner */}
        <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-6">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-indigo-400">Analytics Coming Soon</h2>
          </div>
          <p className="text-sm text-white/30">
            Performance tracking and insights will be available after connecting your social media accounts.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Views" value="2,847" change="+12.3%" icon={Eye} accent="blue" />
          <StatCard title="Engagement" value="428" change="+8.1%" icon={Heart} accent="pink" />
          <StatCard title="Shares" value="156" change="+23.5%" icon={Share2} accent="emerald" />
          <StatCard title="Comments" value="89" change="+15.2%" icon={MessageCircle} accent="purple" />
        </div>

        {/* Top Posts */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Top Performing Posts</h3>
          <p className="text-sm text-white/25 mb-6">Your best content from the past 30 days</p>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors" data-testid={`top-post-${i}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white/20" />
                  </div>
                  <div>
                    <p className="font-medium text-white/80 text-sm">Example Post {i}</p>
                    <p className="text-xs text-white/25">Posted {i} days ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white text-sm">{(1000 - i * 100).toLocaleString()} views</p>
                  <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{20 - i}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Best Posting Times */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Best Posting Times</h3>
            <p className="text-xs text-white/25 mb-5">When your audience is most active</p>
            <div className="space-y-4">
              {[
                { time: "9:00 AM - 11:00 AM", engagement: 85 },
                { time: "2:00 PM - 4:00 PM", engagement: 72 },
                { time: "6:00 PM - 8:00 PM", engagement: 91 },
              ].map((slot) => (
                <div key={slot.time} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">{slot.time}</span>
                    <span className="text-white/40 font-medium">{slot.engagement}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${slot.engagement}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Performance */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Platform Performance</h3>
            <p className="text-xs text-white/25 mb-5">Engagement by platform</p>
            <div className="space-y-4">
              {[
                { platform: "Instagram Reels", engagement: 78 },
                { platform: "TikTok", engagement: 85 },
                { platform: "YouTube Shorts", engagement: 62 },
              ].map((p) => (
                <div key={p.platform} className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{p.platform}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.engagement}%` }} />
                    </div>
                    <span className="text-xs font-medium text-white/40 w-10 text-right">{p.engagement}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, accent }: {
  title: string; value: string; change: string;
  icon: React.ComponentType<{ className?: string }>; accent: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pink: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  const c = colors[accent] || colors.blue;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl border ${c}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{change}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/30 mt-1">{title}</p>
    </div>
  );
}
