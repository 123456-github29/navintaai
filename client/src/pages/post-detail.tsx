import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Video, CheckCircle2, Circle, Edit, Sparkles } from "lucide-react";
import type { Post, Clip } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const postId = params?.id;
  const { isAuthenticated } = useAuth();

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  const { data: clips } = useQuery<Clip[]>({
    queryKey: ["/api/clips"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const postClips = clips?.filter((c) => c.postId === postId) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Post not found</h2>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedShots = post.shotList.filter(s => s.completed).length;
  const totalShots = post.shotList.length;
  const progress = (completedShots / totalShots) * 100;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
          <p className="text-muted-foreground mt-1">
            Week {post.weekNumber}, Day {post.dayNumber} • {post.platform}
          </p>
        </div>
        <Link href={`/director/${post.id}`}>
          <Button size="lg" data-testid="button-start-recording">
            <Video className="h-5 w-5 mr-2" />
            {completedShots > 0 ? "Continue Recording" : "Start Recording"}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Concept</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed">{post.concept}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shot List</CardTitle>
            <div className="text-sm text-muted-foreground">
              {completedShots} of {totalShots} completed ({Math.round(progress)}%)
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.shotList.map((shot) => (
            <div
              key={shot.id}
              className={`p-4 rounded-lg border-l-4 transition-all ${
                shot.completed
                  ? "border-l-green-500 bg-green-500/5"
                  : "border-l-border"
              }`}
              data-testid={`shot-${shot.shotNumber}`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {shot.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Shot {shot.shotNumber}</Badge>
                    <span className="text-sm text-muted-foreground">{shot.duration}s</span>
                  </div>
                  <p className="font-medium">{shot.instruction}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Angle:</span> {shot.cameraAngle}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Framing:</span> {shot.framing}
                    </div>
                  </div>
                  {shot.dialogue && (
                    <div className="mt-2 p-3 rounded-md bg-muted/50">
                      <p className="text-sm italic">"{shot.dialogue}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Caption</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed">{post.caption}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hashtags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {post.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {post.brollSuggestions && post.brollSuggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>B-Roll Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {post.brollSuggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {post.musicVibe && (
          <Card>
            <CardHeader>
              <CardTitle>Music Vibe</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-base px-4 py-2">
                {post.musicVibe}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {completedShots === totalShots && post.status !== "completed" && (
        <Card className={postClips.length > 0 ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              {postClips.length > 0 ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <Video className="h-6 w-6 text-amber-500" />
              )}
              <div>
                {postClips.length > 0 ? (
                  <>
                    <p className="font-medium">All shots completed!</p>
                    <p className="text-sm text-muted-foreground">Ready to edit and export your video</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Shots marked complete — now record your clips</p>
                    <p className="text-sm text-muted-foreground">Record your video clips to finish editing</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {postClips.length > 0 ? (
                <>
                  <Link href={`/ai-editor/${post.id}`}>
                    <Button data-testid="button-finish-video" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Finish Video
                    </Button>
                  </Link>
                  <Link href={`/editor/${post.id}`}>
                    <Button variant="outline" data-testid="button-edit-video">
                      <Edit className="h-4 w-4 mr-2" />
                      Manual Edit
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href={`/director/${post.id}`}>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Video className="h-4 w-4 mr-2" />
                    Record Clips
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
