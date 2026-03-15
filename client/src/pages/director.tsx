import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Video, CheckCircle2, Circle, ChevronLeft, ChevronRight, Smartphone, Monitor } from "lucide-react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post } from "@shared/schema";

interface TeleprompterCard {
  text: string;
  durationSec: number;
  beatType: string;
}

interface TeleprompterData {
  cards: TeleprompterCard[];
  fullScript: string;
  totalDuration: number;
  wordCount: number;
}

interface RecordingSession {
  sessionId: string;
  qrUrl: string;
  recordUrl: string;
  postId: string;
  shotId: string;
}

export default function Director() {
  const [, params] = useRoute("/director/:id");
  const postId = params?.id;
  const { toast } = useToast();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [activeSession, setActiveSession] = useState<RecordingSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const autoPlayTimerRef = useRef<number | null>(null);

  const { data: post, isLoading: postLoading } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  const { data: teleprompterData, isLoading: teleprompterLoading } = useQuery<TeleprompterData>({
    queryKey: ["/api/posts", postId, "teleprompter"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!postId,
  });

  const updateShotMutation = useMutation({
    mutationFn: async ({ shotId, completed }: { shotId: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/posts/${postId}/shots/${shotId}`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  useEffect(() => {
    if (isAutoPlay && teleprompterData?.cards) {
      const currentCard = teleprompterData.cards[currentCardIndex];
      if (currentCard) {
        autoPlayTimerRef.current = window.setTimeout(() => {
          if (currentCardIndex < teleprompterData.cards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
          } else {
            setIsAutoPlay(false);
          }
        }, currentCard.durationSec * 1000);
      }
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlay, currentCardIndex, teleprompterData]);

  const createRecordingSession = async (shotId: string, mode: "phone" | "computer" = "phone") => {
    setSessionLoading(true);
    try {
      const res = await apiRequest("POST", "/api/recording-sessions", {
        postId,
        shotId,
      });
      const data = await res.json();
      if (mode === "computer") {
        const computerUrl = `${data.recordUrl}&mode=computer`;
        window.open(computerUrl, "_blank");
      } else {
        setActiveSession(data);
        toast({
          title: "Recording session created",
          description: "Open this URL on your phone to start recording.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create recording session",
        variant: "destructive",
      });
    } finally {
      setSessionLoading(false);
    }
  };

  if (postLoading || teleprompterLoading) {
    return (
      <div className="p-6 md:p-8 min-h-screen" style={{ background: "#050505" }}>
        <div className="max-w-5xl mx-auto space-y-6">
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
            <Button className="bg-white text-black rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedShots = post.shotList.filter(s => s.completed).length;
  const totalShots = post.shotList.length;
  const currentShot = post.shotList.find(s => !s.completed) || post.shotList[0];
  const cards = teleprompterData?.cards || [];

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: "#050505" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/post/${post.id}`}>
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">{post.title}</h1>
            <p className="text-sm text-white/30">
              Director Mode — {completedShots}/{totalShots} shots completed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teleprompter Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "#0a0a0a" }}>
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-sm font-medium text-white/50">Teleprompter</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/5 text-white/40 border border-white/8 text-xs rounded-full">
                    {currentCardIndex + 1} / {cards.length}
                  </Badge>
                  {teleprompterData && (
                    <Badge className="bg-white/5 text-white/40 border border-white/8 text-xs rounded-full">
                      {teleprompterData.totalDuration}s
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-8">
                {/* Main teleprompter display */}
                <div className="min-h-[200px] flex items-center justify-center">
                  {cards.length > 0 ? (
                    <div className="text-center space-y-4 max-w-xl">
                      <p className="text-2xl md:text-3xl font-medium leading-relaxed text-white">
                        {cards[currentCardIndex]?.text}
                      </p>
                      <Badge className="bg-white/5 text-white/30 border border-white/8 text-xs rounded-full">
                        {cards[currentCardIndex]?.beatType} — {cards[currentCardIndex]?.durationSec.toFixed(1)}s
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-white/25 text-lg">No script available. Regenerate from post detail page.</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/10 text-white/50 hover:bg-white/5 hover:text-white rounded-xl bg-transparent"
                    onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                    disabled={currentCardIndex === 0}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    className={`rounded-full px-8 ${isAutoPlay ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"}`}
                    onClick={() => {
                      if (isAutoPlay) {
                        setIsAutoPlay(false);
                      } else {
                        setCurrentCardIndex(0);
                        setIsAutoPlay(true);
                      }
                    }}
                  >
                    {isAutoPlay ? "Stop" : "Auto-Play"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/10 text-white/50 hover:bg-white/5 hover:text-white rounded-xl bg-transparent"
                    onClick={() => setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1))}
                    disabled={currentCardIndex >= cards.length - 1}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Full Script */}
            {teleprompterData?.fullScript && (
              <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "#0a0a0a" }}>
                <h3 className="text-sm font-semibold text-white/50 mb-4">Full Script</h3>
                <p className="text-sm leading-relaxed text-white/35 whitespace-pre-wrap">
                  {teleprompterData.fullScript}
                </p>
              </div>
            )}
          </div>

          {/* Shot List & Recording Section */}
          <div className="space-y-4">
            {/* QR Recording Session */}
            {activeSession && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">Phone Recording</span>
                </div>
                <p className="text-xs text-white/30 mb-3">
                  Open this URL on your phone to record:
                </p>
                <div className="bg-black/30 rounded-xl p-3 text-center mb-3">
                  <a
                    href={activeSession.recordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline break-all"
                  >
                    {activeSession.recordUrl}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 text-white/50 hover:bg-white/5 rounded-xl bg-transparent"
                  onClick={() => setActiveSession(null)}
                >
                  Close
                </Button>
              </div>
            )}

            {/* Shot List */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: "#0a0a0a" }}>
              <h3 className="text-sm font-semibold text-white/50 mb-4">Shot List</h3>
              <div className="space-y-3">
                {post.shotList.map((shot) => (
                  <div
                    key={shot.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      shot.completed
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : currentShot?.id === shot.id
                          ? "border-indigo-500/20 bg-indigo-500/5"
                          : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="mt-0.5"
                        onClick={() => updateShotMutation.mutate({
                          shotId: shot.id,
                          completed: !shot.completed,
                        })}
                      >
                        {shot.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-white/20" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-white/5 text-white/40 border border-white/8 text-xs rounded-full">Shot {shot.shotNumber}</Badge>
                          <span className="text-xs text-white/25">{shot.duration}s</span>
                        </div>
                        <p className="text-sm text-white/60">{shot.instruction}</p>
                      </div>
                    </div>
                    {!shot.completed && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs flex-1 border-white/10 text-white/40 hover:bg-white/5 rounded-xl bg-transparent"
                          onClick={() => createRecordingSession(shot.id, "phone")}
                          disabled={sessionLoading}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          Phone
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs flex-1 border-white/10 text-white/40 hover:bg-white/5 rounded-xl bg-transparent"
                          onClick={() => createRecordingSession(shot.id, "computer")}
                          disabled={sessionLoading}
                        >
                          <Monitor className="h-3 w-3 mr-1" />
                          Computer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Done - go to editor */}
            {completedShots === totalShots && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="font-semibold text-sm text-white">All shots recorded!</p>
                <Link href={`/ai-editor/${post.id}`}>
                  <Button size="sm" className="w-full bg-white text-black rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    Finish Video
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
