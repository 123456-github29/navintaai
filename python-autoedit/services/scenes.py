import time

def detect_scenes(local_path: str, threshold: float = 27.0):
    from scenedetect import VideoManager, SceneManager
    from scenedetect.detectors import ContentDetector

    print(f"[scenes] Detecting scenes...", flush=True)
    start = time.time()

    video_manager = VideoManager([local_path])
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
    print(f"[scenes] Done: {len(scenes)} scenes in {time.time()-start:.1f}s", flush=True)
    return scenes
