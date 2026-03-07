import type { BrollProvider, ProviderClip } from "./types";

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideoPicture {
  id: number;
  picture: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  video_files: PexelsVideoFile[];
  video_pictures?: PexelsVideoPicture[];
}

interface PexelsVideoResponse {
  page: number;
  per_page: number;
  total_results: number;
  videos: PexelsVideo[];
}

function extractTagsFromUrl(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split("/").filter(Boolean).pop() || "";
    const cleaned = slug.replace(/[-_]/g, " ").replace(/\d+/g, "").trim();
    return cleaned
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .map((t) => t.toLowerCase());
  } catch {
    return [];
  }
}

export class PexelsProvider implements BrollProvider {
  name = "pexels";
  private apiKey: string;
  private baseUrl = "https://api.pexels.com";

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("[BrollPexels] PEXELS_API_KEY not set");
    }
  }

  async searchVideos(query: string, perPage: number = 15): Promise<ProviderClip[]> {
    if (!this.apiKey) {
      throw new Error("PEXELS_API_KEY not configured");
    }

    const url = `${this.baseUrl}/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&min_width=640`;

    const response = await fetch(url, {
      headers: { Authorization: this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as PexelsVideoResponse;

    return data.videos.map((video) => this.normalizeClip(video));
  }

  private normalizeClip(video: PexelsVideo): ProviderClip {
    const urlTags = extractTagsFromUrl(video.url);
    return {
      id: String(video.id),
      durationMs: video.duration * 1000,
      width: video.width,
      height: video.height,
      url: video.url,
      videoFiles: video.video_files.map((f) => ({
        quality: f.quality,
        fileType: f.file_type,
        width: f.width,
        height: f.height,
        link: f.link,
      })),
      videoPictures: video.video_pictures?.map((p) => ({
        picture: p.picture,
      })),
      tags: urlTags,
    };
  }
}

export function selectBestDownloadUrl(
  files: { quality: string; fileType: string; width: number; height: number; link: string }[],
  minWidth: number = 1920,
  minHeight: number = 1080
): string | undefined {
  const mp4Files = files.filter((f) => f.fileType === "video/mp4");
  if (mp4Files.length === 0) return files[0]?.link;

  const meetsMin = mp4Files.filter(
    (f) => f.width >= minWidth && f.height >= minHeight
  );

  if (meetsMin.length > 0) {
    meetsMin.sort((a, b) => b.width * b.height - a.width * a.height);
    return meetsMin[0].link;
  }

  mp4Files.sort((a, b) => b.width * b.height - a.width * a.height);
  return mp4Files[0].link;
}
