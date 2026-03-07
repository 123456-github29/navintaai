import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface Step {
  step: number;
  status: string;
  progress: number;
  summary: string | null;
}

interface EditRunData {
  id: string;
  videoId: string;
  status: string;
  currentStep: number;
  steps: Step[];
  outputUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const STEP_CONFIG = [
  {
    title: "Context Analysis",
    description: "We process your video like a real editor would \u2014 analyzing your script, pacing, lighting, and framing.",
    icon: MagnifyingGlassIcon,
  },
  {
    title: "Storyboard Creation",
    description: "We generate a storyboard tailored to your video using transcript + visual processing.",
    icon: RectangleGroupIcon,
  },
  {
    title: "Animation",
    description: "Each canvas is animated element-by-element \u2014 captions, transitions, and motion \u2014 the way a professional editor would.",
    icon: SparklesIcon,
  },
  {
    title: "Integration",
    description: "We integrate the approved animations into your video, render the final export, and you download it to post.",
    icon: ArrowDownTrayIcon,
  },
];

interface ProEditModalProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  onComplete?: () => void;
}

export default function ProEditModal({ open, onClose, videoId, onComplete }: ProEditModalProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [runData, setRunData] = useState<EditRunData | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);

  const isActive = runData && (runData.status === "queued" || runData.status === "running");
  const isComplete = runData?.status === "succeeded";
  const isFailed = runData?.status === "failed";

  const startPipeline = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const response = await apiRequest("POST", `/api/videos/${videoId}/auto-edit`);
      const data = await response.json();
      setRunId(data.runId);
    } catch (err: any) {
      setError(err.message || "Failed to start auto-edit");
    } finally {
      setStarting(false);
    }
  }, [videoId]);

  const pollStatus = useCallback(async () => {
    if (!runId) return;
    try {
      const response = await apiRequest("GET", `/api/edit-runs/${runId}`);
      const data: EditRunData = await response.json();
      setRunData(data);

      if (data.status === "succeeded" || data.status === "failed") {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (data.status === "failed" && data.error) {
          setError(data.error);
        }
      }
    } catch (err: any) {
      console.error("[pro-edit-ui] Poll error:", err.message);
    }
  }, [runId]);

  useEffect(() => {
    if (!open) return;
    const checkLatest = async () => {
      try {
        const response = await apiRequest("GET", `/api/videos/${videoId}/edit-runs/latest`);
        const data = await response.json();
        if (data.run) {
          setRunId(data.run.id);
          setRunData(data.run);
          if (data.run.status === "queued" || data.run.status === "running") {
            // will start polling via runId effect
          }
        }
      } catch {}
    };
    checkLatest();
  }, [open, videoId]);

  useEffect(() => {
    if (!runId) return;
    pollStatus();
    pollRef.current = window.setInterval(pollStatus, 1500);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runId, pollStatus]);

  const handleRetry = async (fromStep?: number) => {
    setRunId(null);
    setRunData(null);
    setError(null);
    await startPipeline();
  };

  const getStepStatus = (stepIdx: number): Step | null => {
    return runData?.steps[stepIdx] || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "text-emerald-600";
      case "running": return "text-blue-600";
      case "failed": return "text-red-600";
      default: return "text-gray-400";
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case "succeeded": return "bg-emerald-500";
      case "running": return "bg-blue-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-white border border-gray-200 shadow-xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-lg font-semibold text-[#111111] tracking-tight">
            Pro Edit Pipeline
          </DialogTitle>
          <p className="text-sm text-[#666666] mt-1">
            AI-powered professional editing in 4 steps
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {!runId && !starting && (
            <div className="text-center py-4">
              <p className="text-sm text-[#666666] mb-4">
                Our AI will analyze your video, create a storyboard, apply cinematic effects, and render the final export.
              </p>
              <Button
                onClick={startPipeline}
                className="bg-[#111111] hover:bg-[#111111]/90 text-white px-6 h-10"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Start Auto Edit
              </Button>
            </div>
          )}

          {starting && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-[#666666]">Starting pipeline...</span>
            </div>
          )}

          {runId && (
            <div className="space-y-3">
              {STEP_CONFIG.map((config, idx) => {
                const stepData = getStepStatus(idx);
                const status = stepData?.status || "queued";
                const progress = stepData?.progress || 0;
                const summary = stepData?.summary;
                const isExpanded = expandedStep === idx;
                const isCurrentStep = runData?.currentStep === idx + 1;
                const Icon = config.icon;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all duration-300 ${
                      isCurrentStep && status === "running"
                        ? "border-blue-200 bg-blue-50/30 shadow-sm"
                        : status === "succeeded"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : status === "failed"
                        ? "border-red-200 bg-red-50/20"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="p-3.5">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          status === "succeeded" ? "bg-emerald-100" :
                          status === "running" ? "bg-blue-100" :
                          status === "failed" ? "bg-red-100" : "bg-gray-100"
                        }`}>
                          {status === "succeeded" ? (
                            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                          ) : status === "failed" ? (
                            <XCircleIcon className="h-4 w-4 text-red-600" />
                          ) : status === "running" ? (
                            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#999] uppercase tracking-wider">
                                Step {idx + 1}
                              </span>
                              <h4 className="text-sm font-medium text-[#111111] -mt-0.5">
                                {config.title}
                              </h4>
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-wider ${getStatusColor(status)}`}>
                              {status === "succeeded" ? "Done" :
                               status === "running" ? "Running" :
                               status === "failed" ? "Failed" : "Queued"}
                            </span>
                          </div>

                          <p className="text-xs text-[#888] mt-1 leading-relaxed">
                            {config.description}
                          </p>

                          {(status === "running" || status === "succeeded") && (
                            <div className="mt-2.5">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressBarColor(status)}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#999] mt-0.5 block">{progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {summary && (
                        <div className="mt-2 ml-11">
                          <button
                            onClick={() => setExpandedStep(isExpanded ? null : idx)}
                            className="flex items-center gap-1 text-[10px] text-[#888] hover:text-[#666] transition-colors"
                          >
                            {isExpanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                            {isExpanded ? "Hide details" : "Show details"}
                          </button>
                          {isExpanded && (
                            <p className="text-[11px] text-[#666] mt-1.5 leading-relaxed bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                              {summary}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {isComplete && runData?.outputUrl && (
            <div className="pt-2 space-y-2.5">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircleIcon className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-emerald-800">Your video is ready!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Post it and watch it go viral =)</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={runData.outputUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-[#111111] hover:bg-[#111111]/90 text-white h-9 text-sm">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-sm border-gray-200 text-[#666666] hover:text-[#111111]"
                  onClick={() => {
                    onComplete?.();
                    onClose();
                  }}
                >
                  View in Library
                </Button>
              </div>
            </div>
          )}

          {isComplete && !runData?.outputUrl && (
            <div className="pt-2 space-y-2.5">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircleIcon className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-emerald-800">Edit complete!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Your video has been updated in the library.</p>
              </div>
              <Button
                variant="outline"
                className="w-full h-9 text-sm border-gray-200 text-[#666666] hover:text-[#111111]"
                onClick={() => {
                  onComplete?.();
                  onClose();
                }}
              >
                View in Library
              </Button>
            </div>
          )}

          {isFailed && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full h-9 text-sm border-gray-200 text-[#666666] hover:text-[#111111]"
                onClick={handleRetry}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Retry Pipeline
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
