import { useState, useRef, useEffect, useCallback } from "react";

type SessionStatus = "pending" | "paired" | "recording" | "uploaded" | "expired" | "cancelled";
type AspectRatio = "9:16" | "16:9";

interface SessionInfo {
  id: string;
  postId: string;
  shotId: string;
  status: SessionStatus;
}

type PageState =
  | "loading"
  | "setup"
  | "error"
  | "camera"
  | "preview"
  | "uploading"
  | "success";

export default function PhoneRecorder() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const searchParams = new URLSearchParams(window.location.search);
  const sid = searchParams.get("sid");
  const sessionToken = searchParams.get("token");
  const isComputerMode = searchParams.get("mode") === "computer";

  useEffect(() => {
    if (!sid) {
      setErrorMessage("No session ID provided. Please scan the QR code again.");
      setPageState("error");
      return;
    }
    validateSession(sid);
  }, [sid]);

  useEffect(() => {
    return () => {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current && pageState === "camera") {
      videoRef.current.srcObject = stream;
    }
  }, [stream, pageState]);

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
  };

  const validateSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/recording-sessions/${sessionId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid or expired session.");
      }
      const data = await res.json();
      if (data.status === "expired" || data.status === "cancelled") {
        throw new Error("This recording session has expired. Please generate a new QR code.");
      }
      if (data.status === "uploaded") {
        throw new Error("This session has already been used. Please generate a new QR code.");
      }
      setSessionInfo({
        id: sessionId,
        postId: data.postId,
        shotId: data.shotId,
        status: data.status,
      });
      // Show setup screen so user can pick aspect ratio
      setPageState("setup");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to validate session.");
      setPageState("error");
    }
  };

  const getDimensions = (ratio: AspectRatio) => {
    if (ratio === "9:16") return { width: { ideal: 1080 }, height: { ideal: 1920 } };
    return { width: { ideal: 1920 }, height: { ideal: 1080 } };
  };

  const startCamera = async (facing: "user" | "environment", ratio: AspectRatio = aspectRatio) => {
    stopAllTracks();
    const dims = getDimensions(ratio);
    try {
      const videoConstraints: MediaTrackConstraints = isComputerMode
        ? { ...dims }
        : { facingMode: facing, ...dims };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setFacingMode(facing);
      setPageState("camera");
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (!isComputerMode && facing === "environment") {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", ...getDimensions(ratio) },
            audio: true,
          });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setFacingMode("user");
          setPageState("camera");
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
          return;
        } catch {
          // fall through
        }
      }
      setErrorMessage("Camera access denied. Please allow camera and microphone permissions and try again.");
      setPageState("error");
    }
  };

  const flipCamera = async () => {
    if (isRecording || isComputerMode) return;
    const newFacing = facingMode === "user" ? "environment" : "user";
    await startCamera(newFacing, aspectRatio);
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
      setPageState("preview");
    };

    recorder.onerror = () => {
      setErrorMessage("Recording failed. Please try again.");
      setPageState("error");
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

  const retake = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setPageState("camera");
  };

  const uploadClip = useCallback(async () => {
    if (!recordedBlob || !sid) return;

    setPageState("uploading");
    setUploadProgress(0);

    try {
      const urlRes = await fetch(`/api/recording-sessions/${sid}/upload-url?token=${encodeURIComponent(sessionToken || "")}`);
      if (!urlRes.ok) {
        const data = await urlRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get upload URL. Session may have expired.");
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
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
        xhr.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
        xhr.timeout = 120000;

        xhr.send(recordedBlob);
      });

      const durationSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
      const completeRes = await fetch(`/api/recording-sessions/${sid}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          duration: durationSec,
          mimeType: recordedBlob.type || "video/webm",
          token: sessionToken,
        }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to finalize upload.");
      }

      stopAllTracks();
      setPageState("success");
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please try again.");
      setPageState("error");
    }
  }, [recordedBlob, sid]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (pageState === "loading") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent mb-4" />
        <p className="text-white/70 text-sm">Connecting to session...</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-6">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-2 text-center">Unable to Record</h1>
        <p className="text-white/60 text-sm text-center max-w-xs mb-6">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-white text-black rounded-full text-sm font-medium active:scale-95 transition-transform"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Clip Sent!</h1>
        <p className="text-white/60 text-sm text-center max-w-xs">
          Your clip has been sent to your project. You can close this page.
        </p>
      </div>
    );
  }

  if (pageState === "uploading") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-6">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold mb-4">Uploading clip...</h1>
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-white/50 text-sm">{uploadProgress}%</p>
      </div>
    );
  }

  if (pageState === "setup") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Choose Frame Size</h1>
          <p className="text-white/50 text-sm">Select the aspect ratio for your recording</p>
        </div>

        <div className="flex gap-6 mb-10">
          {/* 9:16 option */}
          <button
            onClick={() => setAspectRatio("9:16")}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
              aspectRatio === "9:16"
                ? "border-white bg-white/10"
                : "border-white/20 hover:border-white/40"
            }`}
          >
            <div
              className={`rounded-lg border-2 flex items-center justify-center ${
                aspectRatio === "9:16" ? "border-white bg-white/10" : "border-white/30"
              }`}
              style={{ width: 48, height: 85 }}
            >
              {aspectRatio === "9:16" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">9 : 16</p>
              <p className="text-xs text-white/50">Portrait</p>
            </div>
          </button>

          {/* 16:9 option */}
          <button
            onClick={() => setAspectRatio("16:9")}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
              aspectRatio === "16:9"
                ? "border-white bg-white/10"
                : "border-white/20 hover:border-white/40"
            }`}
          >
            <div
              className={`rounded-lg border-2 flex items-center justify-center ${
                aspectRatio === "16:9" ? "border-white bg-white/10" : "border-white/30"
              }`}
              style={{ width: 85, height: 48 }}
            >
              {aspectRatio === "16:9" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">16 : 9</p>
              <p className="text-xs text-white/50">Landscape</p>
            </div>
          </button>
        </div>

        <button
          onClick={() => startCamera(isComputerMode ? "user" : "environment", aspectRatio)}
          className="px-8 py-4 bg-white text-black rounded-full text-sm font-semibold active:scale-95 transition-transform"
        >
          Start Camera
        </button>
      </div>
    );
  }

  if (pageState === "preview" && recordedBlob) {
    const previewUrl = URL.createObjectURL(recordedBlob);
    const isPortrait = aspectRatio === "9:16";
    return (
      <div className="fixed inset-0 bg-black flex flex-col text-white">
        <div className="flex-1 relative flex items-center justify-center">
          <video
            ref={previewVideoRef}
            src={previewUrl}
            className={isPortrait ? "h-full w-auto object-contain" : "w-full h-auto object-contain"}
            style={isPortrait ? { maxHeight: "100%" } : { maxWidth: "100%" }}
            playsInline
            autoPlay
            loop
            muted={false}
            controls={false}
            onClick={(e) => {
              const v = e.currentTarget;
              if (v.paused) v.play();
              else v.pause();
            }}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white text-sm font-medium active:scale-95 transition-transform backdrop-blur-sm"
            >
              Retake
            </button>
            <button
              onClick={uploadClip}
              className="flex-1 py-4 rounded-2xl bg-white text-black text-sm font-medium active:scale-95 transition-transform"
            >
              Use This Clip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera view
  const isPortrait = aspectRatio === "9:16";
  const mirrorStyle = !isComputerMode && facingMode === "user" ? "scaleX(-1)" : "none";

  return (
    <div className="fixed inset-0 bg-black flex flex-col text-white">
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Aspect ratio frame */}
        <div
          className="relative overflow-hidden bg-black"
          style={
            isPortrait
              ? { width: "100%", height: "100%" }
              : {
                  width: "100%",
                  maxWidth: "calc(100vh * 16 / 9)",
                  aspectRatio: "16/9",
                  margin: "auto",
                }
          }
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: mirrorStyle }}
          />

          {/* Aspect ratio badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="text-xs font-medium bg-black/50 text-white/70 px-2 py-1 rounded-full backdrop-blur-sm">
              {aspectRatio}
            </span>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
            {!isComputerMode && (
              <button
                onClick={flipCamera}
                disabled={isRecording}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent">
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
    </div>
  );
}
