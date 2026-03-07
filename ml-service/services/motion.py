import tempfile, os, requests

def _download_to_tmp(url: str) -> str:
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".mp4")
    with os.fdopen(fd, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    return path

def motion_profile(video_url: str, sample_every_n_frames: int = 2):
    import cv2
    import numpy as np

    path = _download_to_tmp(video_url)
    cap = cv2.VideoCapture(path)

    ok, prev = cap.read()
    if not ok:
        cap.release()
        os.remove(path)
        return {"avgMotion": 0.0, "peaks": []}

    prev_g = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)
    motion_vals = []

    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % sample_every_n_frames == 0:
            g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            diff = cv2.absdiff(prev_g, g)
            motion_vals.append(float(np.mean(diff)))
            prev_g = g
        idx += 1

    cap.release()
    os.remove(path)

    if not motion_vals:
        return {"avgMotion": 0.0, "peaks": []}

    avg = float(np.mean(motion_vals))
    peaks = [i for i, v in enumerate(motion_vals) if v > avg * 1.8]
    return {"avgMotion": avg, "peaks": peaks[:20]}
