import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  Easing,
} from "remotion";

export interface VFXAsset {
  type:
    | "light_leak"
    | "bokeh"
    | "color_wash"
    | "particles"
    | "lens_flare"
    | "chromatic_aberration"
    | "smoke"
    | "prism"
    | "duotone"
    | "glow_pulse";
  color?: string;
  secondaryColor?: string;
  intensity?: number; // 0-1, default 0.5
  timestamp?: number; // seconds, default 0
  duration?: number; // seconds, default full video
  speed?: number; // animation speed multiplier, default 1
}

// ---- Light Leak: warm animated light wash drifting across the frame ----

function LightLeak({
  color = "#ff9f43",
  intensity = 0.35,
  speed = 1,
}: {
  color?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const x = 50 + Math.sin(t * 0.7) * 40;
  const y = 30 + Math.cos(t * 0.5) * 30;
  const size = 60 + Math.sin(t * 0.3) * 20;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse ${size}% ${size * 0.8}% at ${x}% ${y}%, ${color}${Math.round(intensity * 255).toString(16).padStart(2, "0")}, transparent 70%)`,
        mixBlendMode: "screen",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ---- Bokeh: blurred floating circles of light ----

const BOKEH_CIRCLES = Array.from({ length: 12 }, (_, i) => ({
  baseX: Math.random() * 100,
  baseY: Math.random() * 100,
  size: 20 + Math.random() * 60,
  phase: Math.random() * Math.PI * 2,
  speedX: 0.2 + Math.random() * 0.5,
  speedY: 0.15 + Math.random() * 0.4,
  hueShift: Math.random() * 30,
}));

function Bokeh({
  color = "#ffffff",
  intensity = 0.3,
  speed = 1,
}: {
  color?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {BOKEH_CIRCLES.map((c, i) => {
        const x = c.baseX + Math.sin(t * c.speedX + c.phase) * 15;
        const y = c.baseY + Math.cos(t * c.speedY + c.phase) * 12;
        const alpha = intensity * (0.3 + 0.7 * Math.abs(Math.sin(t * 0.3 + c.phase)));

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: c.size,
              height: c.size,
              borderRadius: "50%",
              background: color,
              opacity: alpha,
              filter: `blur(${c.size * 0.3}px) hue-rotate(${c.hueShift}deg)`,
              mixBlendMode: "screen",
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
}

// ---- Color Wash: animated gradient overlay ----

function ColorWash({
  color = "#6c5ce7",
  secondaryColor = "#00cec9",
  intensity = 0.25,
  speed = 1,
}: {
  color?: string;
  secondaryColor?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const angle = (t * 20) % 360;
  const shift = 50 + Math.sin(t * 0.4) * 30;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(${angle}deg, ${color} 0%, transparent ${shift}%, ${secondaryColor} 100%)`,
        opacity: intensity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ---- Particles: sparkling floating specs ----

const PARTICLE_SPECS = Array.from({ length: 20 }, (_, i) => ({
  baseX: Math.random() * 100,
  baseY: Math.random() * 100,
  size: 2 + Math.random() * 4,
  phase: Math.random() * Math.PI * 2,
  driftSpeed: 0.3 + Math.random() * 0.7,
  twinkleSpeed: 1.5 + Math.random() * 3,
}));

function Particles({
  color = "#ffffff",
  intensity = 0.7,
  speed = 1,
}: {
  color?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 6,
      }}
    >
      {PARTICLE_SPECS.map((p, i) => {
        const x = p.baseX + Math.sin(t * p.driftSpeed + p.phase) * 8;
        const y = (p.baseY - (t * 3 * p.driftSpeed) % 110 + 110) % 110;
        const alpha = intensity * Math.abs(Math.sin(t * p.twinkleSpeed + p.phase));

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: alpha,
              boxShadow: `0 0 ${p.size * 2}px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---- Lens Flare: bright directional light streak ----

function LensFlare({
  color = "#fff5e6",
  intensity = 0.4,
  speed = 1,
}: {
  color?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const x = 20 + Math.sin(t * 0.3) * 30;
  const y = 15 + Math.cos(t * 0.2) * 10;
  const flareSize = 40 + Math.sin(t * 0.5) * 15;
  const streakAngle = (t * 8) % 360;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {/* Main flare */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: flareSize * 3,
          height: flareSize * 3,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity: intensity,
          mixBlendMode: "screen",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Streak */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: flareSize * 6,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: intensity * 0.6,
          mixBlendMode: "screen",
          transform: `translate(-50%, -50%) rotate(${streakAngle}deg)`,
        }}
      />
    </div>
  );
}

// ---- Chromatic Aberration: RGB channel split effect ----

function ChromaticAberration({
  intensity = 0.5,
  speed = 1,
}: {
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const shift = intensity * (2 + Math.sin(t * 2) * 1.5);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,0,0,0.04)",
          transform: `translate(${shift}px, 0)`,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,255,0.04)",
          transform: `translate(${-shift}px, 0)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}

// ---- Smoke / Fog: drifting atmospheric overlay ----

function Smoke({
  color = "#aaaaaa",
  intensity = 0.2,
  speed = 1,
}: {
  color?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const drift = (t * 8) % 200;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {[0, 1, 2].map((layer) => {
        const layerDrift = drift + layer * 60;
        const y = 60 + layer * 10 + Math.sin(t * 0.3 + layer) * 5;
        const layerOpacity = intensity * (0.6 + layer * 0.15);

        return (
          <div
            key={layer}
            style={{
              position: "absolute",
              left: `${-20 + (layerDrift % 140)}%`,
              top: `${y}%`,
              width: "80%",
              height: "30%",
              borderRadius: "50%",
              background: color,
              opacity: layerOpacity,
              filter: `blur(${40 + layer * 15}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---- Prism: rainbow light refraction overlay ----

function Prism({
  intensity = 0.25,
  speed = 1,
}: {
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const angle = (t * 15) % 360;
  const x = 50 + Math.sin(t * 0.4) * 35;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(${angle}deg,
          rgba(255,0,0,${intensity * 0.5}) 0%,
          rgba(255,165,0,${intensity * 0.4}) 17%,
          rgba(255,255,0,${intensity * 0.4}) 33%,
          rgba(0,255,0,${intensity * 0.4}) 50%,
          rgba(0,0,255,${intensity * 0.4}) 67%,
          rgba(75,0,130,${intensity * 0.4}) 83%,
          rgba(148,0,211,${intensity * 0.5}) 100%)`,
        mixBlendMode: "screen",
        opacity: 0.4 + Math.sin(t * 0.6) * 0.2,
        pointerEvents: "none",
        zIndex: 5,
        clipPath: `polygon(${x - 20}% 0%, ${x + 20}% 0%, ${x + 10}% 100%, ${x - 10}% 100%)`,
      }}
    />
  );
}

// ---- Duotone: two-color tinting overlay ----

function Duotone({
  color = "#6c5ce7",
  secondaryColor = "#fdcb6e",
  intensity = 0.3,
}: {
  color?: string;
  secondaryColor?: string;
  intensity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg, ${color} 0%, ${secondaryColor} 100%)`,
        opacity: intensity,
        mixBlendMode: "color",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ---- Glow Pulse: rhythmic radial glow ----

function GlowPulse({
  color = "#e84393",
  intensity = 0.35,
  speed = 1,
}: {
  color?: string;
  intensity?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * speed;

  const pulse = 0.5 + Math.sin(t * 3) * 0.5;
  const size = 50 + pulse * 30;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle ${size}% at 50% 50%, ${color}${Math.round(intensity * pulse * 200).toString(16).padStart(2, "0")}, transparent 70%)`,
        mixBlendMode: "screen",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ---- Dispatch: renders the correct VFX component based on type ----

function VFXRenderer({ asset }: { asset: VFXAsset }) {
  const { type, color, secondaryColor, intensity, speed } = asset;

  switch (type) {
    case "light_leak":
      return <LightLeak color={color} intensity={intensity} speed={speed} />;
    case "bokeh":
      return <Bokeh color={color} intensity={intensity} speed={speed} />;
    case "color_wash":
      return <ColorWash color={color} secondaryColor={secondaryColor} intensity={intensity} speed={speed} />;
    case "particles":
      return <Particles color={color} intensity={intensity} speed={speed} />;
    case "lens_flare":
      return <LensFlare color={color} intensity={intensity} speed={speed} />;
    case "chromatic_aberration":
      return <ChromaticAberration intensity={intensity} speed={speed} />;
    case "smoke":
      return <Smoke color={color} intensity={intensity} speed={speed} />;
    case "prism":
      return <Prism intensity={intensity} speed={speed} />;
    case "duotone":
      return <Duotone color={color} secondaryColor={secondaryColor} intensity={intensity} />;
    case "glow_pulse":
      return <GlowPulse color={color} intensity={intensity} speed={speed} />;
    default:
      return null;
  }
}

// ---- Main VFX Layer ----

export const VFXLayer: React.FC<{
  assets: VFXAsset[];
  totalDurationInSeconds: number;
}> = ({ assets, totalDurationInSeconds }) => {
  const { fps } = useVideoConfig();

  if (!assets || assets.length === 0) return null;

  return (
    <>
      {assets.map((asset, i) => {
        const startFrame = Math.round((asset.timestamp ?? 0) * fps);
        const durationFrames = Math.round(
          (asset.duration ?? totalDurationInSeconds) * fps
        );

        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
            <VFXRenderer asset={asset} />
          </Sequence>
        );
      })}
    </>
  );
};
