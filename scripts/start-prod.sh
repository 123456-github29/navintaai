#!/bin/bash
set -e

echo "[prod] Starting Navinta AI (Node.js only, autoscale mode)..."
echo "[prod] Python ML service expected at: ${ML_SERVICE_URL:-not configured}"

NODE_ENV=production tsx server/index.ts
