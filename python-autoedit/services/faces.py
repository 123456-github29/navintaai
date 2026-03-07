import time

_face_cascade = None

def _get_face_cascade():
    global _face_cascade
    if _face_cascade is None:
        import cv2
        _face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    return _face_cascade

def face_track_summary(local_path: str, sample_every_n_frames: int = 10):
    import cv2

    print(f"[faces] Tracking faces...", flush=True)
    start = time.time()

    cap = cv2.VideoCapture(local_path)
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

    face_ratio = (with_face / total) if total else 0.0
    print(f"[faces] Done: ratio={face_ratio:.2f} in {time.time()-start:.1f}s", flush=True)
    return {"faceRatio": face_ratio}
