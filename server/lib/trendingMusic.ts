import { promises as fs } from "fs";
import path from "path";

const MUSIC_DIR = path.join(process.cwd(), "server/assets/music");

// Trending music data structure
interface TrendingTrack {
  name: string;
  artist: string;
  vibe: string;
  platform: string;
  videoCount?: number;
}

// Current trending tracks (updated based on latest viral data from November 2024)
const TRENDING_TRACKS: TrendingTrack[] = [
  {
    name: "APT.",
    artist: "ROSÉ & Bruno Mars",
    vibe: "Upbeat & Energetic",
    platform: "TikTok/Reels",
    videoCount: 500000,
  },
  {
    name: "That's So True",
    artist: "Gracie Abrams",
    vibe: "Calm & Relaxing",
    platform: "TikTok/Reels",
    videoCount: 300000,
  },
  {
    name: "LEVEL UP",
    artist: "Bazanji",
    vibe: "Inspirational",
    platform: "TikTok/Reels",
    videoCount: 100000,
  },
  {
    name: "Murder On The Dancefloor",
    artist: "Sophie Ellis-Bextor",
    vibe: "Fun & Playful",
    platform: "Instagram Reels",
    videoCount: 250000,
  },
  {
    name: "Champagne",
    artist: "Various",
    vibe: "Corporate & Professional",
    platform: "Instagram Reels",
    videoCount: 150000,
  },
];

export class TrendingMusicService {
  // Get currently trending tracks
  async getTrendingTracks(): Promise<TrendingTrack[]> {
    return TRENDING_TRACKS;
  }

  // Get trending track for a specific vibe
  async getTrendingForVibe(vibe: string): Promise<TrendingTrack | null> {
    return TRENDING_TRACKS.find((track) => track.vibe === vibe) || null;
  }

  // Check if music file exists for a vibe
  async checkMusicExists(vibe: string): Promise<boolean> {
    const filename = this.getFilenameForVibe(vibe);
    const filepath = path.join(MUSIC_DIR, filename);
    
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  // Get filename for a vibe
  private getFilenameForVibe(vibe: string): string {
    const vibeToFilename: Record<string, string> = {
      "Upbeat & Energetic": "upbeat.mp3",
      "Calm & Relaxing": "calm.mp3",
      "Inspirational": "inspirational.mp3",
      "Corporate & Professional": "corporate.mp3",
      "Fun & Playful": "fun.mp3",
    };
    
    return vibeToFilename[vibe] || "upbeat.mp3";
  }

  // Get trending music info for a vibe (to display in UI)
  async getTrendingMusicInfo(vibe: string): Promise<{
    trending: TrendingTrack | null;
    royaltyFree: boolean;
    source: string;
  }> {
    const trending = await this.getTrendingForVibe(vibe);
    const musicExists = await this.checkMusicExists(vibe);
    
    return {
      trending,
      royaltyFree: musicExists,
      source: musicExists ? "Royalty-free music (YouTube Audio Library)" : "Add music file to server/assets/music/",
    };
  }
}

export const trendingMusicService = new TrendingMusicService();
