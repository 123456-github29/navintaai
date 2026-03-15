import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="p-6 md:p-8 min-h-screen" style={{ background: "#050505" }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-white/5 rounded-xl" />
          <Skeleton className="h-96 w-full bg-white/[0.03] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]" style={{ background: "#050505" }}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Post not found</h2>
          <Link href="/dashboard">
            <Button variant="outline" className="border-white/10 text-white/60 bg-transparent hover:bg-white/5 rounded-xl">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedShots = post.shotList.filter(s => s.completed).length;
  const totalShots = post.shotList.length;
  const progress = (completedShots / totalShots) * 100;

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back" className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">{post.title}</h1>
            <p className="text-sm text-white/30 mt-1">
              Week {post.weekNumber}, Day {post.dayNumber} • {post.platform}
            </p>
          </div>
          <Link href={`/director/${post.id}`}>
            <Button size="lg" data-testid="button-start-recording" className="bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-full px-6">
              <Video className="h-5 w-5 mr-2" />
              {completedShots > 0 ? "Continue Recording" : "Start Recording"}
            </Button>
          </Link>
        </div>

        {/* Concept */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 md:p-8">
          <h2 className="text-lg font-semibold text-white mb-1">Concept</h2>
          <p className="text-sm text-white/50 leading-relaxed mt-3">{post.concept}</p>
        </div>

        {/* Shot List */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Shot List</h2>
            <span className="text-xs font-medium text-white/40 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06]">
              {completedShots} of {totalShots} ({Math.round(progress)}%)
            </span>
          </div>
          <div className="space-y-3">
            {post.shotList.map((shot) => (
              <div
                key={shot.id}
                className={`p-4 rounded-xl border transition-all ${
                  shot.completed
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
                data-testid={`shot-${shot.shotNumber}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {shot.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-white/10 text-white/50 bg-transparent text-xs">Shot {shot.shotNumber}</Badge>
                      <span className="text-xs text-white/25">{shot.duration}s</span>
                    </div>
                    <p className="font-medium text-white/70 text-sm">{shot.instruction}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-white/25">Angle:</span> <span className="text-white/50">{shot.cameraAngle}</span>
                      </div>
                      <div>
                        <span className="text-white/25">Framing:</span> <span className="text-white/50">{shot.framing}</span>
                      </div>
                    </div>
                    {shot.dialogue && (
                      <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                        <p className="text-xs italic text-white/40">"{shot.dialogue}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Caption */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Caption</h3>
            <p className="text-sm text-white/40 leading-relaxed">{post.caption}</p>
          </div>

          {/* Hashtags */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Hashtags</h3>
            <div className="flex flex-wrap gap-2">
              {post.hashtags.map((tag) => (
                <span key={tag} className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {post.brollSuggestions && post.brollSuggestions.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
              <h3 className="text-sm font-semibold text-white mb-3">B-Roll Suggestions</h3>
              <ul className="space-y-2">
                {post.brollSuggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span className="text-sm text-white/40">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {post.musicVibe && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Music Vibe</h3>
              <span className="text-sm font-medium text-white/50 bg-white/[0.04] px-4 py-2 rounded-full border border-white/[0.06]">
                {post.musicVibe}
              </span>
            </div>
          )}
        </div>

        {completedShots === totalShots && post.status !== "completed" && (
          <div className={`rounded-2xl border p-6 ${postClips.length > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {postClips.length > 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <Video className="h-6 w-6 text-amber-400" />
                )}
                <div>
                  {postClips.length > 0 ? (
                    <>
                      <p className="font-medium text-white/80 text-sm">All shots completed!</p>
                      <p className="text-xs text-white/30">Ready to edit and export your video</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-white/80 text-sm">Shots marked complete — now record your clips</p>
                      <p className="text-xs text-white/30">Record your video clips to finish editing</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {postClips.length > 0 ? (
                  <>
                    <Link href={`/ai-editor/${post.id}`}>
                      <Button data-testid="button-finish-video" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-full px-6">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Finish Video
                      </Button>
                    </Link>
                    <Link href={`/editor/${post.id}`}>
                      <Button variant="outline" data-testid="button-edit-video" className="border-white/10 text-white/60 bg-transparent hover:bg-white/5 rounded-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Manual Edit
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href={`/director/${post.id}`}>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-6">
                      <Video className="h-4 w-4 mr-2" />
                      Record Clips
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
