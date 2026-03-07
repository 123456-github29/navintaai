import time

def motion_profile(local_path: str, sample_every_n_frames: int = 3):
    import cv2
    import numpy as np

    print(f"[motion] Analyzing motion...", flush=True)
    start = time.time()

    cap = cv2.VideoCapture(local_path)

    ok, prev = cap.read()
    if not ok:
        cap.release()
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

    if not motion_vals:
        return {"avgMotion": 0.0, "peaks": []}

    avg = float(np.mean(motion_vals))
    peaks = [i for i, v in enumerate(motion_vals) if v > avg * 1.8]
    print(f"[motion] Done: avg={avg:.2f} in {time.time()-start:.1f}s", flush=True)
    return {"avgMotion": avg, "peaks": peaks[:20]}
