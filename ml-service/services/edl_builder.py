def ms_to_frames(ms: int, fps: int) -> int:
  return round((ms / 1000.0) * fps)

def build_edl(fps: int, video_url: str, words, scenes, faces, motion):
  PAUSE_CUT_MS = 500
  BUFFER_MS = 150

  clips = []
  current = []
  last_end_ms = 0

  for i, w in enumerate(words):
      current.append(w)
      next_w = words[i + 1] if i + 1 < len(words) else None
      gap = (next_w["startMs"] - w["endMs"]) if next_w else 10**9

      if gap > PAUSE_CUT_MS:
          start_ms = max(last_end_ms, current[0]["startMs"] - BUFFER_MS)
          end_ms = current[-1]["endMs"] + BUFFER_MS

          trim_start = ms_to_frames(start_ms, fps)
          trim_end = ms_to_frames(end_ms, fps)
          dur = max(1, trim_end - trim_start)

          # simple zoom heuristic: if face mostly present, do subtle zooms
          face_ratio = faces.get("faceRatio", 0.0)
          zoom = 1.15 if len(clips) == 0 else (1.07 if face_ratio > 0.6 else 1.03)

          # attach frame info to words
          words_with_frames = []
          for ww in current:
              words_with_frames.append({
                  **ww,
                  "startFrame": ms_to_frames(ww["startMs"], fps),
                  "endFrame": ms_to_frames(ww["endMs"], fps),
              })

          clips.append({
              "id": f"clip_{len(clips)}",
              "src": video_url,
              "trimStartFrame": trim_start,
              "durationInFrames": dur,
              "zoomTarget": zoom,
              "words": words_with_frames,
          })

          last_end_ms = end_ms
          current = []

  return {
      "fps": fps,
      "clips": clips,
      "musicSrc": None,
      "meta": {
          "faceRatio": faces.get("faceRatio"),
          "avgMotion": motion.get("avgMotion"),
      }
  }