import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Bot,
  User,
  Wand2,
  Film,
  Scissors,
  Music,
  Type,
  Zap,
  Download,
  CheckCircle2,
  AlertCircle,
  Video,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post, Clip } from "@shared/schema";

interface AiEditMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  editOperations?: Array<{
    type: string;
    params: Record<string, any>;
    status: string;
  }>;
  createdAt: string;
}

interface AiEditSession {
  id: string;
  postId: string;
  userId: string;
  videoId: string | null;
  transcript: string | null;
  currentEditState: any;
  status: string;
}

interface SessionResponse {
  session: AiEditSession;
  messages: AiEditMessage[];
}

const QUICK_ACTIONS = [
  { label: "Trim silence", icon: Scissors, prompt: "Remove all silent parts and pauses from the video" },
  { label: "Add captions", icon: Type, prompt: "Add auto-generated captions to the video with a bold, viral style" },
  { label: "Speed up", icon: Zap, prompt: "Speed up the boring parts and slow down the exciting moments" },
  { label: "Add B-roll", icon: Film, prompt: "Suggest and add relevant B-roll footage at key moments in the video" },
  { label: "Cinematic look", icon: Wand2, prompt: "Apply a cinematic color grade and add smooth transitions between clips" },
  { label: "AI clip", icon: Film, prompt: "Generate a short AI cinematic intro clip using Luma" },
];

function EditOperationBadge({ op }: { op: { type: string; status: string } }) {
  const colors: Record<string, string> = {
    applied: "bg-green-500/10 text-green-600 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    failed: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  const labels: Record<string, string> = {
    trim: "Trim",
    cut: "Cut",
    speed_change: "Speed",
    add_caption: "Captions",
    add_music: "Music",
    add_filter: "Filter",
    add_transition: "Transition",
    add_broll: "B-Roll",
    luma_generate: "AI Clip",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs ${colors[op.status] || colors.pending}`}
    >
      {labels[op.type] || op.type} - {op.status}
    </Badge>
  );
}

export default function AiEditor() {
  const [, params] = useRoute("/ai-editor/:id");
  const [, setLocation] = useLocation();
  const postId = params?.id;
  const { toast } = useToast();

  const [inputValue, setInputValue] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [noMediaAvailable, setNoMediaAvailable] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Session state
  const [session, setSession] = useState<AiEditSession | null>(null);
  const [messages, setMessages] = useState<AiEditMessage[]>([]);

  // Fetch post data
  const { data: post, isLoading: postLoading } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  // Fetch clips for the post
  const { data: clips } = useQuery<Clip[]>({
    queryKey: ["/api/clips"],
  });

  const postClips = clips?.filter((c) => c.postId === postId) || [];
  const firstClipUrl = (postClips.find((c: any) => c.signedUrl || c.videoPath) as any)?.signedUrl || null;

  // Initialize or resume session
  const initSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-edit/sessions", { postId });
      return (await res.json()) as SessionResponse;
    },
    onSuccess: (data) => {
      setSession(data.session);
      setMessages(data.messages);
      // Auto-transcribe if no transcript
      if (!data.session.transcript) {
        handleTranscribe(data.session.id);
      }
    },
    onError: () => {
      toast({
        title: "Failed to start editing session",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send chat message
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/ai-edit/sessions/${session!.id}/chat`, {
        message,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      if (data.editState) {
        setSession((prev) => prev ? { ...prev, currentEditState: data.editState } : prev);
      }
    },
    onError: () => {
      toast({
        title: "Failed to process edit",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset edits
  const resetEdits = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ai-edit/sessions/${session!.id}/reset`);
      return await res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.message]);
      setSession((prev) => prev ? { ...prev, currentEditState: {} } : prev);
      toast({ title: "Edits reset", description: "All edits have been removed." });
    },
  });

  // Export edited video
  const exportVideo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/ai-edit/sessions/${session!.id}/export`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Video exported successfully!",
        description: "Your edited video is ready to download.",
      });
      // Save signed URL for download
      if (data.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = `edited-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setLocation(`/library`);
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error?.message || "Could not export the video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTranscribe = useCallback(async (sessionId: string) => {
    setIsTranscribing(true);
    try {
      const res = await apiRequest("POST", `/api/ai-edit/sessions/${sessionId}/transcribe`);
      const data = await res.json();
      setSession((prev) =>
        prev ? { ...prev, transcript: data.transcript } : prev,
      );
      toast({
        title: "Video transcribed",
        description: `Detected language: ${data.language || "en"}`,
      });
    } catch (err: any) {
      // Check if this is a no-media error (no clips/videos recorded yet)
      let errorCode = "";
      try {
        const errorData = err?.data || (err?.message && JSON.parse(err.message));
        errorCode = errorData?.code || "";
      } catch {
        // Not a JSON error
      }
      if (errorCode === "NO_CLIPS" || errorCode === "NO_VIDEO_PATH" ||
          (err?.message && (err.message.includes("No recorded clips") || err.message.includes("No video file")))) {
        setNoMediaAvailable(true);
      } else {
        toast({
          title: "Transcription failed",
          description: "Could not transcribe the video. You can still make edits.",
          variant: "destructive",
        });
      }
    } finally {
      setIsTranscribing(false);
    }
  }, [toast]);

  // Initialize session on mount
  useEffect(() => {
    if (postId && !session) {
      initSession.mutate();
    }
  }, [postId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const msg = inputValue.trim();
    if (!msg || sendMessage.isPending || !session) return;
    setInputValue("");
    sendMessage.mutate(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (sendMessage.isPending || !session) return;
    sendMessage.mutate(prompt);
  };

  // Loading state
  if (postLoading || initSession.isPending) {
    return (
      <div className="flex h-full bg-white">
        <div className="w-[420px] border-r border-gray-200 p-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-full rounded-2xl" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#111] mb-2">Post not found</h2>
          <Button onClick={() => setLocation("/dashboard")} className="bg-[#111] hover:bg-[#333] text-white rounded-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const editState = session?.currentEditState || {};
  const hasEdits = editState.cuts?.length || editState.filters?.length || editState.speedAdjustments?.length || editState.brollSegments?.length || editState.transitions?.length || editState.musicStyle || editState.captions;

  return (
    <div className="flex h-[calc(100vh-65px)] bg-white overflow-hidden">
      {/* Left Panel: Chat */}
      <div className="w-[420px] flex flex-col border-r border-gray-200">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/editor/${postId}`)}
            className="text-[#666] hover:text-[#111] hover:bg-gray-50 rounded-full shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#111] truncate">AI Editor</h2>
            <p className="text-xs text-[#666] truncate">{post.title}</p>
          </div>
          <div className="flex items-center gap-1">
            {isTranscribing && (
              <Badge variant="outline" className="text-xs gap-1 border-blue-200 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Transcribing
              </Badge>
            )}
            {session?.transcript && (
              <Badge variant="outline" className="text-xs border-green-200 text-green-600">
                Transcribed
              </Badge>
            )}
          </div>
        </div>

        {/* No media banner */}
        {noMediaAvailable && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-800">No recorded video found</p>
                <p className="text-xs text-amber-700">Record your video clips first, then come back to edit. You can still use the chat to plan your edits.</p>
                <Link href={`/director/${postId}`}>
                  <Button size="sm" variant="outline" className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
                    <Video className="h-3 w-3 mr-1" />
                    Go to Recording
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages
            .filter((m) => m.role !== "system")
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-[#111] text-white"
                      : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-[#111] text-white"
                      : "bg-gray-100 text-[#111]"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.editOperations && msg.editOperations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200/20">
                      {msg.editOperations.map((op, i) => (
                        <EditOperationBadge key={i} op={op} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#666]" />
                  <span className="text-sm text-[#666]">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-[#999] mb-2">Quick actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={sendMessage.isPending || !session}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#555] bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left disabled:opacity-50"
                >
                  <action.icon className="h-3.5 w-3.5 shrink-0" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your edit..."
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#111] placeholder:text-[#999] focus:outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111] transition-colors"
                style={{ minHeight: "40px", maxHeight: "120px" }}
              />
            </div>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending || !session}
              className="h-10 w-10 rounded-xl bg-[#111] hover:bg-[#333] text-white shrink-0 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel: Video Preview + Edit State */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        {/* Preview Header */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-medium text-[#111]">Preview</span>
            {hasEdits && (
              <Badge variant="outline" className="text-xs border-violet-200 text-violet-600">
                Edits applied
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasEdits && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetEdits.mutate()}
                disabled={resetEdits.isPending}
                className="text-xs text-[#666] hover:text-[#111] rounded-lg gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => exportVideo.mutate()}
              disabled={exportVideo.isPending || !session}
              className="text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg gap-1.5"
            >
              {exportVideo.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export Video
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Video Preview Area */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl">
            {firstClipUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={firstClipUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  loop
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        setIsPlaying(true);
                      } else {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }
                  }}
                />
                {/* Play/pause overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-7 w-7 text-[#111] ml-1" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3 px-8">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                    <Play className="h-7 w-7 text-white/60" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium">Video Preview</p>
                    <p className="text-white/40 text-xs mt-1">
                      {postClips.length > 0
                        ? `${postClips.length} clip${postClips.length > 1 ? "s" : ""} recorded`
                        : "No clips recorded yet"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit state overlay indicators */}
            {hasEdits && (
              <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                {editState.captions && (
                  <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1">
                    <Type className="h-2.5 w-2.5" /> Captions
                  </div>
                )}
                {editState.musicStyle && (
                  <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1">
                    <Music className="h-2.5 w-2.5" /> {editState.musicStyle}
                  </div>
                )}
                {editState.filters?.length > 0 && (
                  <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1">
                    <Wand2 className="h-2.5 w-2.5" /> {editState.filters.length} filter{editState.filters.length > 1 ? "s" : ""}
                  </div>
                )}
                {editState.cuts?.length > 0 && (
                  <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1">
                    <Scissors className="h-2.5 w-2.5" /> {editState.cuts.length} cut{editState.cuts.length > 1 ? "s" : ""}
                  </div>
                )}
                {editState.brollSegments?.length > 0 && (
                  <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1">
                    <Film className="h-2.5 w-2.5" /> {editState.brollSegments.length} B-roll
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transcript Display */}
        {session?.transcript && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#111]">Transcript</h3>
              <Badge variant="outline" className="text-xs border-green-200 text-green-600">
                Transcribed
              </Badge>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-3 border border-gray-100">
              <p className="text-xs leading-relaxed text-[#555] whitespace-pre-wrap select-text">
                {session.transcript}
              </p>
            </div>
          </div>
        )}

        {/* Edit State Summary Bar */}
        {hasEdits && (
          <div className="px-6 py-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-[#999] shrink-0">Active edits:</span>
              {editState.cuts?.map((cut: any, i: number) => (
                <Badge key={`cut-${i}`} variant="outline" className="text-xs shrink-0">
                  Cut {cut.start}s-{cut.end}s
                </Badge>
              ))}
              {editState.speedAdjustments?.map((s: any, i: number) => (
                <Badge key={`speed-${i}`} variant="outline" className="text-xs shrink-0">
                  {s.speed}x speed ({s.start}s-{s.end}s)
                </Badge>
              ))}
              {editState.transitions?.map((t: any, i: number) => (
                <Badge key={`trans-${i}`} variant="outline" className="text-xs shrink-0">
                  {t.type} transition
                </Badge>
              ))}
              {editState.captions && (
                <Badge variant="outline" className="text-xs shrink-0">Captions</Badge>
              )}
              {editState.musicStyle && (
                <Badge variant="outline" className="text-xs shrink-0">{editState.musicStyle}</Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
