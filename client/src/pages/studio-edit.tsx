import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, Component } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Send,
  Undo2,
  Download,
  Lock,
  Loader2,
  Film,
  MessageSquare,
  Sparkles,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Brain,
  ImagePlus,
  Paintbrush,
  Eye,
  ScrollText,
} from "lucide-react";
import { TranscriptPanel } from "@/components/studio/TranscriptPanel";

const RemotionPreview = lazy(() =>
  import("@/components/studio/RemotionPreview").then((m) => ({
    default: m.RemotionPreview,
  }))
);

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

interface EditRunData {
  id: string;
  status: string;
  currentStep: number;
  step1Status: string;
  step2Status: string;
  step3Status: string;
  step4Status: string;
  step1Progress: number;
  step2Progress: number;
  step3Progress: number;
  step4Progress: number;
  step1Summary: string | null;
  step2Summary: string | null;
  step3Summary: string | null;
  step4Summary: string | null;
  error: string | null;
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
  latestEditRun: EditRunData | null;
}

const EDIT_STEPS = [
  { key: "planning", label: "Planning…", icon: Brain, step: 1 },
  { key: "generating_assets", label: "Generating assets…", icon: ImagePlus, step: 2 },
  { key: "applying_edits", label: "Applying edits…", icon: Paintbrush, step: 3 },
  { key: "completed", label: "Updated preview", icon: Eye, step: 4 },
] as const;

function getEditStatusInfo(editRun: EditRunData | null, sessionStatus: string) {
  if (!editRun) return null;

  const isActive = sessionStatus === "generating" ||
    ["planning", "generating_assets", "applying_edits", "queued", "running"].includes(editRun.status);
  const isFailed = editRun.status === "failed" || sessionStatus === "failed";
  const isCompleted = editRun.status === "completed" && sessionStatus === "idle";

  if (!isActive && !isFailed && !isCompleted) return null;

  const activeStepIndex = EDIT_STEPS.findIndex((s) => s.key === editRun.status);

  return { isActive, isFailed, isCompleted, activeStepIndex, editRun };
}

const SUGGESTION_CHIPS = [
  "Tighten cuts",
  "Add subtle zoom",
  "Add b-roll",
  "Make captions pop",
  "Make it calmer",
  "Remove b-roll",
  "More cinematic",
];

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode; resetKey?: string },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidUpdate(prevProps: { resetKey?: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 text-[#666] p-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-sm text-center text-[#999]">Preview couldn't load</p>
          <p className="text-xs text-[#555] text-center max-w-[250px]">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StudioEdit() {
  const { videoId } = useParams<{ videoId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "transcript">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const forcePollCountRef = useRef(0);
  const processingFromVersionRef = useRef<string | null>(null);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/studio/${videoId}/start`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setSessionId(data.sessionId);
    },
  });

  useEffect(() => {
    if (videoId) {
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
      const editRunStatus = data.latestEditRun?.status;
      if (
        status === "generating" ||
        status === "rendering" ||
        renderStatus === "running" ||
        renderStatus === "queued" ||
        editRunStatus === "planning" ||
        editRunStatus === "generating_assets" ||
        editRunStatus === "applying_edits" ||
        editRunStatus === "queued" ||
        editRunStatus === "running"
      ) {
        return 1500;
      }
      if (forcePollCountRef.current > 0) {
        forcePollCountRef.current--;
        return 1500;
      }
      if (isProcessing) {
        return 1500;
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
      processingFromVersionRef.current = sessionQuery.data?.activeVersion?.id || null;
      setIsProcessing(true);
      forcePollCountRef.current = 10;
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
  });

  useEffect(() => {
    if (!isProcessing) return;
    const status = sessionQuery.data?.session?.status;
    const currentVersionId = sessionQuery.data?.activeVersion?.id;
    // Reset processing when a new version appears or session moves to terminal state
    if (status === "failed") {
      setIsProcessing(false);
      processingFromVersionRef.current = null;
    } else if (
      status === "idle" &&
      currentVersionId &&
      currentVersionId !== processingFromVersionRef.current
    ) {
      setIsProcessing(false);
      processingFromVersionRef.current = null;
    }
  }, [sessionQuery.data?.session?.status, sessionQuery.data?.activeVersion?.id, isProcessing]);

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

  const data = sessionQuery.data;
  const activeVersion = data?.activeVersion;
  const messages = data?.messages || [];
  const versions = data?.versions || [];
  const sessionStatus = data?.session?.status || "loading";
  const editStatusInfo = getEditStatusInfo(data?.latestEditRun || null, sessionStatus);

  const edlSummary = activeVersion?.edlJson ? {
    clips: activeVersion.edlJson.clips?.length || 0,
    captionStyle: activeVersion.edlJson.captionStyleId || "default",
    brollCount: activeVersion.edlJson.lumaBroll?.length || 0,
    colorGrade: activeVersion.edlJson.colorGrade || "none",
    transitions: activeVersion.edlJson.clips?.[0]?.transitionType || "none",
  } : null;

  const previewSrc = activeVersion?.previewUrl || activeVersion?.finalUrl || null;
  const videoSrc = activeVersion?.edlJson?.clips?.[0]?.src || null;
  const displaySrc = previewSrc || videoSrc;
  const renderFailed = activeVersion?.renderStatus === "failed";
  const isRendering = activeVersion?.renderStatus === "running" || activeVersion?.renderStatus === "queued";

  if (startMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0D10]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-[#999]">Initializing studio...</p>
        </div>
      </div>
    );
  }

  if (startMutation.isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0D10]">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-red-400">Failed to start studio session</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0D10] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0B0D10]/90 backdrop-blur-xl z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#999]" />
          </button>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-sm">Director Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeVersion && (
            <span className="text-xs text-[#666] px-2 py-1 bg-white/[0.04] rounded">
              v{activeVersion.versionNumber}
            </span>
          )}
          <button
            onClick={() => undoMutation.mutate()}
            disabled={!activeVersion || activeVersion.versionNumber <= 1 || undoMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || !activeVersion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Export
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
        <div className="lg:col-span-3 flex flex-col border-r border-white/[0.06]">
          <div className="flex-1 flex items-center justify-center p-6 bg-black/20 relative">
            {activeVersion?.edlJson?.clips?.length > 0 && activeVersion ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <PreviewErrorBoundary resetKey={activeVersion.id}>
                  <Suspense
                    fallback={
                      <div className="flex flex-col items-center gap-3 text-[#666]">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm">Loading preview...</p>
                      </div>
                    }
                  >
                    <RemotionPreview key={activeVersion.id} edl={activeVersion.edlJson} />
                  </Suspense>
                </PreviewErrorBoundary>
                {edlSummary && activeVersion.versionNumber > 1 && (
                  <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 z-10">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/70">
                      {edlSummary.colorGrade !== "none" && (
                        <span className="px-1.5 py-0.5 bg-white/10 rounded">{edlSummary.colorGrade}</span>
                      )}
                      {edlSummary.transitions !== "none" && (
                        <span className="px-1.5 py-0.5 bg-white/10 rounded">{edlSummary.transitions}</span>
                      )}
                      {edlSummary.brollCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-white/10 rounded">{edlSummary.brollCount} b-roll</span>
                      )}
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">{edlSummary.clips} clips</span>
                      <span className="px-1.5 py-0.5 bg-white/10 rounded">{edlSummary.captionStyle}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : displaySrc ? (
              <div className="relative max-w-full max-h-full">
                <video
                  key={displaySrc}
                  src={displaySrc}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-[#666]">
                <Film className="w-12 h-12" />
                <p className="text-sm">No preview available</p>
              </div>
            )}
          </div>

          {activeVersion && (
            <div className="px-4 py-3 border-t border-white/[0.06] bg-[#11141A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {activeVersion.renderStatus === "running" || activeVersion.renderStatus === "queued" ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      <span className="text-xs text-blue-400">
                        Rendering... {activeVersion.renderProgress}%
                      </span>
                      <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${activeVersion.renderProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : activeVersion.renderStatus === "failed" ? (
                    <span className="text-xs text-amber-400">Edits saved (preview rendering offline)</span>
                  ) : (
                    <span className="text-xs text-emerald-400">Ready</span>
                  )}
                </div>

                {edlSummary && (
                  <div className="flex items-center gap-3 text-[10px] text-[#666]">
                    <span>{edlSummary.clips} clips</span>
                    <span>Style: {edlSummary.captionStyle}</span>
                    {edlSummary.brollCount > 0 && <span>{edlSummary.brollCount} b-roll</span>}
                    {edlSummary.colorGrade !== "none" && <span>{edlSummary.colorGrade}</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col bg-[#11141A]">
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "chat"
                  ? "text-white border-blue-500"
                  : "text-[#666] border-transparent hover:text-[#999]"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "transcript"
                  ? "text-white border-blue-500"
                  : "text-[#666] border-transparent hover:text-[#999]"
              }`}
            >
              <ScrollText className="w-4 h-4" />
              Transcript
            </button>
          </div>

          {activeTab === "transcript" ? (
            <TranscriptPanel videoId={videoId!} />
          ) : (
          <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Sparkles className="w-10 h-10 text-blue-500/40 mb-4" />
                <p className="text-sm text-[#999] mb-1">Tell the AI director what you want</p>
                <p className="text-xs text-[#666]">
                  Try "Tighten the cuts" or "Add cinematic zoom"
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : msg.role === "tool"
                      ? "bg-white/[0.04] text-[#888] text-xs italic border border-white/[0.06]"
                      : "bg-white/[0.06] text-[#ddd]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {(isProcessing || sessionStatus === "generating") && editStatusInfo?.isActive && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] rounded-xl px-4 py-3 w-full max-w-[85%] space-y-2">
                  {EDIT_STEPS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const stepStatusKey = `step${stepNum}Status` as keyof EditRunData;
                    const stepSummaryKey = `step${stepNum}Summary` as keyof EditRunData;
                    const stepStatus = editStatusInfo.editRun[stepStatusKey] as string;
                    const stepSummary = editStatusInfo.editRun[stepSummaryKey] as string | null;
                    const StepIcon = step.icon;
                    const isRunning = stepStatus === "running";
                    const isComplete = stepStatus === "completed";
                    const isQueued = stepStatus === "queued";

                    return (
                      <div key={step.key} className={`flex items-center gap-2.5 transition-opacity duration-300 ${isQueued ? "opacity-30" : "opacity-100"}`}>
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                        ) : isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <StepIcon className="w-4 h-4 text-[#555] shrink-0" />
                        )}
                        <span className={`text-xs ${isRunning ? "text-blue-400" : isComplete ? "text-emerald-400/80" : "text-[#555]"}`}>
                          {stepSummary || step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(isProcessing || sessionStatus === "generating") && !editStatusInfo?.isActive && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-[#888]">Thinking...</span>
                </div>
              </div>
            )}

            {editStatusInfo?.isFailed && (
              <div className="flex justify-start">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-xs font-medium text-red-400">Edit failed</span>
                  </div>
                  {editStatusInfo.editRun.error && (
                    <p className="text-[11px] text-red-300/70 ml-6">{editStatusInfo.editRun.error}</p>
                  )}
                </div>
              </div>
            )}

            {editStatusInfo?.isCompleted && !isProcessing && (
              <div className="flex justify-start">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-400">Preview updated</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-white/[0.06] p-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  disabled={isProcessing || !sessionId}
                  className="px-2.5 py-1 text-[11px] rounded-full bg-white/[0.06] text-[#aaa] hover:bg-white/[0.1] hover:text-white disabled:opacity-30 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell the director what to change…"
                disabled={isProcessing || !sessionId}
                rows={1}
                className="flex-1 bg-white/[0.06] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#666] resize-none focus:outline-none focus:border-blue-500/50 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing || !sessionId}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {exportMutation.isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#11141A] border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            <Download className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Export Ready</h3>
            <p className="text-sm text-[#999] mb-4">Your video has been rendered</p>
            <div className="flex gap-2">
              <a
                href={(exportMutation.data as any)?.exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
              >
                Download
              </a>
              <button
                onClick={() => exportMutation.reset()}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {exportMutation.isError && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-sm">
          <p className="text-sm text-red-400">
            {(exportMutation.error as any)?.message?.includes("403")
              ? "Export requires a paid plan"
              : "Export failed. Please try again."}
          </p>
          <button
            onClick={() => exportMutation.reset()}
            className="text-xs text-red-300 mt-1 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
