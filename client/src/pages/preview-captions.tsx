import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Download,
  Play,
  Pause,
  Sparkles,
  Loader2,
  Send,
  Undo2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Video } from "@shared/schema";

interface EdlVersion {
  id: string;
  versionNumber: number;
  edlJson: any;
  previewUrl: string | null;
  finalUrl: string | null;
  renderStatus: string;
  renderProgress: number;
  notes: string | null;
  createdAt: string;
}

interface EditMessage {
  id: string;
  role: string;
  content: string;
  toolName: string | null;
  toolPayload: any;
  createdAt: string;
}

interface SessionData {
  session: {
    id: string;
    videoId: string;
    status: string;
    activeVersionId: string | null;
  };
  messages: EditMessage[];
  versions: EdlVersion[];
  activeVersion: EdlVersion | null;
}

const SUGGESTION_CHIPS = [
  "Tighten the cuts",
  "Add subtle zoom",
  "Add some b-roll",
  "Make captions pop",
  "Make it calmer",
  "More cinematic",
  "Change color grade",
  "Remove b-roll",
];

export default function PreviewCaptions() {
  const [, params] = useRoute("/videos/:videoId/preview");
  const [, setLocation] = useLocation();
  const videoId = params?.videoId;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: video, isLoading: videoLoading } = useQuery<Video>({
    queryKey: ["/api/videos", videoId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/videos/${videoId}`);
      return res.json();
    },
    enabled: !!videoId,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/studio/${videoId}/start`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setSessionId(data.sessionId);
    },
    onError: (error: any) => {
      toast({ title: "Couldn't connect to Navinta AI", description: "Please refresh to try again.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (videoId && !sessionId) {
      startMutation.mutate();
    }
  }, [videoId]);

  const sessionQuery = useQuery<SessionData>({
    queryKey: [`/api/studio/${sessionId}`],
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const status = data.session?.status;
      const renderStatus = data.activeVersion?.renderStatus;
      if (status === "generating" || status === "rendering" || renderStatus === "running" || renderStatus === "queued") {
        return 2000;
      }
      return false;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/studio/${sessionId}/message`, { content });
      return res.json();
    },
    onSuccess: () => {
      setIsProcessing(true);
      queryClient.invalidateQueries({ queryKey: [`/api/studio/${sessionId}`] });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/studio/${sessionId}/undo`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/studio/${sessionId}`] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/studio/${sessionId}/export`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Video exported!", description: "Your video is ready to download." });
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.includes("403") || msg.includes("PLAN_REQUIRED")) {
        toast({ title: "Upgrade required", description: "Export requires a paid plan.", variant: "destructive" });
      } else {
        toast({ title: "Export failed", description: "Unable to export. Please try again.", variant: "destructive" });
      }
    },
  });

  useEffect(() => {
    const status = sessionQuery.data?.session?.status;
    if (status && status !== "generating" && status !== "rendering") {
      setIsProcessing(false);
    }
  }, [sessionQuery.data?.session?.status]);

  useEffect(() => {
    const msgs = sessionQuery.data?.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && (lastMsg.role === "assistant" || lastMsg.role === "tool") && isProcessing) {
      setIsProcessing(false);
    }
  }, [sessionQuery.data?.messages?.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionQuery.data?.messages]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !sessionId || isProcessing) return;
    setInputText("");
    sendMutation.mutate(text);
  }, [inputText, sessionId, isProcessing, sendMutation]);

  const handleChip = useCallback((text: string) => {
    if (!sessionId || isProcessing) return;
    sendMutation.mutate(text);
  }, [sessionId, isProcessing, sendMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  const data = sessionQuery.data;
  const activeVersion = data?.activeVersion;
  const messages = data?.messages || [];
  const sessionStatus = data?.session?.status || "loading";

  const edlSummary = activeVersion?.edlJson ? {
    clips: activeVersion.edlJson.clips?.length || 0,
    captionStyle: activeVersion.edlJson.captionStyleId || "default",
    brollCount: activeVersion.edlJson.lumaBroll?.length || 0,
    colorGrade: activeVersion.edlJson.colorGrade || "none",
  } : null;

  const previewSrc = activeVersion?.previewUrl || activeVersion?.finalUrl || null;

  if (videoLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="w-full space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-100" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="aspect-[9/16] max-h-[70vh] bg-gray-100 rounded-3xl" />
            <Skeleton className="h-[70vh] bg-gray-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#111111] mb-4">Video not found</h2>
          <Button onClick={() => setLocation("/library")} className="bg-[#111111] hover:bg-[#333333] text-white rounded-full px-6">
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  const videoUrl = (video as any).signedUrl
    || (video.videoPath
      ? `/api/storage/videos/${video.videoPath}`
      : video.videoData?.startsWith("http")
        ? video.videoData
        : `/uploads/videos/${video.videoData}`);

  const displayVideoSrc = previewSrc || videoUrl;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/director/${video.postId}`)}
            className="text-[#666666] hover:text-[#111111] hover:bg-gray-50 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-base font-semibold text-[#111111] leading-tight">{video.title}</h1>
            <p className="text-xs text-[#999]">Navinta AI Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeVersion && activeVersion.versionNumber > 1 && (
            <>
              <span className="text-[10px] text-[#999] px-2 py-0.5 bg-gray-100 rounded-full">
                v{activeVersion.versionNumber}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => undoMutation.mutate()}
                disabled={undoMutation.isPending}
                className="rounded-full text-xs border-gray-200 h-7 px-2.5"
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Undo
              </Button>
            </>
          )}
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || !sessionId}
            size="sm"
            className="bg-[#111111] hover:bg-[#333333] text-white rounded-full text-xs h-7 px-4"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden min-h-0">
        <div className="lg:col-span-2 flex flex-col bg-white border-r border-gray-100 min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#111]">Navinta AI</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-3 bg-gray-50 border border-gray-100 text-sm text-[#333] leading-relaxed">
                Hey! I'm Navinta, your AI video editor. Just tell me what you want — like "tighten the cuts", "add some b-roll", "make it more cinematic", or anything else. I'll make the edits and you'll see them live right here.
              </div>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-tr-md bg-[#111] text-white"
                      : msg.role === "tool"
                      ? "rounded-xl bg-indigo-50 text-indigo-700 text-xs border border-indigo-100"
                      : "rounded-2xl rounded-tl-md bg-gray-50 text-[#333] border border-gray-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {(isProcessing || sessionStatus === "generating") && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md bg-gray-50 border border-gray-100 px-4 py-3 flex items-center gap-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-[#999]">Working on it...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-gray-100 px-3 py-3 space-y-2.5 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  disabled={isProcessing || !sessionId}
                  className="px-2.5 py-1 text-[11px] rounded-full bg-gray-50 text-[#666] hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 transition-colors border border-gray-100 hover:border-indigo-200"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={sessionId ? "Tell Navinta what to change..." : "Connecting..."}
                disabled={isProcessing || !sessionId}
                rows={1}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-[#111] placeholder-[#bbb] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 disabled:opacity-40 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing || !sessionId}
                className="p-2.5 rounded-2xl bg-[#111] hover:bg-[#333] text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-4 overflow-hidden">
            <video
              ref={videoRef}
              key={displayVideoSrc}
              src={displayVideoSrc}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
              crossOrigin="anonymous"
              autoPlay
              loop
            />
          </div>

          {activeVersion && (activeVersion.renderStatus === "running" || activeVersion.renderStatus === "queued") && (
            <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 shrink-0">
              <div className="flex items-center gap-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />
                <span className="text-xs text-indigo-700">Rendering... {activeVersion.renderProgress}%</span>
                <div className="flex-1 h-1 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${activeVersion.renderProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-2.5 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={handlePlayPause} className="text-[#111] hover:bg-gray-100 rounded-full p-1.5 transition-colors">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="text-[11px] text-[#999] w-12 font-mono">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 rounded-full appearance-none bg-gray-200 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#111]"
              />
              <span className="text-[11px] text-[#999] w-12 text-right font-mono">{formatTime(duration)}</span>
            </div>

            {edlSummary && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-[#bbb]">{edlSummary.clips} clips</span>
                <span className="text-[10px] text-[#ddd]">|</span>
                <span className="text-[10px] text-[#bbb]">{edlSummary.captionStyle}</span>
                {edlSummary.brollCount > 0 && (
                  <>
                    <span className="text-[10px] text-[#ddd]">|</span>
                    <span className="text-[10px] text-[#bbb]">{edlSummary.brollCount} b-roll</span>
                  </>
                )}
                {edlSummary.colorGrade !== "none" && (
                  <>
                    <span className="text-[10px] text-[#ddd]">|</span>
                    <span className="text-[10px] text-[#bbb]">{edlSummary.colorGrade}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {exportMutation.isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#111] mb-1">Export Ready</h3>
            <p className="text-sm text-[#666] mb-5">Your video has been rendered and is ready to download.</p>
            <div className="flex gap-2">
              <a
                href={(exportMutation.data as any)?.exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#111] hover:bg-[#333] text-white text-sm font-medium transition-colors text-center"
              >
                Download
              </a>
              <button
                onClick={() => exportMutation.reset()}
                className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm text-[#666] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
