import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
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
  type: z.enum([
    "fade", "dissolve", "slide-left", "slide-right", "slide-up", "slide-down",
    "wipe", "wipe-up", "wipe-diagonal", "flip", "clock-wipe", "zoom", "flash", "glitch", "none",
  ]),
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

// Segment transition: defines what transition to use BETWEEN two adjacent kept segments
export const segmentTransitionSchema = z.object({
  afterSegmentIndex: z.number(), // transition after this kept-segment index
  type: z.enum([
    "fade", "dissolve", "slide-left", "slide-right", "slide-up", "slide-down",
    "wipe", "wipe-up", "wipe-diagonal", "flip", "clock-wipe", "none",
  ]),
  durationInFrames: z.number().optional(), // defaults to 15 (~0.5s at 30fps)
  timing: z.enum(["linear", "spring"]).optional(), // defaults to "spring"
});

export const schema = z.object({
  videoSrc: z.string(),
  cuts: z.array(cutSchema).optional().default([]),
  captions: z.array(captionSchema).optional().default([]),
  filters: z.array(filterSchema).optional().default([]),
  transitions: z.array(transitionSchema).optional().default([]),
  segmentTransitions: z.array(segmentTransitionSchema).optional().default([]),
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
  // Auto-polish: when true, automatically insert smooth transitions between all segments
  autoTransitions: z.boolean().optional().default(true),
  defaultTransitionType: z.enum([
    "fade", "dissolve", "slide-left", "slide-right", "slide-up", "slide-down",
    "wipe", "wipe-up", "wipe-diagonal", "flip", "clock-wipe", "none",
  ]).optional().default("fade"),
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

// ------ Helper: resolve a transition presentation from type string ------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolvePresentation(
  type: string,
  compositionWidth: number,
  compositionHeight: number,
): any {
  switch (type) {
    case "fade":
    case "dissolve":
      return fade();
    case "slide-left":
      return slide({ direction: "from-left" });
    case "slide-right":
      return slide({ direction: "from-right" });
    case "slide-up":
      return slide({ direction: "from-top" });
    case "slide-down":
      return slide({ direction: "from-bottom" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "wipe-up":
      return wipe({ direction: "from-bottom" });
    case "wipe-diagonal":
      return wipe({ direction: "from-top-left" });
    case "flip":
      return flip({ direction: "from-left", perspective: 1000 });
    case "clock-wipe":
      return clockWipe({ width: compositionWidth, height: compositionHeight });
    default:
      return fade();
  }
}

function resolveTiming(timingType: string | undefined, durationInFrames: number) {
  if (timingType === "linear") {
    return linearTiming({ durationInFrames });
  }
  return springTiming({
    durationInFrames,
    config: { damping: 200, mass: 0.8, stiffness: 100 },
  });
}

// ------ Choose smart transition based on gap context ------

const TRANSITION_TYPES = [
  "fade", "slide-left", "slide-right", "wipe", "wipe-up",
  "dissolve", "flip", "clock-wipe",
] as const;

function pickAutoTransition(segIndex: number, totalSegments: number): string {
  // Use a deterministic but varied pattern:
  // First/last transitions are fade (gentle), middle ones vary
  if (segIndex === 0 || segIndex === totalSegments - 2) {
    return "fade";
  }
  // Cycle through visually pleasing transitions
  const pool = ["fade", "wipe", "slide-left", "dissolve"];
  return pool[segIndex % pool.length];
}

// ------ Main Composition ------

export const VideoEditorComposition: React.FC<VideoEditorProps> = ({
  videoSrc,
  cuts = [],
  captions = [],
  filters = [],
  transitions = [],
  segmentTransitions = [],
  brollSegments = [],
  speedAdjustments = [],
  totalDurationInSeconds,
  gradeLook = "none",
  showFilmGrain = false,
  showCinematicBars = false,
  lowerThirdTitle,
  lowerThirdSubtitle,
  autoTransitions = true,
  defaultTransitionType = "fade",
}) => {
  const { fps, width, height } = useVideoConfig();

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

  const segments = useMemo(() => {
    if (cuts.length > 0) {
      return computeSegments(cuts, speedAdjustments, fps);
    }
    if (speedAdjustments.length > 0) {
      const syntheticCut = { start: 0, end: totalDurationInSeconds };
      return computeSegments([syntheticCut], speedAdjustments, fps);
    }
    return [];
  }, [cuts, speedAdjustments, fps, totalDurationInSeconds]);

  const videoFilter = useVideoFilter(filters as FilterSpec[], resolvedLook);

  const hasCuts = segments.length > 0;
  const showVignette =
    resolvedLook === "cinematic" ||
    resolvedLook === "dramatic" ||
    resolvedLook === "teal_orange";

  // Build the transition map: for each gap between segments, determine the transition
  const transitionMap = useMemo(() => {
    if (segments.length <= 1) return new Map<number, { type: string; durationInFrames: number; timing: string }>();

    const map = new Map<number, { type: string; durationInFrames: number; timing: string }>();

    // First, apply explicit segment transitions
    for (const st of segmentTransitions) {
      if (st.afterSegmentIndex >= 0 && st.afterSegmentIndex < segments.length - 1) {
        map.set(st.afterSegmentIndex, {
          type: st.type,
          durationInFrames: st.durationInFrames || 15,
          timing: st.timing || "spring",
        });
      }
    }

    // Then fill in auto-transitions for gaps without explicit ones
    if (autoTransitions) {
      for (let i = 0; i < segments.length - 1; i++) {
        if (!map.has(i)) {
          map.set(i, {
            type: defaultTransitionType !== "none" ? pickAutoTransition(i, segments.length) : "none",
            durationInFrames: 12, // ~0.4s at 30fps — snappy professional feel
            timing: "spring",
          });
        }
      }
    }

    return map;
  }, [segments, segmentTransitions, autoTransitions, defaultTransitionType]);

  // Check if any transitions use "none" — if ALL are none, fall back to Sequence rendering
  const hasRealTransitions = useMemo(() => {
    const entries = Array.from(transitionMap.values());
    return entries.some((t) => t.type !== "none");
  }, [transitionMap]);

  const useTransitionSeries = hasCuts && segments.length > 1 && hasRealTransitions;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>

      {/* === Video Layer with transitions === */}
      <AbsoluteFill style={videoFilter ? { filter: videoFilter } : undefined}>
        {useTransitionSeries ? (
          // Use TransitionSeries for seamless cross-segment transitions
          <TransitionSeries>
            {segments.map((seg, i) => {
              const elements: React.ReactNode[] = [];

              // Add the segment
              elements.push(
                <TransitionSeries.Sequence
                  key={`seg-${i}`}
                  durationInFrames={seg.durationFrames}
                >
                  <AbsoluteFill>
                    <OffthreadVideo
                      src={videoSrc}
                      startFrom={Math.round(seg.srcStart * fps)}
                      endAt={Math.round(seg.srcEnd * fps)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      playbackRate={seg.speed}
                    />
                  </AbsoluteFill>
                </TransitionSeries.Sequence>
              );

              // Add transition after this segment (if not the last one)
              const trans = transitionMap.get(i);
              if (trans && i < segments.length - 1 && trans.type !== "none") {
                const presentation = resolvePresentation(trans.type, width, height);
                const timing = resolveTiming(trans.timing, trans.durationInFrames);

                elements.push(
                  <TransitionSeries.Transition
                    key={`trans-${i}`}
                    presentation={presentation}
                    timing={timing}
                  />
                );
              }

              return elements;
            })}
          </TransitionSeries>
        ) : hasCuts ? (
          // Fallback: plain Sequence rendering (no transitions or single segment)
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

      {/* === Vignette === */}
      {showVignette && <VignetteOverlay />}

      {/* === Film Grain === */}
      {showFilmGrain && <FilmGrain opacity={0.04} />}

      {/* === Cinematic Bars === */}
      {showCinematicBars && <CinematicBars barHeight={55} />}

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
