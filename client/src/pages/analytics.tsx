import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Eye, Heart, Share2, MessageCircle } from "lucide-react";

export default function Analytics() {
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-3xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Track your content performance
            </p>
          </div>
        </div>

      <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Coming Soon
          </CardTitle>
          <CardDescription>
            Performance tracking and insights will be available after connecting your social media accounts. Advanced analytics with A/B testing and optimization recommendations will be added in the next phase.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Views"
          value="2,847"
          change="+12.3%"
          icon={Eye}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Engagement"
          value="428"
          change="+8.1%"
          icon={Heart}
          iconColor="text-pink-500"
        />
        <StatCard
          title="Shares"
          value="156"
          change="+23.5%"
          icon={Share2}
          iconColor="text-green-500"
        />
        <StatCard
          title="Comments"
          value="89"
          change="+15.2%"
          icon={MessageCircle}
          iconColor="text-purple-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
          <CardDescription>Your best content from the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                data-testid={`top-post-${i}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Example Post {i}</p>
                    <p className="text-sm text-muted-foreground">
                      Posted {i} days ago
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{(1000 - i * 100).toLocaleString()} views</p>
                  <div className="flex items-center gap-1 text-sm text-green-500 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{20 - i}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Best Posting Times</CardTitle>
            <CardDescription>When your audience is most active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: "9:00 AM - 11:00 AM", engagement: 85 },
                { time: "2:00 PM - 4:00 PM", engagement: 72 },
                { time: "6:00 PM - 8:00 PM", engagement: 91 },
              ].map((slot) => (
                <div key={slot.time} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{slot.time}</span>
                    <Badge variant="secondary">{slot.engagement}% active</Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${slot.engagement}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Engagement by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { platform: "Instagram Reels", engagement: 78 },
                { platform: "TikTok", engagement: 85 },
                { platform: "YouTube Shorts", engagement: 62 },
              ].map((platform) => (
                <div key={platform.platform} className="flex items-center justify-between">
                  <span className="text-sm">{platform.platform}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${platform.engagement}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platform.engagement}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant="secondary" className="text-green-600">
            {change}
          </Badge>
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
