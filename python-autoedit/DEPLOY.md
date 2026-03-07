# Deploying the AutoEdit Python Service

This service handles AI video analysis (transcription, scene detection, face tracking, motion profiling) and must be deployed separately from the main Replit app.

## Option 1: Google Cloud Run (Recommended)

### Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed: https://cloud.google.com/sdk/docs/install

### Steps

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Navigate to the python-autoedit folder
cd python-autoedit

# 3. Deploy directly (Cloud Run builds the container for you)
gcloud run deploy navinta-autoedit \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars ML_SERVICE_TOKEN=your-secret-token-here

# 4. Note the URL it outputs (e.g., https://navinta-autoedit-xxxxx.run.app)
```

### Then in Replit
Set these secrets:
- `ML_SERVICE_URL` = the Cloud Run URL (e.g., `https://navinta-autoedit-xxxxx.run.app`)
- `ML_SERVICE_TOKEN` = same token you set in Cloud Run

---

## Option 2: Fly.io

### Prerequisites
- Fly.io account: https://fly.io
- `flyctl` CLI installed: https://fly.io/docs/flyctl/install/

### Steps

```bash
# 1. Authenticate
fly auth login

# 2. Navigate to the python-autoedit folder
cd python-autoedit

# 3. Launch the app
fly launch --name navinta-autoedit --region ord --no-deploy

# 4. Set the secret
fly secrets set ML_SERVICE_TOKEN=your-secret-token-here

# 5. Scale the VM
fly scale memory 2048
fly scale vm shared-cpu-2x

# 6. Deploy
fly deploy

# 7. Your URL will be: https://navinta-autoedit.fly.dev
```

### Then in Replit
Set these secrets:
- `ML_SERVICE_URL` = `https://navinta-autoedit.fly.dev`
- `ML_SERVICE_TOKEN` = same token you set in Fly.io

---

## Option 3: Modal (Best for ML)

### Prerequisites
- Modal account: https://modal.com
- `pip install modal`

Modal handles model caching natively and is optimized for ML workloads.
See Modal docs for FastAPI deployment: https://modal.com/docs/guide/webhooks

---

## Verify Deployment

After deploying, test the service:

```bash
# Health check
curl https://YOUR_SERVICE_URL/health

# Test autoedit (replace with a real video URL)
curl -X POST https://YOUR_SERVICE_URL/autoedit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" \
  -d '{"video_url": "https://example.com/video.mp4", "fps": 30, "mode": "talking_head"}'
```

## Architecture Notes

- The Whisper AI model (~75MB) is pre-downloaded during the Docker build step
- The service processes one video at a time per worker
- Typical processing time: 5-15 seconds for a 1-minute video
- Memory usage: ~1.5GB peak during transcription
- CPU-bound workload (no GPU required, uses int8 quantization)
