import os
import traceback
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Navinta ML AutoEdit Service")

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
    job_id: Optional[str] = None
    fps: int = 30
    mode: Optional[str] = "talking_head"

@app.get("/health")
def health():
    return {"ok": True, "service": "ml-autoedit"}

@app.post("/autoedit", dependencies=[Depends(verify_token)])
def autoedit(req: AutoEditRequest):
    try:
        from services.transcribe import transcribe_words
        from services.scenes import detect_scenes
        from services.faces import face_track_summary
        from services.motion import motion_profile
        from services.edl_builder import build_edl

        print(f"[ml] Processing job={req.job_id}, mode={req.mode}")

        words = transcribe_words(req.video_url)
        print(f"[ml] Transcription: {len(words)} words")

        scenes = detect_scenes(req.video_url)
        print(f"[ml] Scenes: {len(scenes)} detected")

        faces = face_track_summary(req.video_url)
        print(f"[ml] Faces: ratio={faces.get('faceRatio', 0):.2f}")

        motion = motion_profile(req.video_url)
        print(f"[ml] Motion: avg={motion.get('avgMotion', 0):.2f}")

        edl = build_edl(
            fps=req.fps,
            video_url=req.video_url,
            words=words,
            scenes=scenes,
            faces=faces,
            motion=motion,
        )

        print(f"[ml] EDL built: {len(edl.get('clips', []))} clips")
        return edl
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
