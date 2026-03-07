import tempfile, os, requests

_face_cascade = None

def _get_face_cascade():
    global _face_cascade
    if _face_cascade is None:
        import cv2
        _face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    return _face_cascade

def _download_to_tmp(url: str) -> str:
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".mp4")
    with os.fdopen(fd, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    return path

def face_track_summary(video_url: str, sample_every_n_frames: int = 5):
    import cv2
    path = _download_to_tmp(video_url)
    cap = cv2.VideoCapture(path)
    face_cascade = _get_face_cascade()

    total = 0
    with_face = 0

    frame_idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_idx % sample_every_n_frames == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            total += 1
            if len(faces) > 0:
                with_face += 1

        frame_idx += 1

    cap.release()
    os.remove(path)

    face_ratio = (with_face / total) if total else 0.0
    return {"faceRatio": face_ratio}
