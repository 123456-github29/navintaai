# Navinta AI - Video Production Platform

## Overview
Navinta AI is an AI-powered professional video production platform designed to streamline video creation workflows. Its core purpose is to provide a comprehensive, user-friendly tool that covers the entire video lifecycle, from ideation to export. Key capabilities include AI-driven content planning, shot-by-shot guidance, automated editing, and scheduling features, empowering creators with advanced AI to innovate video production. The platform aims to provide a comprehensive tool that covers the entire video lifecycle, from ideation to export.

## User Preferences
- Prefers Supabase for scalability
- Requires OWASP Top 10 compliance

## System Architecture
Navinta AI is a web application with a Python microservice for video analysis.

**Core Components:**
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI, TanStack Query.
- **Backend**: Express.js, TypeScript.
- **Database**: Supabase PostgreSQL with Neon PostgreSQL as a fallback.
- **ORM**: Drizzle ORM.
- **Authentication**: Supabase Auth or Google OAuth with JWT tokens.
- **Storage**: Supabase Storage or local file storage.

**UI/UX Design Principles:**
The platform utilizes two distinct design systems:
- **Clean Modern Landing**: A minimal, white-background design for public-facing pages, featuring Inter and Playfair Display fonts, rounded components, and soft aesthetics.
- **Studio Dark Design System**: A premium, cinematic dark theme for authenticated users, characterized by deep backgrounds, accent blue, film grain effects, and glass panel overlays, focusing on an immersive experience.
Shared principles include an 8-step onboarding wizard.

**Technical Implementations:**
- **File Handling**: Utilizes Multipart FormData and Multer for uploads, with FFmpeg normalizing all video clips to MP4.
- **Security Hardening**: Implements OWASP-compliant measures including multi-tier rate limiting, Zod schema validation with XSS/injection sanitization, Helmet for security headers, JWT token blacklisting, DOS protection, and Row Level Security (RLS) on all 18 Supabase tables. User-scoped tables enforce `user_id = JWT sub` policies for SELECT/INSERT/UPDATE/DELETE. Backend-only tables (sessions, stripe_webhook_events, pending_entitlements, entitlement_audit, terms_acceptances) have RLS enabled with no client policies (service role only). The backend uses `service_role_key` and postgres owner role which both bypass RLS; all user isolation is enforced explicitly in server queries.
- **AI Planning**: AI content plan generation (OpenAI gpt-4o) categorizes video modes and enforces script length.
- **AI Voiceover**: Integrated with ElevenLabs API.
- **Video Preview & Captions**: Provides a dedicated preview page with watermarking and editable caption styling/timing via a transcription API.
- **User Sync**: Automatic user record creation/sync with Google OAuth.
- **Animated Phone Stage**: A scroll-driven animation on the landing page demonstrating the Navinta workflow.
- **Pexels Integration**: Displays stock media from the Pexels API.
- **Stripe Integration**: Manages subscriptions, including custom checkout UI, webhook-based entitlement updates, and feature gating.
- **Video Rendering Pipeline**: Features three composition modes: `PremiumVideo` (EDL schema with tracks), `NavintaPremium` (Smart Edit system with `DecisionEngine` for transcript-based auto-cutting), and `TikTokStyle` (CapCut-inspired rendering with `CinematicVideo`, `TikTokCaptions`, `EmojiPopups`, and `TransitionSeries`). All compositions are rendered via `RendererService` and managed by a `RenderJobService` for asynchronous job queuing and upload to Supabase Storage.
- **TikTok/CapCut Effects System**: Implements `CinematicVideo` for camera movements (zoom, pan, tilt, rotate, dolly, tracking), `TikTokCaptions` for bouncy word-by-word highlights with 9 style families via `SpecCaptionRenderer`, `EmojiPopups` for animated emoji overlays, `ColorGrading` for CSS filter-based color grades (cinematic, vintage, moody, vibrant, pastel) with film grain and vignette overlays, and speech-aware audio ducking. Dynamic transitions (fade, slide, wipe, clockWipe, flip) are assigned per-clip via `@remotion/transitions`.
- **Smart Edit System**: `DecisionEngine` analyzes word-level transcripts for auto-cutting and zoom targets, generating an EDL with clip timings. Enhanced with AI-powered smart silence trimming (`smartSilenceTrimmer.ts`) using OpenAI to context-analyze each pause (KEEP/SHORTEN/REMOVE), AI-driven cinematic zoom placement (`smartZoomAnalyzer.ts`) using OpenAI to identify emphasis moments, emotional peaks, and hooks with appropriate zoom intensity (low/medium/high), and an AI Edit Director (`aiEditDirector.ts`) using OpenAI gpt-4o to select transitions, caption styles, color grades, music volume, and additional camera moves based on transcript analysis.
- **Caption Style Generator**: Algorithmic system generating over 500 curated caption styles based on typography, layout, fill, stroke, shadow, plate, highlight, and motion, with contrast-based scoring for readability.
- **B-roll System**: An AI-powered Director uses OpenAI GPT-4o to analyze transcripts and generate B-roll slot plans. A Slot Filler system retrieves and ranks candidate clips from stock providers like Pexels. Additionally, **Luma AI Generative B-roll** provides AI-generated video inserts for abstract/claim-heavy moments. Full Luma Dream Machine API support: **text-to-video** (prompt-based generation with Ray-2 model), **image-to-video** (animate a source image via keyframes), **extend** (continue a previous generation), **camera control** (22 camera moves injected via prompt: orbit, dolly, pan, tilt, crane, tracking, zoom, handheld, push/pull), and **seamless loop** generation. The pipeline: transcript analysis (`brollPlanner.ts`) → Luma API (`lumaService.ts` with `createGeneration`, `createImageToVideo`, `extendGeneration`) → BullMQ async queue (`luma.queue.ts` / `luma.worker.ts`) → Supabase Storage ("broll" bucket) → `LumaBrollLayer` Remotion component with crossfade/PiP/overlay modes. Gated by subscription plan (free: 1 insert, paid: up to 3). API endpoints: `POST /api/videos/:id/broll/generate` (auto-plan), `POST /api/videos/:id/broll/single` (custom single generation with type/camera/loop), `GET /api/videos/:id/broll/status`, `DELETE /api/videos/:id/broll/:insertId`, `GET /api/luma/camera-moves`. DB table: `luma_generations` with columns for `generation_type`, `camera_move`, `source_image_url`, `source_generation_id`, `loop`, plus RLS.
- **Viral Script Engine**: AI-powered script generation system producing structured, high-quality viral scripts with quality scoring, humanization, and teleprompter support. Uses OpenAI gpt-4o.
- **AutoEdit System**: A FastAPI microservice handles video analysis (transcription via OpenAI Whisper API, scene detection, face tracking, motion profiling) to generate frame-accurate EDLs. This system uses an async job queue (Redis + BullMQ) for processing.
- **Record with Phone (QR)**: Desktop users can generate a QR code that opens a mobile recording page (`/record/phone?sid=...&token=...`). Phone records video, uploads directly to Supabase Storage via signed upload URL, and completes the session. Desktop polls for status updates and auto-refreshes clips. Security: 10-minute session expiry, one-time session token for upload-url and completion validation, storagePath prefix validation, rate limiting on session creation and completion. DB table: `recording_sessions` with `session_token`, `status` (pending/paired/uploaded/expired/cancelled), `expires_at`. Also includes flip camera support on both desktop and phone recorders.
- **Director Chat Studio**: Chat-driven video editing UI at `/studio/:videoId/edit`. Full edit orchestration pipeline: Chat → Intent JSON (`studioIntentRouter.ts`) → Edit Plan JSON (`llmPlanner.ts`) → API Executors (Pexels b-roll, Luma motion graphics, caption generation) → Asset Registry (`video_assets` table) → EDL Builder (`edlBuilder.ts`) → Validated EDL → Remotion Player preview. Style packs in `src/config/stylePacks.ts` constrain AI outputs to curated presets (8 caption styles, 9 transitions, 16 camera motions, 10 color presets). Zod schemas validate all stages: `editIntent.schema.ts`, `editPlan.schema.ts`, `edl.schema.ts`. DB tables: `edit_sessions`, `edl_versions`, `edit_messages`, `edit_runs` (with `intentJson`/`planJson` logging), `video_assets`. Frontend uses `@remotion/player` for live EDL preview (no export needed to see changes), with multi-step status UI (Planning → Generating assets → Applying edits → Updated preview). Redis queue workers have health check at boot — gracefully skip when Redis limit exceeded, using inline processing fallback. API endpoints: `POST /api/studio/:sessionId/message`, `GET /api/videos/:id/edl`, `POST /api/videos/:id/edits/chat`.

**Production Deployment:**
- Node.js Express server deployed on Replit Autoscale.
- Python ML service (OpenAI Whisper API, OpenCV, SceneDetect) on Google Cloud Run (`navinta-autoedit`). Requires `OPENAI_API_KEY` env var.
- Remotion video renderer on Google Cloud Run (`navinta-renderer`) — 4 vCPU, 8GB RAM, Chromium + Node.js.
- Node.js calls both Cloud Run services via HTTPS with Bearer token auth.
- Export flow: AI edit → EDL → Cloud Run Remotion renderer (TikTokStyle composition) → Supabase Storage. Falls back to FFmpeg if renderer unavailable.
- Env vars: `ML_SERVICE_URL` (Python), `RENDER_SERVICE_URL` (Remotion), `ML_SERVICE_TOKEN` (shared auth token).

## External Dependencies
- **Supabase**: PostgreSQL database, authentication, storage.
- **Neon**: PostgreSQL (fallback).
- **Google OAuth**: User authentication.
- **OpenAI API**: AI-powered content generation for B-roll planning.
- **ElevenLabs API**: AI voiceover generation.
- **Pexels API**: Stock media integration.
- **Stripe**: Payment processing and subscription management.
- **Express.js**: Backend framework.
- **React**: Frontend library.
- **Vite**: Frontend build tool.
- **TailwindCSS**: CSS framework.
- **Radix UI**: UI component library.
- **TanStack Query**: Data fetching.
- **Drizzle ORM**: TypeScript ORM.
- **GSAP (GreenSock Animation Platform)**: Advanced animations.
- **Multer**: `multipart/form-data` handling.
- **FFmpeg**: Video processing.
- **Zod**: Schema validation.
- **Helmet**: Security HTTP headers.
- **Remotion**: Video rendering.
- **Redis**: For asynchronous job queue management.
- **BullMQ**: Job queue library.
- **FastAPI**: Python microservice framework.
- **OpenAI Whisper API**: For transcription (both Node.js captions and Python AutoEdit).
- **OpenCV**: For video analysis (face tracking).
- **PySceneDetect**: For scene detection.
- **Luma AI (Dream Machine API)**: AI-generated B-roll video clips. Env var: `LUMA_API_KEY`.