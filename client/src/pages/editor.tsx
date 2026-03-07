import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex justify-center p-6 bg-white min-h-screen">
        <div className="w-full max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-100" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[600px] bg-gray-100 rounded-3xl" />
            <Skeleton className="h-[600px] bg-gray-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#111111] mb-2">Post not found</h2>
          <Button onClick={() => setLocation("/dashboard")} className="bg-[#111111] hover:bg-[#333333] text-white rounded-full">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const postClips = clips?.filter((c) => c.postId === postId) || [];

  if (exportMutation.isPending) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl mx-auto p-12 bg-white border border-gray-200 rounded-3xl">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-4 animate-pulse">
              <Sparkles className="h-10 w-10 text-[#111111] animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#111111]">Compiling Your Video</h2>
              <p className="text-[#666666]">
                Merging clips, adding captions and music...
              </p>
            </div>
            <div className="space-y-3 max-w-md mx-auto">
              <Progress value={66} className="h-2 bg-gray-100" />
              <div className="space-y-2 text-sm text-[#666666]">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#111111] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#111111] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-[#111111] animate-bounce" style={{ animationDelay: "300ms" }} />
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
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center p-6 bg-white min-h-screen">
      <div className="w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/post/${postId}`)}
              data-testid="button-back"
              className="text-[#666666] hover:text-[#111111] hover:bg-gray-50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">Video Editor</h1>
              <p className="text-[#666666] mt-1">{post.title}</p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleExport}
            disabled={exportMutation.isPending || postClips.length === 0}
            data-testid="button-export"
            className="bg-[#111111] hover:bg-[#333333] text-white rounded-full"
          >
            <Download className="h-5 w-5 mr-2" />
            {exportMutation.isPending ? "Exporting..." : "Export Video"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white border border-gray-200 rounded-3xl">
            <CardContent className="p-0">
              <div className="relative aspect-[9/16] bg-gray-50 rounded-t-3xl overflow-hidden max-w-md mx-auto">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100">
                      <Play className="h-10 w-10 text-[#111111]" />
                    </div>
                    <div>
                      <h3 className="text-[#111111] text-lg font-semibold mb-2">
                        Video Preview
                      </h3>
                      <p className="text-[#666666] text-sm">
                        {postClips.length > 0
                          ? "Preview functionality coming soon"
                          : "Record clips to see preview"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled
                    data-testid="button-skip-back"
                    className="text-[#666666] hover:bg-gray-50 rounded-full"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="default"
                    className="h-12 w-12 rounded-full bg-[#111111] hover:bg-[#333333] text-white"
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
                    className="text-[#666666] hover:bg-gray-50 rounded-full"
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

                <div className="flex items-center justify-between text-xs text-[#666666] font-mono">
                  <span>0:00</span>
                  <span>
                    {Math.floor(postClips.reduce((sum, c) => sum + c.duration, 0) / 60)}:
                    {(postClips.reduce((sum, c) => sum + c.duration, 0) % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#111111]">
                <Scissors className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {postClips.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {postClips.map((clip, index) => (
                    <div
                      key={clip.id}
                      className="flex-shrink-0 w-24 space-y-2 group"
                      data-testid={`timeline-clip-${index}`}
                    >
                      <div className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#111111] transition-colors">
                        {clip.thumbnail ? (
                          <img
                            src={clip.thumbnail}
                            alt={`Clip ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-6 w-6 text-[#666666]" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-[#111111]">Clip {index + 1}</p>
                        <p className="text-xs text-[#666666]">{clip.duration}s</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#666666]">
                  <p>No clips recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          <div className="space-y-4">
          <Card className="bg-white border border-gray-200 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#111111]">
                <Type className="h-5 w-5" />
                Captions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="captions" className="cursor-pointer text-[#111111]">
                  Auto-generate captions
                </Label>
                <Switch
                  id="captions"
                  checked={hasCaption}
                  onCheckedChange={setHasCaption}
                  data-testid="switch-captions"
                />
              </div>
              <p className="text-sm text-[#666666]">
                Automatically add text captions to your video for better engagement
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#111111]">
                <Music className="h-5 w-5" />
                Background Music
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MUSIC_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedMusic(style)}
                  className={`w-full p-3 rounded-full border text-left transition-all hover:bg-gray-50 ${
                    selectedMusic === style
                      ? "border-[#111111] bg-gray-50"
                      : "border-gray-200"
                  }`}
                  data-testid={`music-${style.toLowerCase().replace(/[^a-z]/g, "-")}`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-[#111111]">{style}</span>
                    {selectedMusic === style && (
                      <div className="h-2 w-2 rounded-full bg-[#111111]" />
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#111111]">
                <Sparkles className="h-5 w-5" />
                Video Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block text-[#111111]">Aspect Ratio</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["9:16", "1:1", "16:9"].map((ratio) => (
                    <Button
                      key={ratio}
                      variant={ratio === "9:16" ? "default" : "outline"}
                      size="sm"
                      disabled={ratio !== "9:16"}
                      data-testid={`aspect-ratio-${ratio.replace(":", "-")}`}
                      className={ratio === "9:16" 
                        ? "bg-[#111111] hover:bg-[#333333] text-white rounded-full" 
                        : "border border-gray-200 text-[#666666] rounded-full"
                      }
                    >
                      {ratio}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-[#666666] mt-2">
                  Vertical (9:16) optimized for Reels, TikTok, and Shorts
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-[#666666] mb-2">
                  <Badge variant="secondary" className="bg-gray-100 text-[#666666]">Auto-applied</Badge>
                  <span>Brand colors & intro/outro</span>
                </div>
                <p className="text-xs text-[#666666]">
                  Your brand kit settings will be automatically applied to the video
                </p>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
