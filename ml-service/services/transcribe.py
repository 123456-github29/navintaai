import tempfile
import os
import requests

MODEL_SIZE = "small"
_model = None

def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        print(f"[transcribe] Loading Whisper model '{MODEL_SIZE}'...")
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        print(f"[transcribe] Whisper model loaded successfully")
    return _model

def _download_to_tmp(url: str) -> str:
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".mp4")
    with os.fdopen(fd, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    return path

def transcribe_words(video_url: str):
    local_path = _download_to_tmp(video_url)

    model = _get_model()
    segments, info = model.transcribe(
        local_path,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=250),
    )

    words = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            words.append({
                "text": w.word.strip(),
                "startMs": int(w.start * 1000),
                "endMs": int(w.end * 1000),
            })

    os.remove(local_path)
    return words
