import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Auto-play timer
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
  const currentShot = post.shotList.find(s => !s.completed) || post.shotList[0];
  const cards = teleprompterData?.cards || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/post/${post.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
          <p className="text-sm text-muted-foreground">
            Recording Director • {completedShots}/{totalShots} shots completed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teleprompter Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[#111111] text-white border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white/80 text-sm font-medium">Teleprompter</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                    {currentCardIndex + 1} / {cards.length}
                  </Badge>
                  {teleprompterData && (
                    <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                      {teleprompterData.totalDuration}s total
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main teleprompter display */}
              <div className="min-h-[200px] flex items-center justify-center px-4">
                {cards.length > 0 ? (
                  <div className="text-center space-y-4">
                    <p className="text-2xl md:text-3xl font-medium leading-relaxed">
                      {cards[currentCardIndex]?.text}
                    </p>
                    <Badge className="bg-white/10 text-white/50 text-xs">
                      {cards[currentCardIndex]?.beatType} • {cards[currentCardIndex]?.durationSec.toFixed(1)}s
                    </Badge>
                  </div>
                ) : (
                  <p className="text-white/40 text-lg">No script available. Regenerate script from the post detail page.</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                  disabled={currentCardIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  className={isAutoPlay ? "bg-red-500 hover:bg-red-600" : "bg-white text-[#111111] hover:bg-white/90"}
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
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1))}
                  disabled={currentCardIndex >= cards.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Full Script */}
          {teleprompterData?.fullScript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Full Script</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {teleprompterData.fullScript}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shot List & Recording Section */}
        <div className="space-y-4">
          {/* QR Recording Session */}
          {activeSession && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Phone Recording Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Open this URL on your phone to record:
                </p>
                <div className="bg-white rounded-lg p-3 text-center">
                  <a
                    href={activeSession.recordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline break-all"
                  >
                    {activeSession.recordUrl}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveSession(null)}
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Shot List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shot List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post.shotList.map((shot) => (
                <div
                  key={shot.id}
                  className={`p-3 rounded-lg border transition-all ${
                    shot.completed
                      ? "border-green-200 bg-green-50"
                      : currentShot?.id === shot.id
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-100"
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
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">Shot {shot.shotNumber}</Badge>
                        <span className="text-xs text-muted-foreground">{shot.duration}s</span>
                      </div>
                      <p className="text-sm">{shot.instruction}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant={shot.completed ? "ghost" : "outline"}
                      className={`text-xs flex-1 ${shot.completed ? "text-muted-foreground hover:text-foreground" : ""}`}
                      onClick={() => createRecordingSession(shot.id, "phone")}
                      disabled={sessionLoading}
                    >
                      <Smartphone className="h-3 w-3 mr-1" />
                      {shot.completed ? "Re-record (Phone)" : "Phone"}
                    </Button>
                    <Button
                      size="sm"
                      variant={shot.completed ? "ghost" : "outline"}
                      className={`text-xs flex-1 ${shot.completed ? "text-muted-foreground hover:text-foreground" : ""}`}
                      onClick={() => createRecordingSession(shot.id, "computer")}
                      disabled={sessionLoading}
                    >
                      <Monitor className="h-3 w-3 mr-1" />
                      {shot.completed ? "Re-record (Computer)" : "Computer"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Done - go to editor */}
          {completedShots === totalShots && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center space-y-3">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                <p className="font-medium text-sm">All shots recorded!</p>
                <Link href={`/ai-editor/${post.id}`}>
                  <Button size="sm" className="w-full">
                    Finish Video
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
