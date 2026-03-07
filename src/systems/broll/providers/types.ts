export interface ProviderVideoFile {
  quality: string;
  fileType: string;
  width: number;
  height: number;
  link: string;
}

export interface ProviderClip {
  id: string;
  durationMs: number;
  width: number;
  height: number;
  url: string;
  videoFiles: ProviderVideoFile[];
  videoPictures?: Array<{ picture: string }>;
  tags: string[];
}

export interface BrollProvider {
  name: string;
  searchVideos(query: string, perPage: number): Promise<ProviderClip[]>;
}
