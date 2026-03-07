import { eq, and } from "drizzle-orm";
import { videoAssets, type InsertVideoAsset, type VideoAsset } from "../../shared/schema";

export interface AssetRegistryDeps {
  db: {
    insert(table: any): any;
    select(): any;
    delete(table: any): any;
  };
}

export async function registerAsset(
  deps: AssetRegistryDeps,
  asset: InsertVideoAsset,
): Promise<VideoAsset> {
  const [created] = await deps.db
    .insert(videoAssets)
    .values(asset)
    .returning();
  return created;
}

export async function getAssetsByVideo(
  deps: AssetRegistryDeps,
  videoId: string,
): Promise<VideoAsset[]> {
  return deps.db
    .select()
    .from(videoAssets)
    .where(eq(videoAssets.videoId, videoId));
}

export async function getAssetsByVideoAndType(
  deps: AssetRegistryDeps,
  videoId: string,
  type: string,
): Promise<VideoAsset[]> {
  return deps.db
    .select()
    .from(videoAssets)
    .where(and(eq(videoAssets.videoId, videoId), eq(videoAssets.type, type)));
}

export async function getAssetById(
  deps: AssetRegistryDeps,
  id: string,
): Promise<VideoAsset | undefined> {
  const [asset] = await deps.db
    .select()
    .from(videoAssets)
    .where(eq(videoAssets.id, id))
    .limit(1);
  return asset;
}

export async function deleteAssetsByVideo(
  deps: AssetRegistryDeps,
  videoId: string,
): Promise<void> {
  await deps.db
    .delete(videoAssets)
    .where(eq(videoAssets.videoId, videoId));
}
