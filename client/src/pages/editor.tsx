import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Type,
  Music,
  Sparkles
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post, Clip } from "@shared/schema";

const MUSIC_STYLES = [
  "Upbeat & Energetic",
  "Calm & Relaxing",
  "Inspirational",
  "Corporate & Professional",
  "Fun & Playful",
];

export default function Editor() {
  const [, params] = useRoute("/editor/:id");
  const [, setLocation] = useLocation();
  const postId = params?.id;
  const { toast } = useToast();

  const [hasCaption, setHasCaption] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState("Upbeat & Energetic");
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  const { data: clips, isLoading: clipsLoading } = useQuery<Clip[]>({
    queryKey: ["/api/clips"],
  });

  const exportMutation = useMutation({
    mutationFn: (data: { hasCaption: boolean; musicStyle: string }) =>
      apiRequest("POST", "/api/videos/export", {
        postId,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      toast({
        title: "Video exported!",
        description: "Your video is ready to download.",
      });
      setLocation("/library");
    },
    onError: (error: any) => {
      let description = "Unable to export video. Please try again.";
      const msg = error?.message || "";
      if (msg.includes("No clips") || msg.includes("NO_CLIPS_FOUND")) {
        description = "Please record and save at least one shot before exporting.";
      } else if (msg.includes("EXPORT_LIMIT_REACHED")) {
        description = "You've reached your daily export limit. Upgrade your plan for more exports.";
      } else if (msg.includes("402") || msg.includes("SUBSCRIPTION_REQUIRED")) {
        description = "A subscription is required to export videos.";
      } else if (msg.includes("Failed to process video") || msg.includes("VIDEO_PROCESSING_ERROR")) {
        description = "Video processing failed. Please check your clips and try again.";
      }
      toast({
        title: "Export failed",
        description,
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      hasCaption,
      musicStyle: selectedMusic,
    });
  };

  if (postLoading || clipsLoading) {
    return (
      <div className="p-6 md:p-8 min-h-screen" style={{ background: "#050505" }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[600px] bg-white/[0.03] rounded-2xl" />
            <Skeleton className="h-[600px] bg-white/[0.03] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050505" }}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Post not found</h2>
          <Button onClick={() => setLocation("/dashboard")} className="bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-full">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const postClips = clips?.filter((c) => c.postId === postId) || [];

  if (exportMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050505" }}>
        <div className="w-full max-w-2xl mx-auto p-12 rounded-2xl border border-white/[0.06] bg-white/[0.025]">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-4 animate-pulse">
              <Sparkles className="h-10 w-10 text-white animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Compiling Your Video</h2>
              <p className="text-white/30">
                Merging clips, adding captions and music...
              </p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={66} className="h-2 bg-white/5" />
              <div className="space-y-2 text-sm text-white/30">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Processing {postClips.length} clips</span>
                </div>
                {hasCaption && (
                  <p className="text-xs">Adding text overlays...</p>
                )}
                <p className="text-xs">Mixing background music...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/post/${postId}`)}
              data-testid="button-back"
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Video Editor</h1>
              <p className="text-sm text-white/30 mt-1">{post.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              onClick={() => setLocation(`/ai-editor/${postId}`)}
              disabled={postClips.length === 0}
              data-testid="button-ai-edit"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-full"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              AI Edit
            </Button>
            <Button
              size="lg"
              onClick={handleExport}
              disabled={exportMutation.isPending || postClips.length === 0}
              data-testid="button-export"
              className="bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-full"
            >
              <Download className="h-5 w-5 mr-2" />
              {exportMutation.isPending ? "Exporting..." : "Export Video"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Video Preview */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] overflow-hidden">
              <div className="relative aspect-[9/16] bg-black/50 overflow-hidden max-w-md mx-auto">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5">
                      <Play className="h-10 w-10 text-white/40" />
                    </div>
                    <div>
                      <h3 className="text-white text-lg font-semibold mb-2">
                        Video Preview
                      </h3>
                      <p className="text-white/30 text-sm">
                        {postClips.length > 0
                          ? "Preview functionality coming soon"
                          : "Record clips to see preview"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/[0.06] space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled
                    data-testid="button-skip-back"
                    className="text-white/30 hover:bg-white/5 rounded-full"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="default"
                    className="h-12 w-12 rounded-full bg-white text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={postClips.length === 0}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled
                    data-testid="button-skip-forward"
                    className="text-white/30 hover:bg-white/5 rounded-full"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                <Slider
                  value={[0]}
                  max={100}
                  step={1}
                  disabled={postClips.length === 0}
                  className="cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs text-white/25 font-mono">
                  <span>0:00</span>
                  <span>
                    {Math.floor(postClips.reduce((sum, c) => sum + c.duration, 0) / 60)}:
                    {(postClips.reduce((sum, c) => sum + c.duration, 0) % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="h-5 w-5 text-white/40" />
                <h3 className="text-sm font-semibold text-white">Timeline</h3>
              </div>
              {postClips.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {postClips.map((clip, index) => (
                    <div
                      key={clip.id}
                      className="flex-shrink-0 w-24 space-y-2 group"
                      data-testid={`timeline-clip-${index}`}
                    >
                      <div className="aspect-[9/16] bg-white/5 rounded-xl overflow-hidden border-2 border-transparent hover:border-white/20 transition-colors">
                        {clip.thumbnail ? (
                          <img
                            src={clip.thumbnail}
                            alt={`Clip ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-white/60">Clip {index + 1}</p>
                        <p className="text-xs text-white/25">{clip.duration}s</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/20">
                  <p className="text-sm">No clips recorded yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Captions */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Type className="h-5 w-5 text-white/40" />
                <h3 className="text-sm font-semibold text-white">Captions</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="captions" className="cursor-pointer text-sm text-white/60">
                    Auto-generate captions
                  </Label>
                  <Switch
                    id="captions"
                    checked={hasCaption}
                    onCheckedChange={setHasCaption}
                    data-testid="switch-captions"
                  />
                </div>
                <p className="text-xs text-white/25">
                  Automatically add text captions to your video for better engagement
                </p>
              </div>
            </div>

            {/* Background Music */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Music className="h-5 w-5 text-white/40" />
                <h3 className="text-sm font-semibold text-white">Background Music</h3>
              </div>
              <div className="space-y-2">
                {MUSIC_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedMusic(style)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedMusic === style
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.06] bg-transparent hover:bg-white/[0.03]"
                    }`}
                    data-testid={`music-${style.toLowerCase().replace(/[^a-z]/g, "-")}`}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm font-medium text-white/60">{style}</span>
                      {selectedMusic === style && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Settings */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-white/40" />
                <h3 className="text-sm font-semibold text-white">Video Settings</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-white/40 mb-2 block">Aspect Ratio</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["9:16", "1:1", "16:9"].map((ratio) => (
                      <Button
                        key={ratio}
                        variant={ratio === "9:16" ? "default" : "outline"}
                        size="sm"
                        disabled={ratio !== "9:16"}
                        data-testid={`aspect-ratio-${ratio.replace(":", "-")}`}
                        className={ratio === "9:16"
                          ? "bg-white text-black rounded-xl"
                          : "border border-white/[0.06] text-white/30 bg-transparent rounded-xl"
                        }
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-white/20 mt-2">
                    Vertical (9:16) optimized for Reels, TikTok, and Shorts
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs text-white/30 mb-2">
                    <span className="text-xs font-medium text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">Auto-applied</span>
                    <span>Brand colors & intro/outro</span>
                  </div>
                  <p className="text-xs text-white/20">
                    Your brand kit settings will be automatically applied to the video
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
