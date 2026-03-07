# Navinta Remotion Renderer - Cloud Run Deployment

Dedicated video rendering service using Remotion with Chromium.
Renders TikTok-style cinematic videos with animated captions, camera movements, emoji popups, and transitions.

## Deploy to Google Cloud Run

```bash
cd remotion-renderer

# Build and deploy
gcloud run deploy navinta-renderer \
  --source . \
  --region us-central1 \
  --memory 8Gi \
  --cpu 4 \
  --timeout 900 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars "ML_SERVICE_TOKEN=your_token_here,SUPABASE_URL=your_supabase_url,SUPABASE_SERVICE_ROLE_KEY=your_service_role_key" \
  --allow-unauthenticated
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ML_SERVICE_TOKEN` | Yes | Bearer token for authentication (same as Python ML service) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for uploading rendered videos) |
| `PORT` | No | Server port (default: 8080, Cloud Run sets this automatically) |

## After Deployment

Set the `RENDER_SERVICE_URL` environment variable on Replit to the Cloud Run URL:

```
RENDER_SERVICE_URL=https://navinta-renderer-XXXXXXXXXX.us-central1.run.app
```

## API

### `GET /health`
Returns `{ ok: true, service: "remotion-renderer" }`

### `POST /render`
Renders a video using Remotion compositions.

**Headers:** `Authorization: Bearer <ML_SERVICE_TOKEN>`

**Body:**
```json
{
  "edl": { "fps": 30, "clips": [...], "musicSrc": null },
  "composition": "TikTokStyle",
  "userId": "user-uuid",
  "videoId": "video-uuid",
  "watermark": false,
  "accentColor": "#FBBF24",
  "captionFontSize": 72
}
```

**Response:**
```json
{
  "success": true,
  "storagePath": "userId/videoId.mp4",
  "signedUrl": "https://...",
  "durationMs": 45000,
  "framesRendered": 900
}
```

## Container Specs
- 4 vCPU, 8GB RAM
- 15-minute timeout (renders up to ~5min videos)
- Concurrency: 1 (one render per instance)
- Scales to zero when idle
