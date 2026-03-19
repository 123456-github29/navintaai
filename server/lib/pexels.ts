interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsVideoResponse {
  page: number;
  per_page: number;
  total_results: number;
  videos: PexelsVideo[];
}

interface PexelsPhotoResponse {
  page: number;
  per_page: number;
  total_results: number;
  photos: PexelsPhoto[];
}

export interface MediaItem {
  id: number;
  type: "video" | "photo";
  thumbnail: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
}

import { logApiCall } from "./apiLogger";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";
const PEXELS_BASE_URL = "https://api.pexels.com";

function isPexelsConfigured(): boolean {
  return PEXELS_API_KEY.length > 0;
}

async function fetchFromPexels<T>(endpoint: string): Promise<T> {
  if (!isPexelsConfigured()) {
    throw new Error("Pexels API key not configured");
  }

  return logApiCall({
    service: "pexels",
    method: "GET",
    endpoint,
    fn: async () => {
      const response = await fetch(`${PEXELS_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    },
  });
}

export async function getCuratedVideos(count: number = 6): Promise<MediaItem[]> {
  const data = await fetchFromPexels<PexelsVideoResponse>(
    `/videos/popular?per_page=${count}&min_width=640`
  );

  return data.videos.map((video) => {
    const hdFile = video.video_files.find((f) => f.quality === "hd" && f.file_type === "video/mp4");
    const sdFile = video.video_files.find((f) => f.quality === "sd" && f.file_type === "video/mp4");
    const anyFile = video.video_files[0];
    const videoFile = hdFile || sdFile || anyFile;

    return {
      id: video.id,
      type: "video" as const,
      thumbnail: video.image,
      url: videoFile?.link || video.image,
      width: video.width,
      height: video.height,
    };
  });
}

export async function getCuratedPhotos(count: number = 6): Promise<MediaItem[]> {
  const data = await fetchFromPexels<PexelsPhotoResponse>(
    `/v1/curated?per_page=${count}`
  );

  return data.photos.map((photo) => ({
    id: photo.id,
    type: "photo" as const,
    thumbnail: photo.src.medium,
    url: photo.src.large,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
  }));
}

export async function searchVideos(query: string, count: number = 6): Promise<MediaItem[]> {
  const data = await fetchFromPexels<PexelsVideoResponse>(
    `/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&min_width=640`
  );

  return data.videos.map((video) => {
    const hdFile = video.video_files.find((f) => f.quality === "hd" && f.file_type === "video/mp4");
    const sdFile = video.video_files.find((f) => f.quality === "sd" && f.file_type === "video/mp4");
    const anyFile = video.video_files[0];
    const videoFile = hdFile || sdFile || anyFile;

    return {
      id: video.id,
      type: "video" as const,
      thumbnail: video.image,
      url: videoFile?.link || video.image,
      width: video.width,
      height: video.height,
    };
  });
}

export async function searchPhotos(query: string, count: number = 6): Promise<MediaItem[]> {
  const data = await fetchFromPexels<PexelsPhotoResponse>(
    `/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`
  );

  return data.photos.map((photo) => ({
    id: photo.id,
    type: "photo" as const,
    thumbnail: photo.src.medium,
    url: photo.src.large,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
  }));
}

export async function getMixedMedia(count: number = 8): Promise<MediaItem[]> {
  const queries = ["cinematic", "creative", "technology", "nature"];
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  
  const [videos, photos] = await Promise.all([
    searchVideos(randomQuery, Math.ceil(count / 2)),
    searchPhotos(randomQuery, Math.floor(count / 2)),
  ]);

  const mixed = [...videos, ...photos];
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }

  return mixed.slice(0, count);
}
