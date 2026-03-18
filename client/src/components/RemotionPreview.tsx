import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { VideoEditorComposition } from "../../../remotion/src/VideoEditor";
import type { VideoEditorProps } from "../../../remotion/src/VideoEditor";
import { Play } from "lucide-react";

interface EditState {
  cuts?: Array<{ start: number; end: number; label?: string }>;
  speedAdjustments?: Array<{ start: number; end: number; speed: number }>;
  captions?: boolean;
  captionStyle?: string;
  captionPosition?: string;
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
  musicStyle?: string;
  filters?: Array<{
    type: string;
    params?: { value?: number };
    startTime?: number;
    endTime?: number;
  }>;
  transitions?: Array<{ type: string; timestamp: number; duration: number }>;
  segmentTransitions?: Array<{
    afterSegmentIndex: number;
    type: string;
    durationInFrames?: number;
    timing?: string;
  }>;
  autoTransitions?: boolean;
  defaultTransitionType?: string;
  brollSegments?: Array<{
    timestamp: number;
    duration: number;
    query?: string;
    lumaGenerationId?: string;
    url?: string;
  }>;
}

interface RemotionPreviewProps {
  videoUrl: string;
  editState: EditState;
  videoDuration: number;
}

const FPS = 30;

/**
 * Converts "sections to remove" into "sections to keep".
 * The AI generates cuts as intervals to REMOVE from the video.
 * The Remotion composition expects cuts as intervals to KEEP (play).
 * This function inverts the semantics.
 */
function invertCuts(
  cutsToRemove: Array<{ start: number; end: number }>,
  totalDuration: number
): Array<{ start: number; end: number }> {
  if (cutsToRemove.length === 0) return [];

  const sorted = [...cutsToRemove]
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start);

  const kept: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (const cut of sorted) {
    // Clamp to valid range
    const start = Math.max(0, cut.start);
    const end = Math.min(totalDuration, cut.end);
    if (start >= end) continue;

    if (start > cursor) {
      kept.push({ start: cursor, end: start });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < totalDuration) {
    kept.push({ start: cursor, end: totalDuration });
  }

  return kept;
}

type CaptionStyleEnum = "default" | "boxed" | "gradient" | "highlighted" | "outline" | "cinematic" | "viral" | "neon";

function buildInputProps(
  videoUrl: string,
  editState: EditState,
  videoDuration: number
): VideoEditorProps {
  // Invert cuts: AI stores "sections to remove", Remotion needs "sections to keep"
  const rawCuts = (editState.cuts || [])
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start);
  const cuts = rawCuts.length > 0 ? invertCuts(rawCuts, videoDuration) : [];

  const filters = (editState.filters || []).map((f) => ({
    type: f.type,
    value: f.params?.value ?? 1.0,
    startTime: f.startTime,
    endTime: f.endTime,
  }));

  let gradeLook: VideoEditorProps["gradeLook"] = "none";
  for (const f of filters) {
    if (f.type === "vintage") { gradeLook = "vintage"; break; }
    if (f.type === "warm") { gradeLook = "warm"; break; }
    if (f.type === "cool") { gradeLook = "cool"; break; }
    if (f.type === "cinematic") { gradeLook = "cinematic"; break; }
    if (f.type === "dramatic") { gradeLook = "dramatic"; break; }
  }

  const validTransitionTypes = [
    "fade", "dissolve", "wipe", "zoom", "flash", "glitch",
    "slide-left", "slide-right", "slide-up", "slide-down",
    "wipe-up", "wipe-diagonal", "flip", "clock-wipe", "none",
  ] as const;
  type ValidTransition = (typeof validTransitionTypes)[number];

  const transitions = (editState.transitions || [])
    .filter((t) => validTransitionTypes.includes(t.type as ValidTransition))
    .map((t) => ({
      type: t.type as ValidTransition,
      timestamp: t.timestamp,
      duration: t.duration,
    }));

  // Segment transitions for smooth cross-segment blending
  const segmentTransitions = (editState.segmentTransitions || []).map((st) => ({
    afterSegmentIndex: st.afterSegmentIndex,
    type: st.type as any,
    durationInFrames: st.durationInFrames || 12,
    timing: (st.timing as "linear" | "spring") || "spring",
  }));

  const brollSegments = (editState.brollSegments || [])
    .filter((s) => s.url)
    .map((s) => ({
      timestamp: s.timestamp,
      duration: s.duration,
      url: s.url,
      query: s.query,
      lumaGenerationId: s.lumaGenerationId,
    }));

  const captionStyle: CaptionStyleEnum = (editState.captionStyle as CaptionStyleEnum) || "viral";
  const captionPosition = (editState.captionPosition as "top" | "bottom" | "center") || "bottom";
  const captions =
    editState.captions && editState.transcriptSegments?.length
      ? editState.transcriptSegments
          .filter((s) => s.end > s.start)
          .map((s) => ({
            start: s.start,
            end: s.end,
            text: s.text,
            style: captionStyle,
            position: captionPosition,
          }))
      : [];

  return {
    videoSrc: videoUrl,
    cuts,
    captions,
    filters,
    transitions,
    segmentTransitions,
    brollSegments,
    speedAdjustments: editState.speedAdjustments || [],
    totalDurationInSeconds: videoDuration,
    gradeLook,
    showFilmGrain: false,
    showCinematicBars: false,
    autoTransitions: editState.autoTransitions !== false, // default true
    defaultTransitionType: (editState.defaultTransitionType as any) || "fade",
  };
}

export function RemotionPreview({ videoUrl, editState, videoDuration }: RemotionPreviewProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const inputProps = useMemo(
    () => buildInputProps(videoUrl, editState, videoDuration),
    [videoUrl, editState, videoDuration]
  );

  // Compute actual output duration (accounting for cuts removing sections)
  const outputDuration = useMemo(() => {
    if (inputProps.cuts && inputProps.cuts.length > 0) {
      return inputProps.cuts.reduce((sum, c) => sum + (c.end - c.start), 0);
    }
    return videoDuration;
  }, [inputProps.cuts, videoDuration]);

  const durationInFrames = Math.max(1, Math.round(outputDuration * FPS));

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full">
      <Player
        ref={playerRef}
        component={VideoEditorComposition}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={FPS}
        compositionWidth={1080}
        compositionHeight={1920}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "inherit",
          overflow: "hidden",
        }}
        loop
        autoPlay={false}
        controls={false}
        clickToPlay={false}
      />
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlayPause}
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-7 w-7 text-black ml-1" />
          </div>
        </div>
      )}
      {isPlaying && (
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={togglePlayPause}
        />
      )}
    </div>
  );
}
