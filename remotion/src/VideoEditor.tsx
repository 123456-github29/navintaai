import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { z } from "zod";
import { CaptionLayer, type CaptionSegment } from "./components/Caption";
import { ColorGradeOverlay, CinematicBars, type GradeLook } from "./components/ColorGrade";
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
  srcStart: number; // seconds into source
  srcEnd: number;
  timelineStart: number; // frame on timeline
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

  if (cuts.length === 0) return []; // handled by caller

  const sorted = [...cuts].sort((a, b) => a.start - b.start);

  for (const cut of sorted) {
    if (cut.end <= cut.start) continue;

    // Find speed for this segment
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
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const hasCuts = cuts.length > 0;
  const segments = hasCuts
    ? computeSegments(cuts, speedAdjustments, fps)
    : [];

  // Resolve filter look from filters array (auto-detect look from filter types)
  const resolvedLook: GradeLook =
    gradeLook !== "none"
      ? gradeLook
      : (() => {
          const types = (filters || []).map((f) => f.type);
          if (types.includes("cinematic")) return "cinematic";
          if (types.includes("vintage")) return "vintage";
          if (types.includes("warm")) return "warm";
          if (types.includes("cool")) return "cool";
          return "none";
        })();

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {/* === Video Layer === */}
      {hasCuts ? (
        // Render each cut segment as a sequence
        segments.map((seg, i) => (
          <Sequence
            key={i}
            from={seg.timelineStart}
            durationInFrames={seg.durationFrames}
          >
            <AbsoluteFill>
              <OffthreadVideo
                src={videoSrc}
                startFrom={Math.round(seg.srcStart * fps)}
                endAt={Math.round(seg.srcEnd * fps)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                playbackRate={seg.speed}
              />
            </AbsoluteFill>
          </Sequence>
        ))
      ) : (
        // No cuts - render full video
        <AbsoluteFill>
          <OffthreadVideo
            src={videoSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      )}

      {/* === B-Roll Layer === */}
      <BRollLayer
        segments={brollSegments as BRollSegment[]}
        timelineOffset={0}
      />

      {/* === Color Grade Overlay === */}
      <ColorGradeOverlay
        filters={filters}
        totalDuration={totalDurationInSeconds}
        look={resolvedLook}
      />

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
