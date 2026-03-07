import { useState, useEffect, useCallback, useRef } from "react";
import {
  PlayIcon,
  PauseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface TeleprompterCard {
  text: string;
  durationSec: number;
  beatType: string;
}

interface TeleprompterOverlayProps {
  cards: TeleprompterCard[];
  isRecording: boolean;
  onClose: () => void;
}

export function TeleprompterOverlay({ cards, isRecording, onClose }: TeleprompterOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [fontSize, setFontSize] = useState(28);
  const [showControls, setShowControls] = useState(true);
  const [mirrored, setMirrored] = useState(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1));
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying && currentCard) {
      const duration = (currentCard.durationSec / speed) * 1000;
      timerRef.current = window.setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, currentCard, speed, cards.length]);

  useEffect(() => {
    if (isRecording && !isPlaying) {
      setIsPlaying(true);
    }
  }, [isRecording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goPrev();
          break;
        case "r":
        case "R":
          e.preventDefault();
          reset();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, goNext, goPrev, reset, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartRef.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    togglePlay();
  };

  if (!currentCard) return null;

  const beatLabel =
    currentCard.beatType === "hook" ? "HOOK" :
    currentCard.beatType === "payoff" ? "PAYOFF" :
    currentCard.beatType === "cta" ? "CTA" :
    currentCard.beatType === "pattern_interrupt" ? "PUNCH" : "";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 flex flex-col pointer-events-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
      style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-white/60 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[90%] text-center space-y-3" style={{ transform: mirrored ? "scaleX(-1)" : undefined }}>
          {beatLabel && (
            <span className="inline-block px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/70 text-[10px] font-semibold tracking-[0.2em] uppercase">
              {beatLabel}
            </span>
          )}

          <p
            className="text-white font-semibold leading-relaxed drop-shadow-lg"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.4,
              textShadow: "0 2px 8px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {currentCard.text}
          </p>

          {nextCard && (
            <p
              className="text-white/30 font-medium leading-relaxed mt-4"
              style={{
                fontSize: `${Math.round(fontSize * 0.65)}px`,
                lineHeight: 1.3,
              }}
            >
              {nextCard.text}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-white/40 text-xs font-mono">
              {currentIndex + 1}/{cards.length}
            </span>
            {!isPlaying && (
              <span className="text-white/30 text-xs">
                tap or press space to play
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2" style={{ transform: mirrored ? "scaleX(-1)" : undefined }}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors"
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {showControls && (
        <div
          className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-black/50 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={goNext}
              disabled={currentIndex === cards.length - 1}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            <button
              onClick={reset}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px] uppercase tracking-wider">Speed</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-16 h-1 accent-white/60"
              />
              <span className="text-white/60 text-xs font-mono w-8">{speed.toFixed(1)}x</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white/50 text-[10px] uppercase tracking-wider">Size</span>
              <input
                type="range"
                min="18"
                max="44"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-16 h-1 accent-white/60"
              />
            </div>

            <button
              onClick={() => setMirrored(!mirrored)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium tracking-wider uppercase transition-colors ${
                mirrored ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Mirror
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
