import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import type { Word } from "../types/edl";

export const KineticCaptions: React.FC<{ words: Word[]; clipStartFrame: number }> = ({ words, clipStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const CHUNK_SIZE = 4;
  const chunks: Word[][] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE));
  }

  const activeChunk = chunks.find((chunk) => {
    const chunkStart = chunk[0].startFrame - clipStartFrame;
    const chunkEnd = chunk[chunk.length - 1].endFrame - clipStartFrame;
    return frame >= chunkStart && frame <= chunkEnd + 15;
  });

  if (!activeChunk) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "15%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "0 40px",
      }}
    >
      {activeChunk.map((word, i) => {
        const wordLocalStart = word.startFrame - clipStartFrame;
        const isActive = frame >= wordLocalStart;

        const pop = spring({
          frame: frame - wordLocalStart,
          fps,
          config: { damping: 12, stiffness: 200 },
        });

        return (
          <span
            key={i}
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: "64px",
              textTransform: "uppercase",
              color: isActive ? "#FFD700" : "#FFFFFF",
              transform: `scale(${isActive ? interpolate(pop, [0, 1], [0.8, 1.1]) : 1})`,
              textShadow: "0px 8px 16px rgba(0,0,0,0.8)",
              WebkitTextStroke: "2px black",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
