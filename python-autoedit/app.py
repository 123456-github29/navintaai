import os
import time
import tempfile
import requests
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
import traceback

app = FastAPI(title="Navinta AutoEdit Service")

if not os.environ.get("OPENAI_API_KEY"):
    print("[autoedit] WARNING: OPENAI_API_KEY not set — transcription will fail", flush=True)
else:
    print("[autoedit] OPENAI_API_KEY configured", flush=True)

ML_SERVICE_TOKEN = os.environ.get("ML_SERVICE_TOKEN", "")

def verify_token(authorization: Optional[str] = Header(None)):
    if ML_SERVICE_TOKEN:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        token = authorization.replace("Bearer ", "")
        if token != ML_SERVICE_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid service token")

class AutoEditRequest(BaseModel):
    video_url: str
    fps: int = 30
    mode: Optional[str] = "talking_head"
    job_id: Optional[str] = None

def download_video(url: str) -> str:
    print(f"[autoedit] Downloading video...", flush=True)
    start = time.time()
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".mp4")
    size = 0
    with os.fdopen(fd, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
                size += len(chunk)
    print(f"[autoedit] Downloaded {size/1024:.0f}KB in {time.time()-start:.1f}s", flush=True)
    return path

@app.get("/health")
def health():
    return {"ok": True, "service": "python-autoedit"}

@app.post("/autoedit", dependencies=[Depends(verify_token)])
def autoedit(req: AutoEditRequest):
    local_path = None
    try:
        from services.transcribe import transcribe_words
        from services.scenes import detect_scenes
        from services.faces import face_track_summary
        from services.motion import motion_profile
        from services.edl_builder import build_edl

        total_start = time.time()
        print(f"[autoedit] Starting job={req.job_id}, mode={req.mode}", flush=True)

        local_path = download_video(req.video_url)

        words = transcribe_words(local_path)
        scenes = detect_scenes(local_path)
        faces = face_track_summary(local_path)
        motion = motion_profile(local_path)

        edl = build_edl(
            fps=req.fps,
            video_url=req.video_url,
            words=words,
            scenes=scenes,
            faces=faces,
            motion=motion,
        )

        print(f"[autoedit] Complete: {len(edl.get('clips', []))} clips in {time.time()-total_start:.1f}s", flush=True)
        return edl
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if local_path and os.path.exists(local_path):
            os.remove(local_path)
