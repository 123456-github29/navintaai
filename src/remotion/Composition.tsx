import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, useCurrentFrame, useVideoConfig, interpolate, Img } from "remotion";
import { CaptionTrack } from "./components/CaptionTrack";
import { SpecCaptionRenderer } from "../captions/SpecCaptionRenderer";
import { TransitionLayer } from "./components/TransitionLayer";
import { WatermarkOverlay } from "./components/WatermarkOverlay";
import { colorPresetFilters } from "./styles/presets";
import type { EditDecision, VideoSegment, AudioSegment } from "../schemas/editDecision.schema";
import type { CaptionStyleSpec } from "../captions/styleSpec";

interface MainCompositionProps extends EditDecision {
  watermark?: boolean;
  captionStyleSpec?: CaptionStyleSpec;
}

const VideoSegmentRenderer: React.FC<{
  segment: VideoSegment;
  assetSrc: string;
}> = ({ segment, assetSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < segment.startFrame || frame >= segment.endFrame) return null;

  const localFrame = frame - segment.startFrame;
  const segmentDuration = segment.endFrame - segment.startFrame;
  const progress = localFrame / segmentDuration;

  let transform = "";
  if (segment.cameraMotion === "slow-zoom-in") {
    const scale = interpolate(progress, [0, 1], [1.0, 1.06]);
    transform = `scale(${scale})`;
  } else if (segment.cameraMotion === "slow-zoom-out") {
    const scale = interpolate(progress, [0, 1], [1.06, 1.0]);
    transform = `scale(${scale})`;
  } else if (segment.cameraMotion === "pan-left") {
    const tx = interpolate(progress, [0, 1], [0, -3]);
    transform = `scale(1.06) translateX(${tx}%)`;
  } else if (segment.cameraMotion === "pan-right") {
    const tx = interpolate(progress, [0, 1], [0, 3]);
    transform = `scale(1.06) translateX(${tx}%)`;
  }

  const filter = colorPresetFilters[segment.colorPreset] || "none";

  const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(assetSrc);

  return (
    <AbsoluteFill
      style={{
        transform,
        filter,
        overflow: "hidden",
      }}
    >
      {isImage ? (
        <Img
          src={assetSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <OffthreadVideo
          src={assetSrc}
          startFrom={segment.trimStart}
          volume={segment.volume}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

const AudioSegmentRenderer: React.FC<{
  segment: AudioSegment;
  assetSrc: string;
}> = ({ segment, assetSrc }) => {
  const frame = useCurrentFrame();

  if (frame < segment.startFrame || frame >= segment.endFrame) return null;

  return (
    <Audio
      src={assetSrc}
      startFrom={segment.trimStart}
      volume={segment.volume}
    />
  );
};

export const MainComposition: React.FC<MainCompositionProps> = (props) => {
  const { tracks, assetMap, watermark = false, captionStyleSpec } = props;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {tracks.video.map((segment) => {
        const src = assetMap[segment.assetId];
        if (!src) return null;
        return <VideoSegmentRenderer key={segment.id} segment={segment} assetSrc={src} />;
      })}

      {tracks.audio.map((segment) => {
        const src = assetMap[segment.assetId];
        if (!src) return null;
        return <AudioSegmentRenderer key={segment.id} segment={segment} assetSrc={src} />;
      })}

      <TransitionLayer transitions={tracks.transitions} />

      {captionStyleSpec ? (
        <SpecCaptionRenderer captions={tracks.captions} styleSpec={captionStyleSpec} />
      ) : (
        <CaptionTrack captions={tracks.captions} />
      )}

      <WatermarkOverlay enabled={watermark} />
    </AbsoluteFill>
  );
};
