# Background Music Files

This directory contains royalty-free music that will be automatically overlaid on exported videos based on trending styles.

## 🎵 Trending Music Integration

Director automatically matches your videos to **trending viral music** from TikTok, Instagram Reels, and YouTube Shorts, then uses royalty-free alternatives with similar vibes.

### Current Trending Tracks (Updated November 2024):

| Style | Trending Track | Platform | Usage |
|-------|---------------|----------|-------|
| Upbeat & Energetic | "APT." by ROSÉ & Bruno Mars | TikTok/Reels | 500K+ videos |
| Calm & Relaxing | "That's So True" by Gracie Abrams | TikTok/Reels | 300K+ videos |
| Inspirational | "LEVEL UP" by Bazanji | TikTok/Reels | 100K+ videos |
| Corporate & Professional | "Champagne" | Instagram Reels | 150K+ videos |
| Fun & Playful | "Murder On The Dancefloor" by Sophie Ellis-Bextor | Instagram Reels | 250K+ videos |

## 📁 Required Files

Add the following MP3 files to this directory for automatic music overlay:

- `upbeat.mp3` - Upbeat & Energetic style (trending: APT.)
- `calm.mp3` - Calm & Relaxing style (trending: That's So True)
- `inspirational.mp3` - Inspirational style (trending: LEVEL UP)
- `corporate.mp3` - Corporate & Professional style (trending: Champagne)
- `fun.mp3` - Fun & Playful style (trending: Murder On The Dancefloor)

## 🎼 Where to Get Royalty-Free Music

### Free Sources (Creative Commons)
1. **YouTube Audio Library** (https://www.youtube.com/audiolibrary) - 100% free
   - Browse by mood (happy, sad, bright, dark)
   - Filter by duration, genre, instrument
   - No attribution required

2. **Free Music Archive** (https://freemusicarchive.org/)
   - Creative Commons licenses
   - Search by mood and genre
   - Check attribution requirements

3. **Incompetech** (https://incompetech.com/)
   - Kevin MacLeod's extensive library
   - Requires attribution: "Music by Kevin MacLeod (incompetech.com)"
   - Perfect for matching trending vibes

### Premium Sources (Paid)
1. **Epidemic Sound** (https://www.epidemicsound.com/) - $15-49/month
   - Commercial license included
   - Highest quality, closest to trending sounds
   - Trending playlists updated weekly

2. **AudioJungle** (https://audiojungle.net/) - $1-20 per track
   - Pay once, use forever
   - Wide variety of styles
   - Music license included

3. **Artlist** (https://artlist.io/) - $9.99/month
   - Unlimited downloads
   - Commercial license
   - Royalty-free forever

## ⚡ Quick Start

1. Visit YouTube Audio Library (easiest, free option)
2. Search for mood matching your vibe (e.g., "upbeat energetic")
3. Download MP3 and rename to match required filename
4. Place in `server/assets/music/`
5. Restart server - music will be automatically mixed into videos!

## 🎚️ Technical Details

- **Audio Mix**: Background music at 20% volume, original audio at 100%
- **Format**: MP3 at 192kbps or higher recommended
- **Duration**: 30-90 seconds ideal (auto-loops if needed)
- **Processing**: FFmpeg complex audio filter mixing
- **Fallback**: Videos export without music if files missing (with warning)

## 📊 Trending Music Updates

The app automatically tracks trending music from:
- TikTok Creative Center trending sounds
- Instagram Reels audio charts
- YouTube Shorts popular music

**Tip**: Update your music files monthly to match current trends and maximize video virality!
