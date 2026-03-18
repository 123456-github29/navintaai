import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { CaptionLayer, type CaptionSegment } from "./components/Caption";
import {
  useVideoFilter,
  VignetteOverlay,
  CinematicBars,
  type GradeLook,
  type FilterSpec,
} from "./components/ColorGrade";
import { FilmGrain } from "./components/FilmGrain";
import { BRollLayer, type BRollSegment } from "./components/BRollOverlay";
import { TransitionLayer, type TransitionSpec } from "./components/TransitionOverlay";
import { LowerThird } from "./components/LowerThird";

// ------ Zod schema for type-safe Remotion props ------

export const captionSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  style: z
    .enum(["default", "boxed", "gradient", "highlighted", "outline", "cinematic", "viral", "neon"])
    .optional(),
  position: z.enum(["top", "bottom", "center"]).optional(),
  baseTextColor: z.string().optional(),
  outlineColor: z.string().optional(),
});

export const filterSchema = z.object({
  type: z.string(),
  value: z.number().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

export const transitionSchema = z.object({
  type: z.enum(["fade", "dissolve", "wipe", "zoom", "flash", "glitch"]),
  timestamp: z.number(),
  duration: z.number(),
});

export const brollSchema = z.object({
  timestamp: z.number(),
  duration: z.number(),
  url: z.string().optional(),
  query: z.string().optional(),
  lumaGenerationId: z.string().optional(),
});

export const cutSchema = z.object({
  start: z.number(),
  end: z.number(),
  label: z.string().optional(),
});

export const speedAdjustmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  speed: z.number(),
});

export const schema = z.object({
  videoSrc: z.string(),
  cuts: z.array(cutSchema).optional().default([]),
  captions: z.array(captionSchema).optional().default([]),
  filters: z.array(filterSchema).optional().default([]),
  transitions: z.array(transitionSchema).optional().default([]),
  brollSegments: z.array(brollSchema).optional().default([]),
  speedAdjustments: z.array(speedAdjustmentSchema).optional().default([]),
  totalDurationInSeconds: z.number(),
  gradeLook: z
    .enum(["none", "cinematic", "vintage", "warm", "cool", "dramatic", "matte", "neon", "teal_orange"])
    .optional()
    .default("none"),
  showFilmGrain: z.boolean().optional().default(false),
  showCinematicBars: z.boolean().optional().default(false),
  lowerThirdTitle: z.string().optional(),
  lowerThirdSubtitle: z.string().optional(),
});

export type VideoEditorProps = z.infer<typeof schema>;

// ------ Helper: compute video segments from cuts ------

interface VideoSegment {
  srcStart: number;  // seconds into source video
  srcEnd: number;
  timelineStart: number; // frame index on the output timeline
  durationFrames: number;
  speed: number;
}

function computeSegments(
  cuts: Array<{ start: number; end: number }>,
  speedAdjustments: Array<{ start: number; end: number; speed: number }>,
  fps: number
): VideoSegment[] {
  const segments: VideoSegment[] = [];
  let timelineCursor = 0;

  const sorted = [...cuts].sort((a, b) => a.start - b.start);

  for (const cut of sorted) {
    if (cut.end <= cut.start) continue;

    // Use a speed adjustment that fully contains this cut
    const speedAdj = speedAdjustments.find(
      (s) => s.start <= cut.start && s.end >= cut.end
    );
    const speed = speedAdj?.speed ?? 1;

    const srcDuration = cut.end - cut.start;
    const durationFrames = Math.round((srcDuration / speed) * fps);

    segments.push({
      srcStart: cut.start,
      srcEnd: cut.end,
      timelineStart: timelineCursor,
      durationFrames,
      speed,
    });

    timelineCursor += durationFrames;
  }

  return segments;
}

// ------ Main Composition ------

export const VideoEditorComposition: React.FC<VideoEditorProps> = ({
  videoSrc,
  cuts = [],
  captions = [],
  filters = [],
  transitions = [],
  brollSegments = [],
  speedAdjustments = [],
  totalDurationInSeconds,
  gradeLook = "none",
  showFilmGrain = false,
  showCinematicBars = false,
  lowerThirdTitle,
  lowerThirdSubtitle,
}) => {
  const { fps } = useVideoConfig();

  // Resolve look from prop or auto-detect from filter types
  const resolvedLook: GradeLook = useMemo(() => {
    if (gradeLook !== "none") return gradeLook;
    for (const f of filters) {
      if (f.type === "cinematic") return "cinematic";
      if (f.type === "vintage") return "vintage";
      if (f.type === "warm") return "warm";
      if (f.type === "cool") return "cool";
      if (f.type === "dramatic") return "dramatic";
    }
    return "none";
  }, [gradeLook, filters]);

  // Compute cut segments once per render (not per frame).
  // If there are no explicit cuts but there ARE speed adjustments, synthesise a
  // single full-video segment so the speed is applied.
  const segments = useMemo(() => {
    if (cuts.length > 0) {
      return computeSegments(cuts, speedAdjustments, fps);
    }
    if (speedAdjustments.length > 0) {
      // No cuts — treat entire video as one segment, but apply speed adjustments
      const syntheticCut = { start: 0, end: totalDurationInSeconds };
      return computeSegments([syntheticCut], speedAdjustments, fps);
    }
    return [];
  }, [cuts, speedAdjustments, fps, totalDurationInSeconds]);

  // Get the video CSS filter string — this MUST be called as a hook (calls useCurrentFrame internally)
  const videoFilter = useVideoFilter(filters as FilterSpec[], resolvedLook);

  const hasCuts = segments.length > 0;
  const showVignette =
    resolvedLook === "cinematic" ||
    resolvedLook === "dramatic" ||
    resolvedLook === "teal_orange";

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>

      {/* === Video Layer — filter applied HERE so it actually affects the video === */}
      <AbsoluteFill style={videoFilter ? { filter: videoFilter } : undefined}>
        {hasCuts ? (
          segments.map((seg, i) => (
            <Sequence
              key={i}
              from={seg.timelineStart}
              durationInFrames={seg.durationFrames}
            >
              <AbsoluteFill>
                <OffthreadVideo
                  src={videoSrc}
                  // startFrom / endAt are in frames for OffthreadVideo
                  startFrom={Math.round(seg.srcStart * fps)}
                  endAt={Math.round(seg.srcEnd * fps)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  playbackRate={seg.speed}
                />
              </AbsoluteFill>
            </Sequence>
          ))
        ) : (
          <OffthreadVideo
            src={videoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </AbsoluteFill>

      {/* === B-Roll Layer === */}
      <BRollLayer segments={brollSegments as BRollSegment[]} timelineOffset={0} />

      {/* === Vignette (gradient overlay — works fine as empty div) === */}
      {showVignette && <VignetteOverlay />}

      {/* === Film Grain === */}
      {showFilmGrain && <FilmGrain opacity={0.04} />}

      {/* === Cinematic Bars === */}
      {showCinematicBars && <CinematicBars barHeight={55} />}

      {/* === Transitions === */}
      <TransitionLayer transitions={transitions as TransitionSpec[]} />

      {/* === Captions === */}
      <CaptionLayer segments={captions as CaptionSegment[]} />

      {/* === Lower Third === */}
      {lowerThirdTitle && (
        <LowerThird
          title={lowerThirdTitle}
          subtitle={lowerThirdSubtitle}
          showAt={1}
          hideAt={Math.min(5, totalDurationInSeconds - 1)}
        />
      )}
    </AbsoluteFill>
  );
};
