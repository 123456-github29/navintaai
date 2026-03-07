import os
import time
import subprocess
import tempfile
import requests

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

def _extract_audio(video_path: str) -> str:
    audio_path = video_path.rsplit(".", 1)[0] + "_audio.wav"
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        "-y", audio_path
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    return audio_path

def transcribe_words(local_path: str):
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")

    print(f"[transcribe] Starting transcription via OpenAI Whisper API...", flush=True)
    start = time.time()

    audio_path = _extract_audio(local_path)

    try:
        with open(audio_path, "rb") as f:
            response = requests.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                files={"file": ("audio.wav", f, "audio/wav")},
                data={
                    "model": "gpt-4o-transcribe",
                    "response_format": "verbose_json",
                },
                timeout=120,
            )

        if response.status_code != 200:
            raise RuntimeError(f"Whisper API error {response.status_code}: {response.text}")

        data = response.json()

        api_words = data.get("words", [])

        if not api_words and data.get("segments"):
            for seg in data["segments"]:
                for w in seg.get("words", []):
                    api_words.append(w)

        if not api_words:
            raise RuntimeError(
                f"Whisper API returned no word-level timestamps. "
                f"Keys in response: {list(data.keys())}"
            )

        words = []
        for w in api_words:
            text = (w.get("word") or w.get("text", "")).strip()
            if not text:
                continue
            words.append({
                "text": text,
                "startMs": int(w["start"] * 1000),
                "endMs": int(w["end"] * 1000),
            })

        print(f"[transcribe] Done: {len(words)} words in {time.time()-start:.1f}s", flush=True)
        return words
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
