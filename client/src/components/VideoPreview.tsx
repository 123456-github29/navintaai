import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";

interface Cut {
  start: number;
  end: number;
}

interface Filter {
  type: string;
  params: { value: number };
  startTime?: number;
  endTime?: number;
}

interface BRollSegment {
  timestamp: number;
  duration: number;
  url?: string;
  query?: string;
  lumaGenerationId?: string;
}

interface VFXAsset {
  type: string;
  color?: string;
  secondaryColor?: string;
  intensity?: number;
  timestamp?: number;
  duration?: number;
  speed?: number;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface EditState {
  cuts?: Cut[];
  filters?: Filter[];
  captions?: boolean;
  captionStyle?: string;
  captionPosition?: string;
  transitions?: any[];
  segmentTransitions?: any[];
  brollSegments?: BRollSegment[];
  speedAdjustments?: any[];
  vfxAssets?: VFXAsset[];
  transcriptSegments?: TranscriptSegment[];
  musicStyle?: string;
  [key: string]: any;
}

interface VideoPreviewProps {
  videoSrc: string;
  editState: EditState;
  transcriptSegments?: TranscriptSegment[];
}

// --- Filter helpers ---

function buildCssFilter(filters: Filter[]): string {
  if (!filters || filters.length === 0) return "none";
  const parts: string[] = [];
  for (const f of filters) {
    const v = f.params?.value ?? 1;
    switch (f.type) {
      case "brightness":
        parts.push(`brightness(${v})`);
        break;
      case "contrast":
        parts.push(`contrast(${v})`);
        break;
      case "saturation":
        parts.push(`saturate(${v})`);
        break;
      case "blur":
        parts.push(`blur(${v}px)`);
        break;
      case "warm":
        parts.push("sepia(0.3) saturate(1.4)");
        break;
      case "cool":
        parts.push("hue-rotate(20deg) saturate(0.9)");
        break;
      case "cinematic":
        parts.push("contrast(1.1) saturate(0.85) brightness(0.95)");
        break;
      default:
        parts.push(`${f.type}(${v})`);
    }
  }
  return parts.join(" ");
}

// --- Caption style helpers ---

function getCaptionStyle(style?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: 6,
    textAlign: "center",
    maxWidth: "90%",
    lineHeight: 1.3,
    wordBreak: "break-word",
  };

  switch (style) {
    case "minimal":
      return {
        ...base,
        fontSize: 13,
        color: "#fff",
        background: "rgba(0,0,0,0.4)",
        fontWeight: 400,
      };
    case "cinematic":
      return {
        ...base,
        fontSize: 15,
        color: "#fff",
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
        fontWeight: 500,
        letterSpacing: "0.02em",
      };
    case "bold":
      return {
        ...base,
        fontSize: 18,
        color: "#fff",
        fontWeight: 800,
        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        textTransform: "uppercase" as const,
      };
    case "viral":
    default:
      return {
        ...base,
        fontSize: 17,
        color: "#FFD600",
        fontWeight: 700,
        textShadow: "0 2px 6px rgba(0,0,0,0.7)",
      };
  }
}

function getCaptionPositionStyle(position?: string): React.CSSProperties {
  switch (position) {
    case "top":
      return { top: 40, left: 0, right: 0, display: "flex", justifyContent: "center" };
    case "center":
      return { top: "50%", left: 0, right: 0, transform: "translateY(-50%)", display: "flex", justifyContent: "center" };
    case "bottom":
    default:
      return { bottom: 60, left: 0, right: 0, display: "flex", justifyContent: "center" };
  }
}

// --- VFX helpers ---

function VFXOverlay({ asset, visible }: { asset: VFXAsset; visible: boolean }) {
  if (!visible) return null;

  const intensity = asset.intensity ?? 0.5;
  const color = asset.color || "#ff6600";

  switch (asset.type) {
    case "light_leak":
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 30% 20%, ${color}40, transparent 70%)`,
            opacity: intensity * 0.6,
            animation: "lightLeakPulse 3s ease-in-out infinite alternate",
            pointerEvents: "none",
          }}
        />
      );
    case "bokeh":
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity: intensity * 0.7 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 10 + Math.random() * 20,
                height: 10 + Math.random() * 20,
                borderRadius: "50%",
                background: color,
                filter: "blur(6px)",
                opacity: 0.3 + Math.random() * 0.4,
                left: `${Math.random() * 100}%`,
                bottom: `-10%`,
                animation: `bokehFloat ${4 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      );
    case "particles":
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity: intensity * 0.6 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#fff",
                opacity: 0.4 + Math.random() * 0.5,
                left: `${Math.random() * 100}%`,
                bottom: `-5%`,
                animation: `particleFloat ${3 + Math.random() * 5}s linear infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      );
    default:
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: color,
            opacity: 0.15 * intensity,
            pointerEvents: "none",
          }}
        />
      );
  }
}

// --- Edit indicator pills ---

function EditIndicatorPills({ editState }: { editState: EditState }) {
  const pills: string[] = [];
  if (editState.cuts?.length) pills.push(`${editState.cuts.length} cut${editState.cuts.length > 1 ? "s" : ""}`);
  if (editState.captions) pills.push("captions");
  if (editState.filters?.length) pills.push(`${editState.filters.length} filter${editState.filters.length > 1 ? "s" : ""}`);
  if (editState.brollSegments?.length) pills.push(`${editState.brollSegments.length} b-roll`);
  if (editState.vfxAssets?.length) pills.push(`${editState.vfxAssets.length} VFX`);
  if (editState.speedAdjustments?.length) pills.push("speed");
  if (editState.segmentTransitions?.length) pills.push("transitions");

  if (pills.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      {pills.map((label) => (
        <span
          key={label}
          style={{
            padding: "2px 8px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            backdropFilter: "blur(4px)",
          }}
        >
          ✓ {label}
        </span>
      ))}
    </div>
  );
}

// --- Main component ---

export function VideoPreview({ videoSrc, editState, transcriptSegments }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const brollVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const [activeBroll, setActiveBroll] = useState<BRollSegment | null>(null);
  const [activeVfx, setActiveVfx] = useState<VFXAsset[]>([]);
  const [transitionOpacity, setTransitionOpacity] = useState(1);
  const [pendingBroll, setPendingBroll] = useState<BRollSegment | null>(null);
  const seekingRef = useRef(false);
  const lastBrollUrlRef = useRef<string | null>(null);

  const cuts = editState.cuts || [];
  const filters = editState.filters || [];
  const brollSegments = editState.brollSegments || [];
  const vfxAssets = editState.vfxAssets || [];
  const segments = transcriptSegments || editState.transcriptSegments || [];

  const cssFilter = useMemo(() => buildCssFilter(filters), [filters]);

  // Cut-end timestamps for transition detection
  const cutEnds = useMemo(() => cuts.map((c) => c.end), [cuts]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || seekingRef.current) return;
    const t = video.currentTime;

    // 1. CUTS: skip over cut regions
    for (const cut of cuts) {
      if (t >= cut.start && t < cut.end) {
        seekingRef.current = true;
        video.currentTime = cut.end;
        // Brief timeout to prevent re-triggering
        setTimeout(() => { seekingRef.current = false; }, 100);
        return;
      }
    }

    // 2. TRANSITIONS: fade near cut boundaries
    if (editState.segmentTransitions?.length) {
      let nearBoundary = false;
      for (const end of cutEnds) {
        if (Math.abs(t - end) < 0.3) {
          nearBoundary = true;
          break;
        }
      }
      if (nearBoundary && transitionOpacity === 1) {
        setTransitionOpacity(0);
        setTimeout(() => setTransitionOpacity(1), 300);
      }
    }

    // 3. CAPTIONS
    if (editState.captions && segments.length > 0) {
      const seg = segments.find((s) => t >= s.start && t <= s.end);
      setCurrentCaption(seg ? seg.text : null);
    } else {
      setCurrentCaption(null);
    }

    // 4. B-ROLL
    let foundBroll: BRollSegment | null = null;
    let foundPending: BRollSegment | null = null;
    for (const seg of brollSegments) {
      if (t >= seg.timestamp && t < seg.timestamp + seg.duration) {
        if (seg.url) {
          foundBroll = seg;
        } else if (seg.lumaGenerationId) {
          foundPending = seg;
        }
        break;
      }
    }
    setActiveBroll(foundBroll);
    setPendingBroll(foundPending);

    // Play/sync b-roll video
    if (foundBroll && brollVideoRef.current) {
      if (lastBrollUrlRef.current !== foundBroll.url) {
        lastBrollUrlRef.current = foundBroll.url!;
        brollVideoRef.current.src = foundBroll.url!;
        brollVideoRef.current.currentTime = t - foundBroll.timestamp;
        brollVideoRef.current.play().catch(() => {});
      }
    } else if (brollVideoRef.current) {
      lastBrollUrlRef.current = null;
      brollVideoRef.current.pause();
    }

    // 5. VFX
    const active = vfxAssets.filter((v) => {
      const start = v.timestamp ?? 0;
      const dur = v.duration ?? 999;
      return t >= start && t < start + dur;
    });
    setActiveVfx(active);
  }, [cuts, cutEnds, editState.captions, editState.segmentTransitions, segments, brollSegments, vfxAssets, transitionOpacity]);

  // Attach timeupdate listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [handleTimeUpdate]);

  // Toggle play
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Sync play state events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* VFX keyframes */}
      <style>{`
        @keyframes lightLeakPulse {
          0% { opacity: 0.2; transform: scale(1); }
          100% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes bokehFloat {
          0% { transform: translateY(0); opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-120vh); opacity: 0; }
        }
        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0.5; }
          100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
        }
      `}</style>

      {/* Edit indicator pills */}
      <EditIndicatorPills editState={editState} />

      {/* Main video */}
      <video
        ref={videoRef}
        src={videoSrc}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: cssFilter,
          opacity: transitionOpacity,
          transition: "opacity 0.3s ease",
        }}
        playsInline
        loop
        onClick={togglePlay}
      />

      {/* Overlay container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        {/* B-roll video overlay */}
        {activeBroll && (
          <video
            ref={brollVideoRef}
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 6,
            }}
          />
        )}

        {/* B-roll generating placeholder */}
        {!activeBroll && pendingBroll && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 6,
            }}
          >
            <div style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>
              <div style={{ marginBottom: 6, opacity: 0.9 }}>Generating b-roll...</div>
              {pendingBroll.query && (
                <div style={{ fontSize: 11, opacity: 0.5 }}>"{pendingBroll.query}"</div>
              )}
            </div>
          </div>
        )}

        {/* VFX overlays */}
        {activeVfx.map((vfx, i) => (
          <VFXOverlay key={`${vfx.type}-${i}`} asset={vfx} visible />
        ))}

        {/* Caption overlay */}
        {currentCaption && (
          <div
            style={{
              position: "absolute",
              ...getCaptionPositionStyle(editState.captionPosition),
              zIndex: 10,
            }}
          >
            <span style={getCaptionStyle(editState.captionStyle)}>{currentCaption}</span>
          </div>
        )}
      </div>

      {/* Play button overlay */}
      {!isPlaying && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            cursor: "pointer",
            zIndex: 15,
          }}
          onClick={togglePlay}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="black">
              <polygon points="6,3 20,12 6,21" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
