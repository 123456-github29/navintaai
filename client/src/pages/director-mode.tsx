import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeftIcon,
  XMarkIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  FilmIcon,
  SwatchIcon,
  MusicalNoteIcon,
  BoltIcon,
  MicrophoneIcon,
  PencilSquareIcon,
  ScissorsIcon,
  StarIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  ClockIcon,
  CameraIcon,
  Square2StackIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { SiInstagram } from "react-icons/si";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { VoiceoverModal } from "@/components/VoiceoverModal";
import { TeleprompterOverlay } from "@/components/TeleprompterOverlay";
import ProEditModal from "@/components/ProEditModal";
import { useSubscription } from "@/hooks/use-subscription";
import type { Post } from "@shared/schema";

const AI_TOOLS = [
  { id: "captions", icon: SparklesIcon, label: "Generate Captions", description: "Auto-generate captions from speech", requiredFeature: null },
  { id: "voiceover", icon: SpeakerWaveIcon, label: "AI Voiceover", description: "Generate professional voiceover", requiredFeature: "aiVoice" as const },
  { id: "broll", icon: FilmIcon, label: "Generate B-roll", description: "Add stock B-roll footage", requiredFeature: "aiBroll" as const },
  { id: "luma_broll", icon: CameraIcon, label: "AI B-roll (Luma)", description: "Generate AI B-roll with Luma", requiredFeature: "aiBroll" as const },
  { id: "colorgrade", icon: SwatchIcon, label: "Apply Color Grade", description: "Professional color grading", requiredFeature: "autoEditing" as const },
  { id: "music", icon: MusicalNoteIcon, label: "Add Music", description: "AI-matched background music", requiredFeature: null },
  { id: "transitions", icon: BoltIcon, label: "Smooth Transitions", description: "Add professional transitions", requiredFeature: "autoEditing" as const },
  { id: "audio", icon: MicrophoneIcon, label: "Enhance Audio", description: "Noise reduction & enhancement", requiredFeature: "autoEditing" as const },
  { id: "rewrite", icon: PencilSquareIcon, label: "Rewrite Script", description: "AI script improvements", requiredFeature: "aiContentPlanning" as const },
  { id: "autoedit", icon: ScissorsIcon, label: "Auto Edit", description: "Full AI edit pipeline", requiredFeature: "autoEditing" as const },
  { id: "emphasis", icon: StarIcon, label: "Add Emphasis", description: "Highlight key moments", requiredFeature: "autoEditing" as const },
];

interface LumaBrollInsert {
  insertId: string;
  prompt: string;
  generationType?: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  assetUrl?: string;
  error?: string;
  startFrame?: number;
  durationInFrames?: number;
  cameraMove?: string;
  loop?: boolean;
  sourceImageUrl?: string;
  sourceGenerationId?: string;
  lumaJobId?: string;
}

const CAMERA_MOVE_OPTIONS = [
  { value: "", label: "None (AI decides)" },
  { value: "orbit_left", label: "Orbit Left" },
  { value: "orbit_right", label: "Orbit Right" },
  { value: "dolly_in", label: "Dolly In" },
  { value: "dolly_out", label: "Dolly Out" },
  { value: "pan_left", label: "Pan Left" },
  { value: "pan_right", label: "Pan Right" },
  { value: "crane_up", label: "Crane Up" },
  { value: "crane_down", label: "Crane Down" },
  { value: "zoom_in", label: "Zoom In" },
  { value: "zoom_out", label: "Zoom Out" },
  { value: "tracking_left", label: "Tracking Left" },
  { value: "tracking_right", label: "Tracking Right" },
  { value: "handheld", label: "Handheld" },
  { value: "push_in", label: "Push In" },
  { value: "pull_out", label: "Pull Out" },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function DirectorMode() {
  const [, params] = useRoute("/director/:id");
  const [, setLocation] = useLocation();
  const postId = params?.id;
  const { toast } = useToast();
  const { subscription, canUse, plan } = useSubscription();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showProEditModal, setShowProEditModal] = useState(false);
  const [activeAiTool, setActiveAiTool] = useState<string | null>(null);
  const [showVoiceoverModal, setShowVoiceoverModal] = useState(false);
  const [voiceoverApplied, setVoiceoverApplied] = useState(false);
  const [teleprompterOn, setTeleprompterOn] = useState(false);
  const [brollLoading, setBrollLoading] = useState(false);
  const [brollSlots, setBrollSlots] = useState<any[]>([]);
  const [brollResults, setBrollResults] = useState<any[]>([]);

  const [lumaBrollInserts, setLumaBrollInserts] = useState<LumaBrollInsert[]>([]);
  const [lumaBrollLoading, setLumaBrollLoading] = useState(false);
  const [lumaBrollPolling, setLumaBrollPolling] = useState(false);
  const [includeLumaBroll, setIncludeLumaBroll] = useState(true);
  const [regenPromptInsertId, setRegenPromptInsertId] = useState<string | null>(null);
  const [regenPromptText, setRegenPromptText] = useState("");
  const lumaPollRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrPairUrl, setQrPairUrl] = useState<string | null>(null);
  const [qrSessionStatus, setQrSessionStatus] = useState<string>("pending");
  const qrPollRef = useRef<number | null>(null);

  const [showCustomLumaPanel, setShowCustomLumaPanel] = useState(false);
  const [customLumaPrompt, setCustomLumaPrompt] = useState("");
  const [customLumaCamera, setCustomLumaCamera] = useState("");
  const [customLumaLoop, setCustomLumaLoop] = useState(false);
  const [customLumaType, setCustomLumaType] = useState<"text_to_video" | "image_to_video" | "extend">("text_to_video");
  const [customLumaImageUrl, setCustomLumaImageUrl] = useState("");
  const [customLumaExtendId, setCustomLumaExtendId] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  const { data: teleprompterData, isLoading: teleprompterLoading, isError: teleprompterError } = useQuery<{
    cards: Array<{ text: string; durationSec: number; beatType: string }>;
    fullScript: string;
    totalDuration: number;
    wordCount: number;
  }>({
    queryKey: ["/api/posts", postId, "teleprompter"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${postId}/teleprompter`);
      return res.json();
    },
    enabled: !!postId && teleprompterOn,
  });

  const updateShotMutation = useMutation({
    mutationFn: ({ shotId, completed }: { shotId: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/posts/${postId}/shots/${shotId}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
    },
  });

  const saveClipMutation = useMutation({
    mutationFn: async (data: { shotId: string; blob: Blob; duration: number }) => {
      console.log("[saveClip] Starting save with blob size:", data.blob.size, "type:", data.blob.type);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      console.log("[saveClip] Session found:", !!session, "Token:", !!token);
      
      if (!token) {
        throw new Error("Please sign in to save clips");
      }
      
      const formData = new FormData();
      formData.append("video", data.blob, `clip-${Date.now()}.webm`);
      formData.append("postId", postId || "");
      formData.append("shotId", data.shotId);
      formData.append("duration", String(data.duration));
      
      console.log("[saveClip] Sending request to /api/clips/upload");
      const response = await fetch("/api/clips/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
        credentials: "include",
      });
      
      console.log("[saveClip] Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[saveClip] Error response:", errorData);
        const errorMsg = typeof errorData.error === 'string' 
          ? errorData.error 
          : (errorData.message || `Upload failed: ${response.status}`);
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      console.log("[saveClip] Success:", result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Shot saved!",
        description: "Your clip has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
    },
    onError: (error: any) => {
      const errorMessage = typeof error === 'string' 
        ? error 
        : (error?.message || "Please try again.");
      toast({
        title: "Failed to save clip",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const finishVideoMutation = useMutation({
    mutationFn: async () => {
      const musicStyle = post?.musicVibe || "Upbeat & Energetic";
      const exportResponse = await apiRequest("POST", "/api/videos/export", {
        postId,
        hasCaption: true,
        musicStyle,
      });
      
      const video = await exportResponse.json();
      
      try {
        await apiRequest("POST", `/api/videos/${video.id}/transcribe`);
      } catch (transcribeError) {
        console.warn("Transcription warning:", transcribeError);
      }

      try {
        await apiRequest("POST", `/api/videos/${video.id}/export-with-captions`, {
          captions: [],
          styleSettings: {},
          effects: {
            smartEdit: true,
            platform: (post?.platform || "tiktok").toLowerCase(),
            includeLumaBroll,
          },
        });
      } catch (renderError) {
        console.warn("AI render warning:", renderError);
      }
      
      return video;
    },
    onSuccess: (video: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setLocation(`/videos/${video.id}/preview`);
    },
    onError: (error: any) => {
      const message = error?.message || "Unable to create your video. Please try again.";
      toast({
        title: "Export failed",
        description: message.includes("No clips") 
          ? "Please record and save at least one shot before finishing." 
          : message,
        variant: "destructive",
      });
    },
  });

  const generateCaptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/videos?postId=${postId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch videos. Please try again.");
      }
      const videos = await response.json();
      if (!videos || videos.length === 0) {
        throw new Error("No video found. Please finish recording and export the video first.");
      }
      const videoId = videos[0].id;
      const transcribeResponse = await apiRequest("POST", `/api/videos/${videoId}/transcribe`);
      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate captions.");
      }
      return transcribeResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Captions Generated!",
        description: "Your video now has animated word-by-word captions.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Caption Generation Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (lumaPollRef.current) {
        clearInterval(lumaPollRef.current);
      }
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current && isCameraOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraOn]);

  useEffect(() => {
    if (!lumaBrollPolling || !postId) return;

    const pollStatus = async () => {
      try {
        const response = await apiRequest("GET", `/api/videos/${postId}/broll/status`);
        const data = await response.json();
        const inserts: LumaBrollInsert[] = data.inserts || [];
        setLumaBrollInserts(inserts);

        const allDone = inserts.every((ins) => ins.status === "succeeded" || ins.status === "failed");
        if (allDone) {
          setLumaBrollPolling(false);
          const succeeded = inserts.filter((ins) => ins.status === "succeeded").length;
          if (succeeded > 0) {
            toast({
              title: "AI B-roll ready!",
              description: `${succeeded} of ${inserts.length} AI B-roll clips generated successfully.`,
            });
          }
        }
      } catch {
      }
    };

    pollStatus();
    lumaPollRef.current = window.setInterval(pollStatus, 5000);

    return () => {
      if (lumaPollRef.current) {
        clearInterval(lumaPollRef.current);
        lumaPollRef.current = null;
      }
    };
  }, [lumaBrollPolling, postId]);

  const startCamera = async (overrideFacingMode?: "user" | "environment") => {
    if (isCameraOn || streamRef.current) return;
    
    const mode = overrideFacingMode || facingMode;
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: 1080, height: 1920 },
        audio: true,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        if (videoDevices.length > 0) {
          const currentTrack = streamRef.current?.getVideoTracks()[0];
          const currentDeviceId = currentTrack?.getSettings()?.deviceId;
          const nextDevice = videoDevices.find(d => d.deviceId !== currentDeviceId) || videoDevices[0];
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: nextDevice.deviceId }, width: 1080, height: 1920 },
            audio: true,
          });
          streamRef.current = mediaStream;
          setStream(mediaStream);
          setIsCameraOn(true);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          return;
        }
      } catch {}
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsCameraOn(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    
    const preferredMimeType = "video/webm;codecs=vp8,opus";
    const fallbackMimeType = "video/webm";
    
    let mimeType: string;
    if (MediaRecorder.isTypeSupported(preferredMimeType)) {
      mimeType = preferredMimeType;
    } else if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
      mimeType = fallbackMimeType;
    } else {
      mimeType = "";
    }
    
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
    };

    mediaRecorder.onerror = () => {
      toast({
        title: "Recording Error",
        description: "Failed to record video. Please try again.",
        variant: "destructive",
      });
    };

    mediaRecorder.start(1000);
    mediaRecorderRef.current = mediaRecorder;
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

  const saveShot = async () => {
    if (!recordedBlob || !post) {
      console.error("[saveShot] No recorded blob or post available");
      toast({
        title: "Nothing to save",
        description: "Please record a video first.",
        variant: "destructive",
      });
      return;
    }

    const currentShot = post.shotList?.[currentShotIndex];
    if (!currentShot) {
      console.error("[saveShot] No current shot found at index", currentShotIndex);
      toast({
        title: "Error",
        description: "Could not find the current shot. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log("[saveShot] Saving shot with blob size:", recordedBlob.size);
    const blobToSave = recordedBlob;
    const durationToSave = recordingTime;
    
    setRecordedBlob(null);
    setRecordingTime(0);
    
    try {
      await saveClipMutation.mutateAsync({
        shotId: currentShot.id,
        blob: blobToSave,
        duration: durationToSave,
      });

      updateShotMutation.mutate({
        shotId: currentShot.id,
        completed: true,
      });

      if (currentShotIndex < post.shotList.length - 1) {
        setCurrentShotIndex(currentShotIndex + 1);
      }
    } catch (error) {
      console.error("[saveShot] Failed to save:", error);
      setRecordedBlob(blobToSave);
      setRecordingTime(durationToSave);
    }
  };

  const retakeShot = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
  };

  const scrollTimeline = (direction: "left" | "right") => {
    if (timelineRef.current) {
      const scrollAmount = 200;
      timelineRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const flipCamera = async () => {
    if (isRecording) return;

    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsCameraOn(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: 1080, height: 1920 },
        audio: true,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        if (videoDevices.length > 1) {
          const currentTrack = stream?.getVideoTracks()[0];
          const currentDeviceId = currentTrack?.getSettings()?.deviceId;
          const nextDevice = videoDevices.find(d => d.deviceId !== currentDeviceId) || videoDevices[0];
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: nextDevice.deviceId }, width: 1080, height: 1920 },
            audio: true,
          });
          streamRef.current = mediaStream;
          setStream(mediaStream);
          setIsCameraOn(true);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          return;
        }
      } catch {}
      toast({
        title: "Flip Camera Failed",
        description: "Unable to switch camera. Your device may only have one camera.",
        variant: "destructive",
      });
      setFacingMode(facingMode);
      startCamera(facingMode);
    }
  };

  const startQrSession = async () => {
    if (!postId || !post?.shotList) return;
    const currentShot = post.shotList[currentShotIndex];
    if (!currentShot) return;

    try {
      const response = await apiRequest("POST", "/api/recording-sessions", {
        postId,
        shotId: currentShot.id,
      });
      const data = await response.json();
      setQrSessionId(data.sessionId);
      setQrPairUrl(data.pairUrl);
      setQrSessionStatus("pending");
      setShowQrModal(true);

      qrPollRef.current = window.setInterval(async () => {
        try {
          const statusRes = await apiRequest("GET", `/api/recording-sessions/${data.sessionId}`);
          const statusData = await statusRes.json();
          setQrSessionStatus(statusData.status);

          if (statusData.status === "uploaded") {
            if (qrPollRef.current) {
              clearInterval(qrPollRef.current);
              qrPollRef.current = null;
            }
            setShowQrModal(false);
            setQrSessionId(null);
            setQrPairUrl(null);
            queryClient.invalidateQueries({ queryKey: ["/api/clips"] });
            queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
            toast({
              title: "Phone clip received!",
              description: "Your clip has been uploaded from your phone.",
            });
          } else if (statusData.status === "expired" || statusData.status === "cancelled") {
            if (qrPollRef.current) {
              clearInterval(qrPollRef.current);
              qrPollRef.current = null;
            }
            setShowQrModal(false);
            setQrSessionId(null);
            setQrPairUrl(null);
            if (statusData.status === "expired") {
              toast({
                title: "Session expired",
                description: "The recording session timed out. Please try again.",
                variant: "destructive",
              });
            }
          }
        } catch {}
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Failed to create session",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelQrSession = async () => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    if (qrSessionId) {
      try {
        await apiRequest("DELETE", `/api/recording-sessions/${qrSessionId}`);
      } catch {}
    }
    setShowQrModal(false);
    setQrSessionId(null);
    setQrPairUrl(null);
    setQrSessionStatus("pending");
  };

  const getQrStatusText = () => {
    switch (qrSessionStatus) {
      case "pending": return "Waiting for phone to scan...";
      case "paired": return "Phone connected!";
      case "recording": return "Recording in progress...";
      case "uploaded": return "Upload complete!";
      case "expired": return "Session expired";
      case "cancelled": return "Session cancelled";
      default: return "Waiting...";
    }
  };

  const getQrStatusColor = () => {
    switch (qrSessionStatus) {
      case "pending": return "text-[#666666]";
      case "paired": return "text-blue-500";
      case "recording": return "text-red-500";
      case "uploaded": return "text-emerald-500";
      case "expired": case "cancelled": return "text-red-400";
      default: return "text-[#666666]";
    }
  };

  const handleBrollGenerate = async () => {
    if (!post || !post.shotList || post.shotList.length === 0) {
      toast({ title: "No shots available", description: "Add shots to your project before generating B-roll.", variant: "destructive" });
      return;
    }
    setBrollLoading(true);
    setActiveAiTool("broll");
    try {
      const segments = post.shotList.map((shot, i) => ({
        id: shot.id || `seg-${i}`,
        startMs: i * 5000,
        endMs: (i + 1) * 5000,
        text: shot.dialogue || shot.instruction || "",
        words: (shot.dialogue || shot.instruction || "").split(/\s+/).filter(Boolean).map((w: string, wi: number) => ({
          text: w,
          startMs: i * 5000 + wi * 300,
          endMs: i * 5000 + (wi + 1) * 300,
        })),
      }));

      const directorRes = await apiRequest("POST", "/api/v1/broll/director", {
        transcriptSegments: segments,
        videoContext: {
          platform: (post.platform || "tiktok").toLowerCase().replace(/\s/g, "_") as any,
          videoType: "talking_head",
          pacing: "medium",
          mood: "educational",
        },
      });
      const directorData = await directorRes.json();
      setBrollSlots(directorData.slots || []);

      if (directorData.slots && directorData.slots.length > 0) {
        const fillRes = await apiRequest("POST", "/api/v1/broll/fill-slots", {
          slots: directorData.slots,
          topK: 3,
          sourcePriority: ["pexels"],
        });
        const fillData = await fillRes.json();
        setBrollResults(fillData.slotResults || []);
        toast({
          title: "B-roll generated!",
          description: `Found ${fillData.slotResults?.length || 0} B-roll placements with stock footage.`,
        });
      } else {
        toast({
          title: "No B-roll slots",
          description: "The AI didn't find suitable moments for B-roll in this script.",
        });
      }
    } catch (error: any) {
      toast({
        title: "B-roll generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBrollLoading(false);
    }
  };

  const handleLumaBrollGenerate = async () => {
    if (!postId) return;
    setLumaBrollLoading(true);
    setActiveAiTool("luma_broll");
    try {
      const response = await apiRequest("POST", `/api/videos/${postId}/broll/generate`, {
        mode: "auto",
        aspectRatio: "9:16",
      });
      const data = await response.json();
      const inserts: LumaBrollInsert[] = data.inserts || [];
      setLumaBrollInserts(inserts);

      const hasPending = inserts.some((ins) => ins.status === "queued" || ins.status === "processing");
      if (hasPending) {
        setLumaBrollPolling(true);
        toast({
          title: "AI B-roll generating",
          description: `${inserts.length} insert(s) queued. This may take a few minutes.`,
        });
      } else {
        const succeeded = inserts.filter((ins) => ins.status === "succeeded").length;
        toast({
          title: succeeded > 0 ? "AI B-roll ready!" : "No inserts generated",
          description: succeeded > 0
            ? `${succeeded} AI B-roll clip(s) are ready.`
            : "Try again or adjust your content.",
        });
      }
    } catch (error: any) {
      toast({
        title: "AI B-roll generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLumaBrollLoading(false);
    }
  };

  const handleLumaBrollRegenerate = async (insertId: string, customPrompt?: string) => {
    if (!postId) return;
    try {
      setLumaBrollInserts((prev) =>
        prev.map((ins) => (ins.insertId === insertId ? { ...ins, status: "queued" as const } : ins))
      );
      const body: any = { mode: "regenerate", insertId };
      if (customPrompt) body.customPrompt = customPrompt;
      const response = await apiRequest("POST", `/api/videos/${postId}/broll/generate`, body);
      const data = await response.json();
      if (data.inserts) {
        setLumaBrollInserts(data.inserts);
      }
      setLumaBrollPolling(true);
      setRegenPromptInsertId(null);
      setRegenPromptText("");
      toast({ title: "Regenerating...", description: "AI B-roll clip is being regenerated." });
    } catch (error: any) {
      toast({
        title: "Regeneration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCustomLumaGenerate = async () => {
    if (!postId || !customLumaPrompt.trim()) return;
    setLumaBrollLoading(true);
    try {
      const body: Record<string, any> = {
        prompt: customLumaPrompt.trim(),
        generationType: customLumaType,
        aspectRatio: "9:16",
        durationSeconds: 5,
        startFrame: 0,
      };
      if (customLumaCamera) body.cameraMove = customLumaCamera;
      if (customLumaLoop) body.loop = true;
      if (customLumaType === "image_to_video" && customLumaImageUrl) {
        body.sourceImageUrl = customLumaImageUrl;
      }
      if (customLumaType === "extend" && customLumaExtendId) {
        body.sourceGenerationId = customLumaExtendId;
      }

      const response = await apiRequest("POST", `/api/videos/${postId}/broll/single`, body);
      const data = await response.json();

      if (data.insert) {
        setLumaBrollInserts((prev) => {
          const exists = prev.some((ins) => ins.insertId === data.insert.insertId);
          return exists ? prev : [...prev, data.insert];
        });
        if (data.insert.status === "queued" || data.insert.status === "processing") {
          setLumaBrollPolling(true);
        }
        toast({
          title: data.cached ? "Using cached result" : "Custom B-roll generating",
          description: data.cached
            ? "Found a cached clip matching your prompt."
            : "Your custom AI B-roll is being generated.",
        });
      }

      setCustomLumaPrompt("");
      setShowCustomLumaPanel(false);
    } catch (error: any) {
      toast({
        title: "Custom generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLumaBrollLoading(false);
    }
  };

  const handleDeleteLumaInsert = async (insertId: string) => {
    if (!postId) return;
    try {
      await apiRequest("DELETE", `/api/videos/${postId}/broll/${insertId}`);
      setLumaBrollInserts((prev) => prev.filter((ins) => ins.insertId !== insertId));
      toast({ title: "B-roll clip deleted" });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExtendInsert = async (insert: LumaBrollInsert) => {
    if (!insert.lumaJobId) {
      toast({ title: "Cannot extend", description: "This clip has no Luma generation ID.", variant: "destructive" });
      return;
    }
    setCustomLumaType("extend");
    setCustomLumaExtendId(insert.lumaJobId);
    setCustomLumaPrompt(insert.prompt || "continue the scene");
    setShowCustomLumaPanel(true);
    toast({ title: "Extend mode", description: "Set the prompt and generate to extend this clip." });
  };

  const handleAiToolClick = (toolId: string) => {
    if (toolId === "captions") {
      const allShotsCompleted = post?.shotList.every((s) => s.completed);
      if (!allShotsCompleted) {
        toast({
          title: "Finish recording first",
          description: "Captions are generated after preview — finish recording all shots to edit them.",
        });
        return;
      }
      setActiveAiTool(activeAiTool === toolId ? null : toolId);
      generateCaptionsMutation.mutate();
      return;
    }
    
    if (toolId === "voiceover") {
      setActiveAiTool(activeAiTool === toolId ? null : toolId);
      setShowVoiceoverModal(true);
      return;
    }

    if (toolId === "broll") {
      if (brollLoading) return;
      handleBrollGenerate();
      return;
    }

    if (toolId === "luma_broll") {
      if (lumaBrollLoading) return;
      handleLumaBrollGenerate();
      return;
    }

    if (toolId === "autoedit") {
      setShowProEditModal(true);
      return;
    }
    
    toast({
      title: "Coming Soon",
      description: `${AI_TOOLS.find(t => t.id === toolId)?.label} will be available in the next update.`,
    });
  };
  
  const handleVoiceoverClose = () => {
    setShowVoiceoverModal(false);
    setActiveAiTool(null);
  };
  
  const handleVoiceoverApplied = () => {
    setVoiceoverApplied(true);
    toast({
      title: "Voiceover applied",
      description: "Your AI voiceover has been attached to the video.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Skeleton className="w-full max-w-md aspect-[9/16] bg-gray-100" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#111111] mb-2">Post not found</h2>
          <Button className="bg-[#111111] hover:bg-[#111111]/90 text-white rounded-full" onClick={() => setLocation("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const currentShot = post.shotList[currentShotIndex];
  const completedShots = post.shotList.filter((s) => s.completed).length;
  const progress = (completedShots / post.shotList.length) * 100;

  return (
    <TooltipProvider>
      <div className="w-screen h-screen bg-white flex flex-col relative">
        <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 z-50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-[#666666] hover:text-[#111111] hover:bg-gray-50"
              onClick={() => setLocation(`/post/${postId}`)}
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h1 className="text-sm font-medium text-[#111111] truncate max-w-[200px]">{post.title}</h1>
              <p className="text-xs text-[#666666]">Director Mode</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
              <div className="h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse" />
              <span className="text-xs font-medium text-[#111111]">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-[#666666]">
              <span className="text-sm font-medium">{completedShots}</span>
              <span className="text-xs">/</span>
              <span className="text-sm">{post.shotList.length} shots</span>
            </div>
            <Progress value={progress} className="w-32 h-1.5 bg-gray-100" />
          </div>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={teleprompterOn ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full text-xs ${
                    teleprompterOn
                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                      : "border border-gray-200 text-[#666666] hover:bg-gray-50 hover:text-[#111111]"
                  }`}
                  onClick={() => setTeleprompterOn(!teleprompterOn)}
                >
                  <EyeIcon className="h-4 w-4 mr-1.5" />
                  Teleprompter
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-gray-200 text-[#111111] shadow-lg">
                <p className="font-medium">Teleprompter Mode</p>
                <p className="text-xs text-[#666666]">Show script overlay near camera for natural eye contact</p>
              </TooltipContent>
            </Tooltip>
            {completedShots === post.shotList.length ? (
              <Button
                className="bg-[#111111] hover:bg-[#111111]/90 text-white rounded-full"
                onClick={() => finishVideoMutation.mutate()}
                disabled={finishVideoMutation.isPending}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                {finishVideoMutation.isPending ? "Creating..." : "Finish Video"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border border-gray-200 text-[#666666] hover:bg-gray-50 hover:text-[#111111] rounded-full"
                onClick={() => finishVideoMutation.mutate()}
                disabled={finishVideoMutation.isPending || completedShots === 0}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Finish Early
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 grid grid-cols-[72px_1fr_420px] min-h-0 relative z-10">
          <aside className="border-r border-gray-200 bg-white h-full overflow-y-auto">
            <div className="py-3 flex flex-col items-center space-y-1">
              {AI_TOOLS.map((tool) => {
                const isVoiceoverApplied = tool.id === "voiceover" && voiceoverApplied;
                const isLumaBrollReady = tool.id === "luma_broll" && lumaBrollInserts.length > 0 && lumaBrollInserts.some((ins) => ins.status === "succeeded");
                const hasAccess = !tool.requiredFeature || canUse(tool.requiredFeature);
                const isLocked = !hasAccess;
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (isLocked) {
                            toast({
                              title: "Upgrade Required",
                              description: `${tool.label} requires a higher plan. Upgrade to access this feature.`,
                              variant: "destructive",
                            });
                            return;
                          }
                          handleAiToolClick(tool.id);
                        }}
                        className={`relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-150 ${
                          isLocked
                            ? "text-[#666666]/40 cursor-not-allowed"
                            : activeAiTool === tool.id
                            ? "bg-gray-100 text-[#111111]"
                            : isVoiceoverApplied || isLumaBrollReady
                            ? "bg-emerald-50 text-emerald-600"
                            : "text-[#666666] hover:text-[#111111] hover:bg-gray-50"
                        }`}
                      >
                        <tool.icon className="h-5 w-5" />
                        {(isVoiceoverApplied || isLumaBrollReady) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <CheckCircleIcon className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {isLocked && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                            <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-white border-gray-200 text-[#111111] shadow-lg">
                      <p className="font-medium">{tool.label}</p>
                      <p className="text-xs text-[#666666]">
                        {isLocked ? "Upgrade to unlock" : isVoiceoverApplied ? "Voiceover added" : isLumaBrollReady ? "AI B-roll ready" : tool.description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </aside>

          <main className="flex items-center justify-center bg-gray-50 h-full">
            
            <div className="relative w-full max-w-sm z-10">
              <div className={`relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-100 border-2 transition-all duration-300 ${isRecording ? "border-red-500/60 shadow-lg" : "border-gray-200 shadow-md"}`}>
                
                {recordedBlob ? (
                  <video
                    src={URL.createObjectURL(recordedBlob)}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                  />
                ) : isCameraOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <div className="w-20 h-20 rounded-full border border-gray-200 flex items-center justify-center mb-4">
                      <VideoCameraIcon className="h-10 w-10 text-[#666666]" />
                    </div>
                    <p className="text-sm text-[#666666]">Camera is off</p>
                    <p className="text-xs text-[#666666]/60 mt-1">Click below to start</p>
                  </div>
                )}

                <div className="absolute top-4 left-4 z-20">
                  <Badge className="bg-gray-100 text-[#111111] border border-gray-200 text-xs">
                    Shot {currentShot.shotNumber}
                  </Badge>
                </div>

                {isRecording && (
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-mono shadow-lg">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    {formatTime(recordingTime)}
                  </div>
                )}

                {teleprompterOn && !recordedBlob && teleprompterLoading && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span className="text-white/70 text-sm">Loading script...</span>
                    </div>
                  </div>
                )}

                {teleprompterOn && !recordedBlob && teleprompterError && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 text-center px-8">
                      <span className="text-white/70 text-sm">No script available for this post</span>
                      <button
                        onClick={() => setTeleprompterOn(false)}
                        className="text-white/50 text-xs underline hover:text-white/80"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {teleprompterOn && teleprompterData?.cards && teleprompterData.cards.length > 0 && !recordedBlob && (
                  <TeleprompterOverlay
                    cards={teleprompterData.cards}
                    isRecording={isRecording}
                    onClose={() => setTeleprompterOn(false)}
                  />
                )}

                {teleprompterOn && isCameraOn && !recordedBlob && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+120px)] z-40 pointer-events-none">
                    <div className="w-3 h-3 rounded-full border-2 border-white/40 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-4">
                {!recordedBlob ? (
                  <>
                    {!isCameraOn ? (
                      <Button
                        size="lg"
                        className="h-16 w-16 rounded-full bg-[#111111] hover:bg-[#111111]/90 border-4 border-gray-200 shadow-md"
                        onClick={() => startCamera()}
                      >
                        <VideoCameraIcon className="h-7 w-7 text-white" />
                      </Button>
                    ) : !isRecording ? (
                      <>
                        <Button
                          size="lg"
                          variant="ghost"
                          className="h-12 w-12 rounded-full text-[#666666] hover:text-[#111111] hover:bg-gray-50"
                          onClick={stopCamera}
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          className="h-10 w-10 rounded-full text-[#666666] hover:text-[#111111] hover:bg-gray-50"
                          onClick={flipCamera}
                          title="Flip Camera"
                        >
                          <ArrowsRightLeftIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          size="lg"
                          className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 border-4 border-red-400/30"
                          onClick={startRecording}
                        >
                          <div className="h-6 w-6 rounded-full bg-white" />
                        </Button>
                        <Button
                          size="lg"
                          variant="ghost"
                          className="h-10 w-10 rounded-full text-[#666666] hover:text-[#111111] hover:bg-gray-50"
                          onClick={startQrSession}
                          title="Record with Phone"
                        >
                          <DevicePhoneMobileIcon className="h-5 w-5" />
                        </Button>
                        <div className="h-12 w-12" />
                      </>
                    ) : (
                      <Button
                        size="lg"
                        className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 animate-pulse"
                        onClick={stopRecording}
                      >
                        <StopIcon className="h-6 w-6 text-white" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border border-gray-200 text-[#666666] hover:bg-gray-50 hover:text-[#111111] rounded-full"
                      onClick={retakeShot}
                    >
                      <ArrowPathIcon className="h-5 w-5 mr-2" />
                      Retake
                    </Button>
                    <Button
                      size="lg"
                      className="bg-[#111111] hover:bg-[#111111]/90 text-white rounded-full"
                      onClick={saveShot}
                      disabled={saveClipMutation.isPending}
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      {saveClipMutation.isPending ? "Saving..." : "Save Shot"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </main>

          <aside className="border-l border-gray-200 bg-white h-full overflow-y-auto">
            <div className="sticky top-0 p-5 border-b border-gray-200 bg-white z-10">
              <h2 className="text-xs font-semibold text-[#666666] uppercase tracking-[0.15em]">Director Notes</h2>
            </div>

            <div className="p-5 space-y-6">
              <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-gray-100 text-[#111111] border-0">Shot {currentShot.shotNumber}</Badge>
                  <span className="text-xs text-[#666666] font-mono">{currentShot.duration}s</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-[#666666]/70 uppercase tracking-wider mb-1">Camera</p>
                    <p className="text-sm text-[#111111]">{currentShot.cameraAngle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#666666]/70 uppercase tracking-wider mb-1">Framing</p>
                    <p className="text-sm text-[#111111]">{currentShot.framing}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold text-[#666666] uppercase tracking-[0.15em]">Instruction</h3>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-sm text-[#111111] leading-relaxed font-medium">{currentShot.instruction}</p>
                </div>
              </div>

              {currentShot.dialogue && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Script</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-[#666666] hover:text-[#111111] hover:bg-gray-50">
                        Shorten
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-[#666666] hover:text-[#111111] hover:bg-gray-50">
                        Expand
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-gray-200">
                    <p className="text-sm text-[#111111] italic leading-relaxed">"{currentShot.dialogue}"</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Performance Tips</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-[#666666]">
                    <EyeIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Look slightly above the camera lens for natural eye contact</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#666666]">
                    <SparklesIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Speak with energy and conviction</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#666666]">
                    <ClockIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Pause briefly between key points</span>
                  </div>
                </div>
              </div>

              {(brollLoading || brollResults.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wider flex items-center gap-2">
                    <FilmIcon className="h-4 w-4" />
                    B-Roll Clips
                  </h3>
                  {brollLoading ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="h-5 w-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#666666]">Finding B-roll footage...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {brollResults.map((slotResult: any, si: number) => (
                        <div key={slotResult.slotId || si} className="space-y-2">
                          <div className="text-[10px] text-[#666666] uppercase tracking-wider">
                            Slot {si + 1} — {brollSlots[si]?.purpose || "clip"}
                          </div>
                          {slotResult.candidates?.slice(0, 2).map((candidate: any, ci: number) => (
                            <div
                              key={candidate.assetId || ci}
                              className="relative rounded-lg overflow-hidden border border-gray-200 group cursor-pointer hover:border-[#111111] transition-colors"
                            >
                              <video
                                src={candidate.previewUrl}
                                className="w-full aspect-video object-cover"
                                muted
                                loop
                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-white/80 truncate flex-1">{candidate.reason}</span>
                                  <span className="text-[10px] text-white/60 ml-2">{Math.round(candidate.overallScore * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(lumaBrollLoading || lumaBrollInserts.length > 0 || showCustomLumaPanel) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wider flex items-center gap-2">
                      <CameraIcon className="h-4 w-4" />
                      AI B-Roll (Luma)
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] border-gray-200 text-[#666666] hover:text-[#111111]"
                      onClick={() => setShowCustomLumaPanel(!showCustomLumaPanel)}
                    >
                      {showCustomLumaPanel ? "Close" : "+ Custom"}
                    </Button>
                  </div>

                  {showCustomLumaPanel && (
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#666666] uppercase tracking-wider">Type</label>
                        <div className="flex gap-1.5">
                          {(["text_to_video", "image_to_video", "extend"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setCustomLumaType(t)}
                              className={`px-2 py-1 text-[10px] rounded-md border transition-colors ${
                                customLumaType === t
                                  ? "bg-[#111111] text-white border-[#111111]"
                                  : "bg-white text-[#666666] border-gray-200 hover:border-gray-400"
                              }`}
                            >
                              {t === "text_to_video" ? "Text" : t === "image_to_video" ? "Image" : "Extend"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Textarea
                        value={customLumaPrompt}
                        onChange={(e) => setCustomLumaPrompt(e.target.value)}
                        placeholder={
                          customLumaType === "text_to_video" ? "Describe the scene to generate..."
                            : customLumaType === "image_to_video" ? "Describe how the image should animate..."
                            : "Describe how the clip should continue..."
                        }
                        className="text-xs min-h-[50px] border-gray-200 bg-white"
                      />

                      {customLumaType === "image_to_video" && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#666666] uppercase tracking-wider">Image URL</label>
                          <input
                            type="url"
                            value={customLumaImageUrl}
                            onChange={(e) => setCustomLumaImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white"
                          />
                        </div>
                      )}

                      {customLumaType === "extend" && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#666666] uppercase tracking-wider">Source Generation ID</label>
                          <input
                            type="text"
                            value={customLumaExtendId}
                            onChange={(e) => setCustomLumaExtendId(e.target.value)}
                            placeholder="Luma generation ID to extend"
                            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#666666] uppercase tracking-wider">Camera Move</label>
                        <select
                          value={customLumaCamera}
                          onChange={(e) => setCustomLumaCamera(e.target.value)}
                          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-white"
                        >
                          {CAMERA_MOVE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          role="switch"
                          aria-checked={customLumaLoop}
                          onClick={() => setCustomLumaLoop(!customLumaLoop)}
                          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                            customLumaLoop ? "bg-[#111111]" : "bg-gray-300"
                          }`}
                        >
                          <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                            customLumaLoop ? "translate-x-3.5" : "translate-x-0.5"
                          }`} />
                        </button>
                        <span className="text-[10px] text-[#666666]">Seamless loop</span>
                      </div>

                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-[#111111] hover:bg-[#111111]/90 text-white"
                        onClick={handleCustomLumaGenerate}
                        disabled={!customLumaPrompt.trim() || lumaBrollLoading || (customLumaType === "image_to_video" && !customLumaImageUrl)}
                      >
                        {lumaBrollLoading ? (
                          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                        ) : null}
                        Generate {customLumaType === "text_to_video" ? "from Text" : customLumaType === "image_to_video" ? "from Image" : "Extension"}
                      </Button>
                    </div>
                  )}

                  {lumaBrollLoading && lumaBrollInserts.length === 0 && !showCustomLumaPanel ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="h-5 w-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-[#666666]">Generating AI B-roll...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lumaBrollInserts.map((insert, idx) => (
                        <div key={insert.insertId} className="p-3 rounded-xl border border-gray-200 bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#666666] uppercase tracking-wider">
                                Insert {idx + 1}
                              </span>
                              {insert.generationType && insert.generationType !== "text_to_video" && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-[#999] rounded">
                                  {insert.generationType === "image_to_video" ? "img2vid" : insert.generationType === "extend" ? "extend" : insert.generationType}
                                </span>
                              )}
                              {insert.cameraMove && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">
                                  {insert.cameraMove.replace(/_/g, " ")}
                                </span>
                              )}
                              {insert.loop && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded">
                                  loop
                                </span>
                              )}
                            </div>
                            <Badge className={`text-[10px] ${
                              insert.status === "succeeded"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : insert.status === "failed"
                                ? "bg-red-50 text-red-600 border-red-200"
                                : insert.status === "processing"
                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                : "bg-gray-50 text-[#666666] border-gray-200"
                            }`}>
                              {insert.status === "processing" && (
                                <div className="h-2 w-2 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1" />
                              )}
                              {insert.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#666666] leading-relaxed truncate">{insert.prompt}</p>

                          {insert.status === "succeeded" && insert.assetUrl && (
                            <div className="relative rounded-lg overflow-hidden border border-gray-200">
                              <video
                                src={insert.assetUrl}
                                className="w-full aspect-video object-cover"
                                muted
                                loop
                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                              />
                            </div>
                          )}

                          {insert.status === "failed" && insert.error && (
                            <p className="text-[10px] text-red-500">{insert.error}</p>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(insert.status === "succeeded" || insert.status === "failed") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] border-gray-200 text-[#666666] hover:text-[#111111]"
                                  onClick={() => handleLumaBrollRegenerate(insert.insertId)}
                                >
                                  <ArrowPathIcon className="h-3 w-3 mr-1" />
                                  Redo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] text-[#666666] hover:text-[#111111]"
                                  onClick={() => {
                                    setRegenPromptInsertId(insert.insertId);
                                    setRegenPromptText(insert.prompt);
                                  }}
                                >
                                  <PencilSquareIcon className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                {insert.status === "succeeded" && insert.lumaJobId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[10px] text-blue-500 hover:text-blue-700"
                                    onClick={() => handleExtendInsert(insert)}
                                  >
                                    Extend
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] text-red-400 hover:text-red-600"
                                  onClick={() => handleDeleteLumaInsert(insert.insertId)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>

                          {regenPromptInsertId === insert.insertId && (
                            <div className="space-y-2 pt-1">
                              <Textarea
                                value={regenPromptText}
                                onChange={(e) => setRegenPromptText(e.target.value)}
                                placeholder="Describe the B-roll you want..."
                                className="text-xs min-h-[60px] border-gray-200"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] bg-[#111111] hover:bg-[#111111]/90 text-white"
                                  onClick={() => handleLumaBrollRegenerate(insert.insertId, regenPromptText)}
                                  disabled={!regenPromptText.trim()}
                                >
                                  Generate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] text-[#666666]"
                                  onClick={() => { setRegenPromptInsertId(null); setRegenPromptText(""); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {lumaBrollInserts.length > 0 && lumaBrollInserts.every((ins) => ins.status === "succeeded" || ins.status === "failed") && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                          <label htmlFor="include-luma-broll" className="text-xs text-[#111111] font-medium cursor-pointer">
                            Include AI B-roll in export
                          </label>
                          <button
                            id="include-luma-broll"
                            role="switch"
                            aria-checked={includeLumaBroll}
                            onClick={() => setIncludeLumaBroll(!includeLumaBroll)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              includeLumaBroll ? "bg-[#111111]" : "bg-gray-300"
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              includeLumaBroll ? "translate-x-4" : "translate-x-0.5"
                            }`} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="h-28 border-t border-gray-200 bg-white">
          <div className="h-full flex items-center px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#666666] hover:text-[#111111] hover:bg-gray-50 mr-2"
              onClick={() => scrollTimeline("left")}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>

            <div
              ref={timelineRef}
              className="flex-1 flex gap-3 overflow-x-auto scrollbar-hide py-3 px-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {post.shotList.map((shot, index) => (
                <button
                  key={shot.id}
                  onClick={() => setCurrentShotIndex(index)}
                  className={`flex-shrink-0 w-36 p-3 transition-all duration-200 text-left group rounded-xl border ${
                    index === currentShotIndex
                      ? "border-[#111111] bg-gray-50 shadow-sm"
                      : shot.completed
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pt-1">
                    <span className={`text-xs font-semibold ${
                      index === currentShotIndex ? "text-[#111111]" : shot.completed ? "text-emerald-600" : "text-[#666666]"
                    }`}>
                      Shot {shot.shotNumber}
                    </span>
                    {shot.completed && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[#666666] truncate leading-relaxed">{shot.instruction.substring(0, 35)}...</p>
                  <div className="mt-2 flex items-center gap-2 pb-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[9px] text-[#111111] font-mono">{shot.duration}s</span>
                    <div className="studio-timeline flex-1">
                      <div 
                        className="studio-timeline-progress" 
                        style={{ width: shot.completed ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#666666] hover:text-[#111111] hover:bg-gray-50 ml-2"
              onClick={() => scrollTimeline("right")}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
          </div>
        </footer>

        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                <CheckCircleIcon className="h-8 w-8 text-[#111111]" />
              </div>
              <DialogTitle className="text-center text-2xl text-[#111111]">Video Ready!</DialogTitle>
              <DialogDescription className="text-center text-[#666666]">
                Your video has been automatically edited with captions and music. Ready to share with the world!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <Button
                size="lg"
                className="w-full bg-[#111111] hover:bg-[#111111]/90 text-white rounded-full"
                onClick={() => {
                  setShowSuccessDialog(false);
                  setLocation("/library");
                }}
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download & View in Library
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border border-gray-200 text-[#666666] hover:bg-gray-50 hover:text-[#111111] rounded-full"
                onClick={() => {
                  window.open("https://www.instagram.com/", "_blank");
                }}
              >
                <SiInstagram className="h-5 w-5 mr-2" />
                Upload to Instagram
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showQrModal} onOpenChange={(open) => { if (!open) cancelQrSession(); }}>
          <DialogContent className="sm:max-w-md bg-white border border-gray-200">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                <QrCodeIcon className="h-8 w-8 text-[#111111]" />
              </div>
              <DialogTitle className="text-center text-xl text-[#111111]">Record with Phone</DialogTitle>
              <DialogDescription className="text-center text-[#666666]">
                Scan this QR code with your phone to start recording directly from your mobile camera.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 py-4">
              {qrPairUrl && (
                <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <QRCodeSVG
                    value={qrPairUrl}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                {(qrSessionStatus === "pending" || qrSessionStatus === "paired" || qrSessionStatus === "recording") && (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: qrSessionStatus === "pending" ? "#666" : qrSessionStatus === "paired" ? "#3b82f6" : "#ef4444" }} />
                )}
                {qrSessionStatus === "uploaded" && (
                  <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                )}
                <span className={`text-sm font-medium ${getQrStatusColor()}`}>
                  {getQrStatusText()}
                </span>
              </div>
              <Button
                variant="outline"
                className="border border-gray-200 text-[#666666] hover:bg-gray-50 hover:text-[#111111]"
                onClick={cancelQrSession}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <VoiceoverModal
          isOpen={showVoiceoverModal}
          onClose={handleVoiceoverClose}
          onApplied={handleVoiceoverApplied}
          clipId={currentShot?.id}
          defaultScript={post.shotList?.map(shot => shot.dialogue).join('\n\n') || ''}
        />

        {postId && (
          <ProEditModal
            open={showProEditModal}
            onClose={() => setShowProEditModal(false)}
            videoId={postId}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}`] });
              setLocation("/dashboard");
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
