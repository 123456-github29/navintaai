
import { EDL, Clip, Word } from '../types/edl';

export class DecisionEngine {
  static readonly FPS = 30;
  static readonly PAUSE_CUT_THRESHOLD_MS = 500;
  static readonly BUFFER_MS = 150;

  private static msToFrames(ms: number): number {
    return Math.round((ms / 1000) * this.FPS);
  }

  static generateTimeline(transcript: any[], videoSrc: string): EDL {
    const clips: Clip[] = [];
    let currentWords: Word[] = [];
    let lastClipEndMs = 0;

    transcript.forEach((word, index) => {
      const startMs = word.start;
      const endMs = word.end;
      const nextWord = transcript[index + 1];

      const parsedWord: Word = {
        text: word.text,
        startMs,
        endMs,
        startFrame: this.msToFrames(startMs),
        endFrame: this.msToFrames(endMs),
      };

      currentWords.push(parsedWord);
      const gapToNext = nextWord ? nextWord.start - endMs : Infinity;

      if (gapToNext > this.PAUSE_CUT_THRESHOLD_MS) {
        const paddedStartMs = Math.max(lastClipEndMs, currentWords[0].startMs - this.BUFFER_MS);
        const paddedEndMs = currentWords[currentWords.length - 1].endMs + this.BUFFER_MS;

        const trimStartFrame = this.msToFrames(paddedStartMs);
        const trimEndFrame = this.msToFrames(paddedEndMs);
        const durationInFrames = Math.max(1, trimEndFrame - trimStartFrame);

        clips.push({
          id: `clip_${index}`,
          src: videoSrc,
          trimStartFrame,
          durationInFrames,
          zoomTarget: clips.length === 0 ? 1.15 : 1.05,
          words: [...currentWords],
        });

        lastClipEndMs = paddedEndMs;
        currentWords = [];
      }
    });

    return { fps: this.FPS, clips, musicSrc: null };
  }
}
