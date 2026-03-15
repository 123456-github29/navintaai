import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const cards = teleprompterData?.cards || [];
  const previewUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : null;

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 shrink-0">
        <Link href={`/post/${post.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight">{post.title}</h1>
          <p className="text-xs text-muted-foreground">
            {completedShots}/{totalShots} shots completed
          </p>
        </div>
        <Link href={`/ai-editor/${post.id}`}>
          <Button size="sm" className="bg-[#111] hover:bg-[#333] text-white rounded-lg">
            Finish Video
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main area: Camera preview / recording */}
        <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
          {cameraReady && !recordedBlob ? (
            <>
              {/* Live camera feed */}
              <video
                ref={videoRef}
                className="h-full w-auto max-w-full object-contain"
                autoPlay
                playsInline
                muted
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Teleprompter overlay */}
              {showTeleprompter && cards.length > 0 && (
                <div
                  className="absolute inset-x-0 bottom-28 flex flex-col items-center pointer-events-none px-8"
                >
                  <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-4 max-w-lg w-full pointer-events-auto">
                    <p className="text-white text-lg md:text-xl font-medium leading-relaxed text-center">
                      {cards[currentCardIndex]?.text}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <button
                        onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                        disabled={currentCardIndex === 0}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-white/50 text-xs font-medium">
                        {currentCardIndex + 1} / {cards.length}
                      </span>
                      <button
                        onClick={() => setCurrentCardIndex(Math.min(cards.length - 1, currentCardIndex + 1))}
                        disabled={currentCardIndex >= cards.length - 1}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/80 px-4 py-2 rounded-full backdrop-blur-sm">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
                </div>
              )}

              {/* Top controls */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => setShowTeleprompter(!showTeleprompter)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
                  title={showTeleprompter ? "Hide teleprompter" : "Show teleprompter"}
                >
                  {showTeleprompter ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={closeCamera}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
                  title="Close camera"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Record / stop controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-full bg-red-500" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <div className="w-8 h-8 rounded-sm bg-red-500" />
                  </button>
                )}
              </div>
            </>
          ) : recordedBlob && previewUrl ? (
            <>
              {/* Preview recorded clip */}
              <video
                ref={previewVideoRef}
                src={previewUrl}
                className="h-full w-auto max-w-full object-contain"
                autoPlay
                loop
                playsInline
                onClick={(e) => {
                  const v = e.currentTarget;
                  if (v.paused) v.play();
                  else v.pause();
                }}
              />

              {/* Upload progress overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <p className="text-white text-lg font-semibold mb-4">Uploading...</p>
                  <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-white/60 text-sm">{uploadProgress}%</p>
                </div>
              )}

              {/* Preview controls */}
              {!isUploading && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <button
                    onClick={discardRecording}
                    className="px-6 py-3 rounded-2xl bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform backdrop-blur-sm"
                  >
                    <RotateCcw className="h-4 w-4 inline mr-2" />
                    Retake
                  </button>
                  <button
                    onClick={uploadRecording}
                    className="px-6 py-3 rounded-2xl bg-white text-black text-sm font-medium active:scale-95 transition-transform"
                  >
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                    Use This Clip
                  </button>
                </div>
              )}

              <div className="absolute top-4 right-4">
                <button
                  onClick={closeCamera}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            /* No camera active: show prompt */
            <div className="text-center space-y-4 px-8">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <Video className="h-9 w-9 text-white/30" />
              </div>
              <div>
                <p className="text-white/70 text-lg font-medium">Select a shot to start recording</p>
                <p className="text-white/40 text-sm mt-1">
                  Choose a shot from the list and click Record to begin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Shot List */}
        <div className="w-[340px] border-l border-gray-200 flex flex-col overflow-hidden bg-white">
          {/* Phone session banner */}
          {phoneSessionUrl && (
            <div className="p-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Phone Recording</span>
              </div>
              <a
                href={phoneSessionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline break-all"
              >
                {phoneSessionUrl}
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => setPhoneSessionUrl(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold">Shot List</h2>
            <p className="text-xs text-muted-foreground">{completedShots}/{totalShots} completed</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {post.shotList.map((shot) => (
              <div
                key={shot.id}
                className={`p-3 rounded-xl border transition-all ${
                  shot.completed
                    ? "border-green-200 bg-green-50/50"
                    : activeShotId === shot.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    className="mt-0.5 shrink-0"
                    onClick={() => updateShotMutation.mutate({
                      shotId: shot.id,
                      completed: !shot.completed,
                    })}
                  >
                    {shot.completed ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Shot {shot.shotNumber}</Badge>
                      <span className="text-[10px] text-muted-foreground">{shot.duration}s</span>
                    </div>
                    <p className="text-xs leading-relaxed">{shot.instruction}</p>
                  </div>
                </div>

                {/* Record buttons — always visible */}
                <div className="mt-2 flex gap-2">
                  {shot.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] flex-1 h-7"
                      onClick={() => createSessionAndRecord(shot.id, "computer")}
                      disabled={sessionLoading || isRecording}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Re-record
                    </Button>
                  )}
                  {!shot.completed && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] flex-1 h-7"
                        onClick={() => createSessionAndRecord(shot.id, "phone")}
                        disabled={sessionLoading || isRecording}
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Phone
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] flex-1 h-7"
                        onClick={() => createSessionAndRecord(shot.id, "computer")}
                        disabled={sessionLoading || isRecording}
                      >
                        <Monitor className="h-3 w-3 mr-1" />
                        Record
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Finish Video button at bottom */}
          {completedShots > 0 && (
            <div className="p-4 border-t border-gray-100">
              <Link href={`/ai-editor/${post.id}`}>
                <Button size="sm" className="w-full bg-[#111] hover:bg-[#333] text-white">
                  Finish Video
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
