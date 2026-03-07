import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="p-6 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
              <p className="text-muted-foreground">
                Plan and schedule your social media posts
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm px-4 py-2 font-medium">
            {scheduledPosts.length} posts scheduled
          </Badge>
        </div>

      <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mock Scheduling Demo
          </CardTitle>
          <CardDescription>
            This is a demonstration of the scheduling interface. Real social media integration will be added in the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" disabled>
              <Instagram className="h-4 w-4 mr-2" />
              Connect Instagram
            </Button>
            <Button variant="outline" size="sm" disabled>
              <SiTiktok className="h-4 w-4 mr-2" />
              Connect TikTok
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Youtube className="h-4 w-4 mr-2" />
              Connect YouTube
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Facebook className="h-4 w-4 mr-2" />
              Connect Facebook
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upcoming Week</h2>
        <div className="grid grid-cols-1 gap-4">
          {upcomingDays.map((day, index) => (
            <Card key={day.toISOString()} data-testid={`day-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {format(day, "EEEE, MMMM d")}
                    </CardTitle>
                    <CardDescription>
                      {index === 0 ? "Today" : index === 1 ? "Tomorrow" : format(day, "yyyy")}
                    </CardDescription>
                  </div>
                  {index < 3 && (
                    <Badge variant="secondary">
                      {Math.floor(Math.random() * 3) + 1} posts
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {index < 3 ? (
                  <div className="space-y-3">
                    {Array.from({ length: Math.floor(Math.random() * 2) + 1 }).map((_, i) => (
                      <ScheduledPostCard key={i} dayIndex={index} postIndex={i} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No posts scheduled for this day
                  </p>
                )}
              </CardContent>
            </Card>
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
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate" data-testid={`scheduled-post-${dayIndex}-${postIndex}`}>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Example Post Title</p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{time}</span>
          </div>
        </div>
      </div>
      <Badge variant="outline">{platform}</Badge>
    </div>
  );
}
