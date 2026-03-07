import { searchVideos, type MediaItem } from "../../../server/lib/pexels";

export interface PexelsBrollResult {
  query: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  pexelsId: number;
}

export async function executePexelsBroll(
  query: string,
  count: number = 3
): Promise<PexelsBrollResult[]> {
  const items: MediaItem[] = await searchVideos(query, count);

  return items.map((item) => ({
    query,
    url: item.url,
    thumbnailUrl: item.thumbnail,
    width: item.width,
    height: item.height,
    pexelsId: item.id,
  }));
}

export async function executePexelsBrollBest(
  query: string
): Promise<PexelsBrollResult | null> {
  const results = await executePexelsBroll(query, 1);
  return results.length > 0 ? results[0] : null;
}
