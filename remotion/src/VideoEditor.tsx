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

export const videoSourceSchema = z.object({
  src: z.string(),
  durationInSeconds: z.number(),
});

export const schema = z.object({
  videoSrc: z.string(),
  videoSources: z.array(videoSourceSchema).optional().default([]),
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

// ------ Helper: compute video segments from cuts (single source) ------

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

// ------ Helper: compute multi-source segments from cuts ------

interface MultiSourceSegment {
  src: string;
  srcStart: number;   // local time within the specific source video
  srcEnd: number;
  timelineStart: number; // frame on the output timeline
  durationFrames: number;
  speed: number;
}

interface SourceTimeline {
  src: string;
  globalStart: number;
  globalEnd: number;
  duration: number;
}

function buildSourceTimeline(
  sources: Array<{ src: string; durationInSeconds: number }>
): SourceTimeline[] {
  const timeline: SourceTimeline[] = [];
  let acc = 0;
  for (const s of sources) {
    timeline.push({
      src: s.src,
      globalStart: acc,
      globalEnd: acc + s.durationInSeconds,
      duration: s.durationInSeconds,
    });
    acc += s.durationInSeconds;
  }
  return timeline;
}

function computeMultiSourceSegments(
  cuts: Array<{ start: number; end: number }>,
  speedAdjustments: Array<{ start: number; end: number; speed: number }>,
  sources: SourceTimeline[],
  fps: number
): MultiSourceSegment[] {
  const segments: MultiSourceSegment[] = [];
  let timelineCursor = 0;

  const sorted = [...cuts].sort((a, b) => a.start - b.start);

  for (const cut of sorted) {
    if (cut.end <= cut.start) continue;

    // A cut may span multiple source videos — split at source boundaries
    for (const source of sources) {
      const overlapStart = Math.max(cut.start, source.globalStart);
      const overlapEnd = Math.min(cut.end, source.globalEnd);
      if (overlapStart >= overlapEnd) continue;

      const localStart = overlapStart - source.globalStart;
      const localEnd = overlapEnd - source.globalStart;

      const speedAdj = speedAdjustments.find(
        (s) => s.start <= overlapStart && s.end >= overlapEnd
      );
      const speed = speedAdj?.speed ?? 1;

      const srcDuration = localEnd - localStart;
      const durationFrames = Math.round((srcDuration / speed) * fps);

      segments.push({
        src: source.src,
        srcStart: localStart,
        srcEnd: localEnd,
        timelineStart: timelineCursor,
        durationFrames,
        speed,
      });

      timelineCursor += durationFrames;
    }
  }

  return segments;
}

// ------ Main Composition ------

export const VideoEditorComposition: React.FC<VideoEditorProps> = ({
  videoSrc,
  videoSources = [],
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

  const hasMultipleSources = videoSources.length > 1;

  // Build source timeline for multi-source mode
  const sourceTimeline = useMemo(
    () => (hasMultipleSources ? buildSourceTimeline(videoSources) : []),
    [videoSources, hasMultipleSources]
  );

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

  // Compute segments for single-source mode
  const singleSourceSegments = useMemo(() => {
    if (hasMultipleSources) return [];
    if (cuts.length > 0) {
      return computeSegments(cuts, speedAdjustments, fps);
    }
    if (speedAdjustments.length > 0) {
      const syntheticCut = { start: 0, end: totalDurationInSeconds };
      return computeSegments([syntheticCut], speedAdjustments, fps);
    }
    return [];
  }, [cuts, speedAdjustments, fps, totalDurationInSeconds, hasMultipleSources]);

  // Compute segments for multi-source mode
  const multiSourceSegments = useMemo(() => {
    if (!hasMultipleSources) return [];
    if (cuts.length > 0) {
      return computeMultiSourceSegments(cuts, speedAdjustments, sourceTimeline, fps);
    }
    if (speedAdjustments.length > 0) {
      const syntheticCut = { start: 0, end: totalDurationInSeconds };
      return computeMultiSourceSegments([syntheticCut], speedAdjustments, sourceTimeline, fps);
    }
    // No cuts — play all sources sequentially
    return [];
  }, [cuts, speedAdjustments, fps, totalDurationInSeconds, hasMultipleSources, sourceTimeline]);

  // Get the video CSS filter string
  const videoFilter = useVideoFilter(filters as FilterSpec[], resolvedLook);

  const hasCuts = hasMultipleSources
    ? multiSourceSegments.length > 0
    : singleSourceSegments.length > 0;
  const showVignette =
    resolvedLook === "cinematic" ||
    resolvedLook === "dramatic" ||
    resolvedLook === "teal_orange";

  // Render the video layer based on source mode
  const renderVideoLayer = () => {
    if (hasMultipleSources) {
      // Multi-source mode: stitch multiple clips together seamlessly
      if (hasCuts) {
        // Cuts/speed adjustments: render mapped segments
        return multiSourceSegments.map((seg, i) => (
          <Sequence
            key={`ms-${i}`}
            from={seg.timelineStart}
            durationInFrames={seg.durationFrames}
          >
            <AbsoluteFill>
              <OffthreadVideo
                src={seg.src}
                startFrom={Math.round(seg.srcStart * fps)}
                endAt={Math.round(seg.srcEnd * fps)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                playbackRate={seg.speed}
              />
            </AbsoluteFill>
          </Sequence>
        ));
      } else {
        // No cuts — play all sources back-to-back seamlessly
        let frameOffset = 0;
        return videoSources.map((source, i) => {
          const frames = Math.round(source.durationInSeconds * fps);
          const from = frameOffset;
          frameOffset += frames;
          return (
            <Sequence
              key={`src-${i}`}
              from={from}
              durationInFrames={frames}
            >
              <AbsoluteFill>
                <OffthreadVideo
                  src={source.src}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </AbsoluteFill>
            </Sequence>
          );
        });
      }
    } else {
      // Single-source mode (original behavior)
      if (hasCuts) {
        return singleSourceSegments.map((seg, i) => (
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
        ));
      } else {
        return (
          <OffthreadVideo
            src={videoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        );
      }
    }
  };

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>

      {/* === Video Layer — filter applied HERE so it actually affects the video === */}
      <AbsoluteFill style={videoFilter ? { filter: videoFilter } : undefined}>
        {renderVideoLayer()}
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
