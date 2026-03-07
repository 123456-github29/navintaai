import React from "react";
import { AbsoluteFill, Sequence, OffthreadVideo, interpolate, useCurrentFrame } from "remotion";
import type { BrollInsert } from "../types/edl";

const CROSSFADE_FRAMES = 4;

const LumaBrollClip: React.FC<{ insert: BrollInsert }> = ({ insert }) => {
  const frame = useCurrentFrame();
  const mode = insert.transform?.mode ?? "full";
  const lumaGain = insert.audio?.lumaAudioGain ?? 0;

  const fadeIn = interpolate(frame, [0, CROSSFADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [insert.durationInFrames - CROSSFADE_FRAMES, insert.durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = insert.mix * fadeIn * fadeOut;

  if (mode === "full") {
    return (
      <AbsoluteFill style={{ opacity, zIndex: 25 }}>
        <OffthreadVideo
          src={insert.src}
          muted={lumaGain === 0}
          volume={lumaGain}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    );
  }

  if (mode === "pip") {
    const x = insert.transform?.x ?? 65;
    const y = insert.transform?.y ?? 65;
    const w = insert.transform?.w ?? 30;
    const h = insert.transform?.h ?? 30;
    const radius = insert.transform?.cornerRadius ?? 12;
    const shadow = insert.transform?.shadow ?? true;

    return (
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: `${w}%`,
          height: `${h}%`,
          borderRadius: radius,
          overflow: "hidden",
          opacity,
          zIndex: 25,
          boxShadow: shadow ? "0 4px 20px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <OffthreadVideo
          src={insert.src}
          muted={lumaGain === 0}
          volume={lumaGain}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ opacity: opacity * (insert.mix ?? 0.7), zIndex: 25, mixBlendMode: "screen" }}>
      <OffthreadVideo
        src={insert.src}
        muted={lumaGain === 0}
        volume={lumaGain}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

export const LumaBrollLayer: React.FC<{ inserts: BrollInsert[] }> = ({ inserts }) => {
  if (!inserts || inserts.length === 0) return null;

  return (
    <>
      {inserts.map((insert) => (
        <Sequence
          key={insert.id}
          from={insert.startFrame}
          durationInFrames={insert.durationInFrames}
          layout="none"
        >
          <LumaBrollClip insert={insert} />
        </Sequence>
      ))}
    </>
  );
};
