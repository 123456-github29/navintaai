import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Video,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Monitor,
  Play,
  Square,
  RotateCcw,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
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

export default function Director() {
  const [, params] = useRoute("/director/:id");
  const postId = params?.id;
  const { toast } = useToast();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(null);
  const [phoneSessionUrl, setPhoneSessionUrl] = useState<string | null>(null);

  const autoPlayTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Attach stream to video element when camera is ready
  useEffect(() => {
    if (streamRef.current && videoRef.current && cameraReady) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady]);

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    stopAllTracks();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1920 }, facingMode: "user" },
        audio: true,
      });
      streamRef.current = mediaStream;
      setCameraReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      toast({
        title: "Camera access denied",
        description: "Please allow camera and microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const preferredMimeType = "video/webm;codecs=vp8,opus";
    const fallbackMimeType = "video/webm";
    const mp4Type = "video/mp4";

    let mimeType = "";
    if (MediaRecorder.isTypeSupported(preferredMimeType)) {
      mimeType = preferredMimeType;
    } else if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
      mimeType = fallbackMimeType;
    } else if (MediaRecorder.isTypeSupported(mp4Type)) {
      mimeType = mp4Type;
    }

    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(streamRef.current, options);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
      setRecordedBlob(blob);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    recordingStartTimeRef.current = Date.now();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
  };

  const createSessionAndRecord = async (shotId: string, mode: "phone" | "computer") => {
    setSessionLoading(true);
    try {
      const res = await apiRequest("POST", "/api/recording-sessions", {
        postId,
        shotId,
      });
      const data = await res.json();

      if (mode === "phone") {
        setPhoneSessionUrl(data.pairUrl);
        setActiveShotId(shotId);
        toast({
          title: "Recording session created",
          description: "Open the link on your phone to record.",
        });
      } else {
        // Computer mode: start inline camera recording
        setActiveShotId(shotId);
        setActiveSessionId(data.sessionId);
        setActiveSessionToken(null); // computer mode uses session directly
        setPhoneSessionUrl(null);
        setRecordedBlob(null);
        setCurrentCardIndex(0);
        await startCamera();
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

  const uploadRecording = useCallback(async () => {
    if (!recordedBlob || !activeSessionId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const urlRes = await fetch(`/api/recording-sessions/${activeSessionId}/upload-url`);
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get upload URL.");
      }
      const { uploadUrl, storagePath } = await urlRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", recordedBlob.type || "video/webm");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error("Upload failed."));
        xhr.timeout = 120000;
        xhr.send(recordedBlob);
      });

      const durationSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
      const completeRes = await fetch(`/api/recording-sessions/${activeSessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          duration: durationSec,
          mimeType: recordedBlob.type || "video/webm",
        }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to finalize upload.");
      }

      // Mark shot as completed
      if (activeShotId) {
        updateShotMutation.mutate({ shotId: activeShotId, completed: true });
      }

      toast({ title: "Clip uploaded!", description: "Your recording has been saved." });

      // Reset state
      stopAllTracks();
      setCameraReady(false);
      setRecordedBlob(null);
      setActiveShotId(null);
      setActiveSessionId(null);
      setRecordingTime(0);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [recordedBlob, activeSessionId, activeShotId]);

  const closeCamera = () => {
    stopAllTracks();
    setCameraReady(false);
    setRecordedBlob(null);
    setActiveShotId(null);
    setActiveSessionId(null);
    setRecordingTime(0);
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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

  const shotList = Array.isArray(post.shotList) ? post.shotList : [];
  const completedShots = shotList.filter(s => s.completed).length;
  const totalShots = shotList.length;
  const currentShot = shotList.find(s => !s.completed) || shotList[0];
  const cards = teleprompterData?.cards || [];
  const previewUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : null;

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
            {/* Phone Recording Session */}
            {phoneSessionUrl && (
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
                    href={phoneSessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline break-all"
                  >
                    {phoneSessionUrl}
                  </a>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 text-white/50 hover:bg-white/5 rounded-xl bg-transparent"
                  onClick={() => setPhoneSessionUrl(null)}
                >
                  Close
                </Button>
              </div>
            )}

            {/* Shot List */}
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: "#0a0a0a" }}>
              <h3 className="text-sm font-semibold text-white/50 mb-4">Shot List</h3>
              <div className="space-y-3">
                {shotList.map((shot) => (
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
                          onClick={() => createSessionAndRecord(shot.id, "phone")}
                          disabled={sessionLoading}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          Phone
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs flex-1 border-white/10 text-white/40 hover:bg-white/5 rounded-xl bg-transparent"
                          onClick={() => createSessionAndRecord(shot.id, "computer")}
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
