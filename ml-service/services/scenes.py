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

def detect_scenes(video_url: str, threshold: float = 27.0):
    from scenedetect import VideoManager, SceneManager
    from scenedetect.detectors import ContentDetector

    path = _download_to_tmp(video_url)

    video_manager = VideoManager([path])
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))

    video_manager.start()
    scene_manager.detect_scenes(frame_source=video_manager)
    scene_list = scene_manager.get_scene_list()

    scenes = []
    for start_time, end_time in scene_list:
        scenes.append({
            "startMs": int(start_time.get_seconds() * 1000),
            "endMs": int(end_time.get_seconds() * 1000),
        })

    video_manager.release()
    os.remove(path)
    return scenes
