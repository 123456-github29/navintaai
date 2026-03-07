import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Replit Auth: Session storage table (IMPORTANT: mandatory for auth, don't drop)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth: User storage table (IMPORTANT: mandatory for auth, don't drop)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  businessName: varchar("business_name"),
  plan: varchar("plan").default("free"),
  monthlyPayment: integer("monthly_payment").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects - allows users to manage multiple businesses
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Brand Kit - stores project's brand identity
export const brandKits = pgTable("brand_kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandName: text("brand_name").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color"),
  accentColor: text("accent_color"),
  logoUrl: text("logo_url"),
  fonts: jsonb("fonts").$type<{ heading?: string; body?: string }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content Plans - AI-generated 4-week content calendar
export const contentPlans = pgTable("content_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandKitId: varchar("brand_kit_id").references(() => brandKits.id),
  businessType: text("business_type").notNull(),
  targetAudience: text("target_audience").notNull(),
  contentGoals: jsonb("content_goals").$type<string[]>().notNull(),
  platforms: jsonb("platforms").$type<string[]>().notNull(),
  postFrequency: text("post_frequency").notNull(),
  tone: text("tone").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Posts - individual video post blueprints
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contentPlanId: varchar("content_plan_id").references(() => contentPlans.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  concept: text("concept").notNull(),
  platform: text("platform").notNull(),
  shotList: jsonb("shot_list").$type<Array<{
    id: string;
    shotNumber: number;
    instruction: string;
    cameraAngle: string;
    framing: string;
    dialogue: string;
    duration: number;
    completed: boolean;
  }>>().notNull(),
  brollSuggestions: jsonb("broll_suggestions").$type<string[]>(),
  caption: text("caption").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().notNull(),
  musicVibe: text("music_vibe"),
  status: text("status").notNull().default("planned"), // planned, recording, editing, completed, scheduled
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Video Clips - individual recorded shots
export const clips = pgTable("clips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shotId: text("shot_id"),
  filename: text("filename"), // Original filename for reference
  videoData: text("video_data"), // DEPRECATED: legacy base64/file path (nullable for migration)
  videoPath: text("video_path"), // NEW: Supabase Storage path (e.g., "userId/uuid.mp4")
  duration: integer("duration").notNull(),
  transcript: text("transcript"), // Spoken text in the clip
  thumbnail: text("thumbnail"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// Finished Videos - assembled and exported videos
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  videoData: text("video_data"), // DEPRECATED: legacy base64/file path (nullable for migration)
  videoPath: text("video_path"), // Supabase Storage path (renders bucket)
  storageBucket: text("storage_bucket").default("renders"),
  thumbnail: text("thumbnail"),
  duration: integer("duration"),
  aspectRatio: text("aspect_ratio").notNull().default("9:16"),
  hasCaption: boolean("has_caption").default(true),
  musicStyle: text("music_style"),
  status: text("status").notNull().default("ready"), // queued | rendering | ready | failed
  lastError: text("last_error"),
  edlJson: jsonb("edl_json"), // Final EDL for reproducibility
  exportedAt: timestamp("exported_at").defaultNow().notNull(),
});

// Render Jobs - async rendering queue backed by DB
export const renderJobs = pgTable("render_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").references(() => posts.id),
  videoId: varchar("video_id").references(() => videos.id, { onDelete: "set null" }),
  mode: text("mode").notNull().default("preview"), // preview | export
  status: text("status").notNull().default("queued"), // queued | rendering | completed | failed
  progress: integer("progress").notNull().default(0), // 0-100
  edlJson: jsonb("edl_json").notNull(),
  aspectRatio: text("aspect_ratio").notNull().default("9:16"),
  watermark: boolean("watermark").notNull().default(true),
  qualityPreset: text("quality_preset").notNull().default("preview"), // preview | hq
  outputPath: text("output_path"),
  storageBucket: text("storage_bucket").default("renders"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Video Transcriptions - AI-generated transcripts with viral captions and styling
export const transcriptions = pgTable("transcriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  language: text("language"),
  duration: integer("duration"), // in seconds
  captions: jsonb("captions").$type<Array<{
    start: number;
    end: number;
    originalText: string;
    viralText: string;
    useViral: boolean;
    highlightWords: string[];
    style: {
      font: string;
      baseTextColor: string;
      outlineColor: string;
      background: string;
      highlightTextColor: string;
      highlightBackground: string;
      position: string;
      animation: string;
    };
  }>>().notNull(),
  styleSettings: jsonb("style_settings").$type<{
    stylePreset: string; // "Minimal" | "Bold" | "Cinematic"
    fontSize: string; // "S" | "M" | "L"
    position: string; // "Top" | "Center" | "Bottom"
    animation: string; // "Fade" | "Pop" | "Slide"
  }>(),
  lastExportedAt: timestamp("last_exported_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrandKitSchema = createInsertSchema(brandKits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentPlanSchema = createInsertSchema(contentPlans).omit({
  id: true,
  createdAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClipSchema = createInsertSchema(clips).omit({
  id: true,
  recordedAt: true,
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  exportedAt: true,
});

export const insertRenderJobSchema = createInsertSchema(renderJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertTranscriptionSchema = createInsertSchema(transcriptions).omit({
  id: true,
  createdAt: true,
});

// Premium Onboarding form schema (8-step director flow)
export const onboardingSchema = z.object({
  // Step 1: Creator type
  creatorType: z.string().min(1, "Select your role"),
  creatorTypeOther: z.string().optional(),
  
  // Step 2: Audience description (free text)
  audienceDescription: z.string().min(10, "Describe your audience (min 10 chars)").max(120),
  
  // Step 3: Content goal
  contentGoal: z.string().min(1, "Select your content goal"),
  
  // Step 4: Video duration preference
  durationType: z.string().min(1, "Select video length"),
  
  // Step 5: Emotional result
  emotionalResult: z.string().min(1, "Select how viewers should feel"),
  
  // Step 6: Camera comfort
  cameraComfort: z.string().min(1, "Select your comfort level"),
  
  // Step 7: Brand identity
  brandName: z.string().min(2, "Brand name is required"),
  brandDescription: z.string().min(20, "Brand description required (min 20 chars)"),
  
  // Step 8: Brand personality
  brandPersonality: z.string().min(1, "Select brand personality"),
  
  // Legacy fields (kept for backward compatibility, now optional)
  businessType: z.string().optional(),
  targetAudience: z.string().optional(),
  contentGoals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  postFrequency: z.string().optional(),
  tone: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

// Types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKits.$inferSelect;

export type InsertContentPlan = z.infer<typeof insertContentPlanSchema>;
export type ContentPlan = typeof contentPlans.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertClip = z.infer<typeof insertClipSchema>;
export type Clip = typeof clips.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertRenderJob = z.infer<typeof insertRenderJobSchema>;
export type RenderJob = typeof renderJobs.$inferSelect;

export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
export type Transcription = typeof transcriptions.$inferSelect;

export type OnboardingData = z.infer<typeof onboardingSchema>;

// Stripe Webhook Events - Idempotency tracking to prevent duplicate processing
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: varchar("id").primaryKey(), // Stripe event ID
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

// Pending Entitlements - For Stripe webhooks that arrive before user exists
export const pendingEntitlements = pgTable("pending_entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  exportAllowed: boolean("export_allowed").notNull().default(true),
  watermarkRequired: boolean("watermark_required").notNull().default(true),
  aiBroll: boolean("ai_broll").notNull().default(false),
  aiVoice: boolean("ai_voice").notNull().default(false),
  maxExports: integer("max_exports").notNull().default(3),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PendingEntitlement = typeof pendingEntitlements.$inferSelect;

// User Entitlements - Stripe subscription and feature access control
export const userEntitlements = pgTable("user_entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  plan: text("plan").notNull().default("free"), // free | starter | pro | studio
  status: text("status").notNull().default("active"), // active | canceled | past_due | trialing
  exportAllowed: boolean("export_allowed").notNull().default(true),
  watermarkRequired: boolean("watermark_required").notNull().default(true),
  aiBroll: boolean("ai_broll").notNull().default(false),
  aiVoice: boolean("ai_voice").notNull().default(false),
  maxExports: integer("max_exports").notNull().default(3), // Free tier: 3 exports/day
  exportsUsedToday: integer("exports_used_today").notNull().default(0),
  exportsResetAt: timestamp("exports_reset_at").defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  billingInterval: text("billing_interval"), // monthly | yearly
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserEntitlementSchema = createInsertSchema(userEntitlements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserEntitlement = z.infer<typeof insertUserEntitlementSchema>;
export type UserEntitlement = typeof userEntitlements.$inferSelect;

// Terms Acceptance - Legal compliance tracking
export const termsAcceptances = pgTable("terms_acceptances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(), // Anonymous visitor ID (before login)
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Linked after login (optional)
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  privacyPolicyVersion: varchar("privacy_policy_version").notNull(),
  termsOfServiceVersion: varchar("terms_of_service_version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
});

export const insertTermsAcceptanceSchema = createInsertSchema(termsAcceptances).omit({
  id: true,
  acceptedAt: true,
});

export type InsertTermsAcceptance = z.infer<typeof insertTermsAcceptanceSchema>;
export type TermsAcceptance = typeof termsAcceptances.$inferSelect;

// Entitlement Audit - Webhook idempotency and debugging
export const entitlementAudit = pgTable("entitlement_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  stripeEventId: varchar("stripe_event_id"),
  payload: text("payload"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EntitlementAudit = typeof entitlementAudit.$inferSelect;

// AutoEdit Jobs - async job queue for AI video analysis + rendering
export const autoeditJobs = pgTable("autoedit_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  inputVideoPath: text("input_video_path"),
  inputBucket: text("input_bucket").default("clips"),
  outputVideoPath: text("output_video_path"),
  outputMetadata: jsonb("output_metadata").$type<Record<string, unknown>>().default({}),
  options: jsonb("options").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAutoeditJobSchema = createInsertSchema(autoeditJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAutoeditJob = z.infer<typeof insertAutoeditJobSchema>;
export type AutoeditJob = typeof autoeditJobs.$inferSelect;

// Luma AI B-roll Generations - tracks AI-generated video inserts
export const lumaGenerations = pgTable("luma_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  insertId: varchar("insert_id").notNull(),
  prompt: text("prompt").notNull(),
  generationType: text("generation_type").notNull().default("text_to_video"),
  aspectRatio: varchar("aspect_ratio").notNull().default("9:16"),
  durationSeconds: integer("duration_seconds").notNull().default(5),
  startFrame: integer("start_frame").notNull().default(0),
  durationInFrames: integer("duration_in_frames").notNull().default(150),
  status: text("status").notNull().default("queued"),
  lumaJobId: varchar("luma_job_id"),
  cacheKey: varchar("cache_key"),
  cameraMove: varchar("camera_move"),
  sourceImageUrl: text("source_image_url"),
  sourceGenerationId: varchar("source_generation_id"),
  loop: boolean("loop").notNull().default(false),
  assetStoragePath: text("asset_storage_path"),
  assetUrl: text("asset_url"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLumaGenerationSchema = createInsertSchema(lumaGenerations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLumaGeneration = z.infer<typeof insertLumaGenerationSchema>;
export type LumaGeneration = typeof lumaGenerations.$inferSelect;

export const editRuns = pgTable("edit_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  currentStep: integer("current_step").notNull().default(0),
  step1Status: text("step1_status").notNull().default("queued"),
  step2Status: text("step2_status").notNull().default("queued"),
  step3Status: text("step3_status").notNull().default("queued"),
  step4Status: text("step4_status").notNull().default("queued"),
  step1Progress: integer("step1_progress").notNull().default(0),
  step2Progress: integer("step2_progress").notNull().default(0),
  step3Progress: integer("step3_progress").notNull().default(0),
  step4Progress: integer("step4_progress").notNull().default(0),
  step1Summary: text("step1_summary"),
  step2Summary: text("step2_summary"),
  step3Summary: text("step3_summary"),
  step4Summary: text("step4_summary"),
  intentJson: jsonb("intent_json"),
  planJson: jsonb("plan_json"),
  edlJson: jsonb("edl_json"),
  outputUrl: text("output_url"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEditRunSchema = createInsertSchema(editRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEditRun = z.infer<typeof insertEditRunSchema>;
export type EditRun = typeof editRuns.$inferSelect;

// Edit Sessions - Director Chat Studio sessions
export const editSessions = pgTable("edit_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("idle"),
  activeVersionId: varchar("active_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEditSessionSchema = createInsertSchema(editSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEditSession = z.infer<typeof insertEditSessionSchema>;
export type EditSession = typeof editSessions.$inferSelect;

// EDL Versions - versioned edit decision lists for a session
export const edlVersions = pgTable("edl_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => editSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baseVersionId: varchar("base_version_id"),
  versionNumber: integer("version_number").notNull(),
  edlJson: jsonb("edl_json").notNull(),
  previewUrl: text("preview_url"),
  finalUrl: text("final_url"),
  renderStatus: varchar("render_status").notNull().default("queued"),
  renderProgress: integer("render_progress").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEdlVersionSchema = createInsertSchema(edlVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertEdlVersion = z.infer<typeof insertEdlVersionSchema>;
export type EdlVersion = typeof edlVersions.$inferSelect;

// Edit Messages - chat messages in a Director Chat Studio session
export const editMessages = pgTable("edit_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => editSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolPayload: jsonb("tool_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEditMessageSchema = createInsertSchema(editMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertEditMessage = z.infer<typeof insertEditMessageSchema>;
export type EditMessage = typeof editMessages.$inferSelect;

export const recordingSessions = pgTable("recording_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  shotId: text("shot_id"),
  status: text("status").notNull().default("pending"),
  sessionToken: text("session_token").notNull(),
  storagePath: text("storage_path"),
  clipId: varchar("clip_id"),
  duration: integer("duration"),
  mimeType: text("mime_type"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecordingSessionSchema = createInsertSchema(recordingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecordingSession = z.infer<typeof insertRecordingSessionSchema>;
export type RecordingSession = typeof recordingSessions.$inferSelect;

export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  status: text("status").notNull().default("waiting"),
  accessCode: text("access_code"),
  redeemedAt: timestamp("redeemed_at"),
  redeemedByUserId: varchar("redeemed_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
});
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlist.$inferSelect;

export const videoAssets = pgTable("video_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVideoAssetSchema = createInsertSchema(videoAssets).omit({
  id: true,
  createdAt: true,
});

export type InsertVideoAsset = z.infer<typeof insertVideoAssetSchema>;
export type VideoAsset = typeof videoAssets.$inferSelect;

// Replit Auth: User types
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
