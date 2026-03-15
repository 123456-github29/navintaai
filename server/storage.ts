import {
  type BrandKit,
  type InsertBrandKit,
  type ContentPlan,
  type InsertContentPlan,
  type Post,
  type InsertPost,
  type Clip,
  type InsertClip,
  type Video,
  type InsertVideo,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Transcription,
  type InsertTranscription,
  type UserEntitlement,
  type InsertUserEntitlement,
  type PendingEntitlement,
  type TermsAcceptance,
  type InsertTermsAcceptance,
  type RenderJob,
  type InsertRenderJob,
  type RecordingSession,
  type InsertRecordingSession,
  type WaitlistEntry,
  type InsertWaitlist,
  type AiEditSession,
  type InsertAiEditSession,
  type AiEditMessage,
  type InsertAiEditMessage,
  brandKits,
  contentPlans,
  posts,
  clips,
  videos,
  users,
  projects,
  transcriptions,
  userEntitlements,
  pendingEntitlements,
  stripeWebhookEvents,
  termsAcceptances,
  renderJobs,
  recordingSessions,
  waitlist,
  aiEditSessions,
  aiEditMessages,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { deepSanitize } from "./utils/sanitizeText";
import { deleteClipFromStorage, deleteVideoFromStorage } from "./lib/supabaseStorage";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Replit Auth: User operations (IMPORTANT: mandatory for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Project operations
  getProject(id: string, userId: string): Promise<Project | undefined>;
  getProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;

  // Brand Kit
  getBrandKit(projectId: string, userId: string): Promise<BrandKit | undefined>;
  createOrUpdateBrandKit(brandKit: InsertBrandKit): Promise<BrandKit>;

  // Content Plans
  getContentPlan(projectId: string, userId: string): Promise<ContentPlan | undefined>;
  createContentPlan(plan: InsertContentPlan): Promise<ContentPlan>;
  deleteContentPlansByProject(projectId: string, userId: string): Promise<void>;

  // Posts
  getPost(id: string, userId: string): Promise<Post | undefined>;
  getPosts(projectId: string, userId: string): Promise<Post[]>;
  getPostsByPlan(planId: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePostShot(postId: string, shotId: string, userId: string, completed: boolean): Promise<Post>;
  updatePostShots(postId: string, userId: string, shotList: any[]): Promise<Post>;
  updatePostStatus(postId: string, userId: string, status: string): Promise<Post>;
  deletePost(id: string, userId: string): Promise<void>;

  // Clips
  getClip(id: string, userId: string): Promise<Clip | undefined>;
  getClips(userId: string): Promise<Clip[]>;
  getClipsByPost(postId: string): Promise<Clip[]>;
  createClip(clip: InsertClip): Promise<Clip>;
  deleteClip(id: string, userId: string): Promise<void>;

  // Videos
  getVideo(id: string, userId: string): Promise<Video | undefined>;
  getVideos(userId: string, postId?: string): Promise<Video[]>;
  getVideosDebug(videoId: string): Promise<Video[]>; // Debug: get video by ID without user filter
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, userId: string, updates: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: string, userId: string): Promise<void>;

  // Transcriptions
  getTranscription(videoId: string, userId: string): Promise<Transcription | undefined>;
  createTranscription(transcription: InsertTranscription): Promise<Transcription>;
  updateTranscription(id: string, userId: string, updates: Partial<Transcription>): Promise<Transcription | undefined>;

  // Render Jobs
  getRenderJob(id: string, userId: string): Promise<RenderJob | undefined>;
  getRenderJobsByUser(userId: string): Promise<RenderJob[]>;
  getQueuedRenderJobs(): Promise<RenderJob[]>;
  createRenderJob(job: InsertRenderJob): Promise<RenderJob>;
  updateRenderJob(id: string, updates: Partial<RenderJob>): Promise<RenderJob | undefined>;

  // Recording Sessions
  createRecordingSession(session: InsertRecordingSession): Promise<RecordingSession>;
  getRecordingSession(id: string): Promise<RecordingSession | undefined>;
  updateRecordingSession(id: string, updates: Partial<RecordingSession>): Promise<RecordingSession | undefined>;

  // AI Edit Sessions
  createAiEditSession(session: InsertAiEditSession): Promise<AiEditSession>;
  getAiEditSession(id: string, userId: string): Promise<AiEditSession | undefined>;
  getAiEditSessionByPost(postId: string, userId: string): Promise<AiEditSession | undefined>;
  updateAiEditSession(id: string, userId: string, updates: Partial<AiEditSession>): Promise<AiEditSession | undefined>;
  createAiEditMessage(message: InsertAiEditMessage): Promise<AiEditMessage>;
  getAiEditMessages(sessionId: string): Promise<AiEditMessage[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private brandKits: Map<string, BrandKit>;
  private contentPlans: Map<string, ContentPlan>;
  private posts: Map<string, Post>;
  private clips: Map<string, Clip>;
  private videos: Map<string, Video>;
  private transcriptions: Map<string, Transcription>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.brandKits = new Map();
    this.contentPlans = new Map();
    this.posts = new Map();
    this.clips = new Map();
    this.videos = new Map();
    this.transcriptions = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const userId = user.id || randomUUID();
    const existing = this.users.get(userId);
    const now = new Date();
    const newUser: User = {
      id: userId,
      email: user.email || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.users.set(userId, newUser);
    return newUser;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
    const projectKeys = Array.from(this.projects.keys());
    for (const key of projectKeys) {
      const project = this.projects.get(key);
      if (project && project.userId === id) {
        this.projects.delete(key);
      }
    }
    const clipKeys = Array.from(this.clips.keys());
    for (const key of clipKeys) {
      const clip = this.clips.get(key);
      if (clip && clip.userId === id) {
        this.clips.delete(key);
      }
    }
    const videoKeys = Array.from(this.videos.keys());
    for (const key of videoKeys) {
      const video = this.videos.get(key);
      if (video && video.userId === id) {
        this.videos.delete(key);
      }
    }
  }

  // Project methods
  async getProject(id: string, userId: string): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (project && project.userId === userId) {
      return project;
    }
    return undefined;
  }

  async getProjects(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((project) => project.userId === userId);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const newProject: Project = {
      id,
      userId: project.userId,
      name: project.name,
      description: project.description || null,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  // Brand Kit methods
  async getBrandKit(projectId: string, userId: string): Promise<BrandKit | undefined> {
    return Array.from(this.brandKits.values()).find(
      (kit) => kit.projectId === projectId && kit.userId === userId
    );
  }

  async createOrUpdateBrandKit(brandKit: InsertBrandKit): Promise<BrandKit> {
    const existing = await this.getBrandKit(brandKit.projectId, brandKit.userId);
    const id = existing?.id || randomUUID();
    const now = new Date();
    const kit: BrandKit = {
      id,
      projectId: brandKit.projectId,
      userId: brandKit.userId,
      brandName: brandKit.brandName,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor || null,
      accentColor: brandKit.accentColor || null,
      logoUrl: brandKit.logoUrl || null,
      fonts: (brandKit.fonts as { heading?: string; body?: string } | null) || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.brandKits.set(id, kit);
    return kit;
  }

  // Content Plan methods
  async getContentPlan(projectId: string, userId: string): Promise<ContentPlan | undefined> {
    return Array.from(this.contentPlans.values()).find(
      (plan) => plan.projectId === projectId && plan.userId === userId
    );
  }

  async createContentPlan(plan: InsertContentPlan): Promise<ContentPlan> {
    const id = randomUUID();
    const contentPlan: ContentPlan = {
      id,
      projectId: plan.projectId,
      userId: plan.userId,
      brandKitId: plan.brandKitId || null,
      businessType: plan.businessType,
      targetAudience: plan.targetAudience,
      contentGoals: plan.contentGoals as string[],
      platforms: plan.platforms as string[],
      postFrequency: plan.postFrequency,
      tone: plan.tone,
      createdAt: new Date(),
    };
    this.contentPlans.set(id, contentPlan);
    return contentPlan;
  }

  async deleteContentPlansByProject(projectId: string, userId: string): Promise<void> {
    const toDelete: string[] = [];
    this.contentPlans.forEach((plan, id) => {
      if (plan.projectId === projectId && plan.userId === userId) {
        toDelete.push(id);
      }
    });
    toDelete.forEach((id) => this.contentPlans.delete(id));
  }

  // Post methods
  async getPost(id: string, userId: string): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (post && post.userId === userId) {
      return post;
    }
    return undefined;
  }

  async getPosts(projectId: string, userId: string): Promise<Post[]> {
    return Array.from(this.posts.values()).filter(
      (post) => post.projectId === projectId && post.userId === userId
    );
  }

  async getPostsByPlan(planId: string): Promise<Post[]> {
    return Array.from(this.posts.values()).filter((post) => post.contentPlanId === planId);
  }

  async createPost(post: InsertPost): Promise<Post> {
    const id = randomUUID();
    const now = new Date();
    const newPost: Post = {
      id,
      projectId: post.projectId,
      contentPlanId: post.contentPlanId || null,
      userId: post.userId,
      weekNumber: post.weekNumber,
      dayNumber: post.dayNumber,
      title: post.title,
      concept: post.concept,
      platform: post.platform,
      shotList: post.shotList as Array<{
        id: string;
        shotNumber: number;
        instruction: string;
        cameraAngle: string;
        framing: string;
        dialogue: string;
        duration: number;
        completed: boolean;
      }>,
      brollSuggestions: (post.brollSuggestions as string[] | null) || null,
      caption: post.caption,
      hashtags: post.hashtags as string[],
      musicVibe: post.musicVibe || null,
      status: post.status || "planned",
      scheduledFor: post.scheduledFor || null,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.set(id, newPost);
    return newPost;
  }

  async updatePostShot(postId: string, shotId: string, userId: string, completed: boolean): Promise<Post> {
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== userId) throw new Error("Unauthorized: Cannot modify post you don't own");

    const updatedShotList = post.shotList.map((shot) =>
      shot.id === shotId ? { ...shot, completed } : shot
    );

    const updatedPost: Post = {
      ...post,
      shotList: updatedShotList,
      updatedAt: new Date(),
    };
    this.posts.set(postId, updatedPost);
    return updatedPost;
  }

  async updatePostShots(postId: string, userId: string, shotList: any[]): Promise<Post> {
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== userId) throw new Error("Unauthorized: Cannot modify post you don't own");

    const updatedPost: Post = {
      ...post,
      shotList: shotList as Post["shotList"],
      updatedAt: new Date(),
    };
    this.posts.set(postId, updatedPost);
    return updatedPost;
  }

  async updatePostStatus(postId: string, userId: string, status: string): Promise<Post> {
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    if (post.userId !== userId) throw new Error("Unauthorized: Cannot modify post you don't own");

    const updatedPost: Post = {
      ...post,
      status,
      updatedAt: new Date(),
    };
    this.posts.set(postId, updatedPost);
    return updatedPost;
  }

  async deletePost(id: string, userId: string): Promise<void> {
    const post = this.posts.get(id);
    if (!post) throw new Error("Post not found");
    if (post.userId !== userId) throw new Error("Unauthorized: Cannot delete post you don't own");
    this.posts.delete(id);
  }

  // Clip methods
  async getClip(id: string, userId: string): Promise<Clip | undefined> {
    const clip = this.clips.get(id);
    if (clip && clip.userId === userId) {
      return clip;
    }
    return undefined;
  }

  async getClips(userId: string): Promise<Clip[]> {
    return Array.from(this.clips.values()).filter((clip) => clip.userId === userId);
  }

  async getClipsByPost(postId: string): Promise<Clip[]> {
    return Array.from(this.clips.values()).filter((clip) => clip.postId === postId);
  }

  async createClip(clip: InsertClip): Promise<Clip> {
    const id = randomUUID();
    const newClip: Clip = {
      id,
      postId: clip.postId || null,
      userId: clip.userId,
      shotId: clip.shotId || null,
      filename: clip.filename || null,
      videoData: clip.videoData || null,
      videoPath: clip.videoPath || null,
      duration: clip.duration,
      transcript: clip.transcript || null,
      thumbnail: clip.thumbnail || null,
      recordedAt: new Date(),
    };
    this.clips.set(id, newClip);
    return newClip;
  }

  async deleteClip(id: string, userId: string): Promise<void> {
    const clip = this.clips.get(id);
    if (!clip) throw new Error("Clip not found");
    if (clip.userId !== userId) throw new Error("Unauthorized: Cannot delete clip you don't own");
    this.clips.delete(id);
    
    // Clean up Supabase Storage if clip has a storage path
    if (clip.videoPath) {
      try {
        await deleteClipFromStorage(clip.videoPath);
      } catch (err) {
        console.error("[storage] Failed to delete clip from storage:", err);
      }
    }
  }

  // Video methods
  async getVideo(id: string, userId: string): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (video && video.userId === userId) {
      return video;
    }
    return undefined;
  }

  async getVideos(userId: string, postId?: string): Promise<Video[]> {
    let result = Array.from(this.videos.values()).filter((video) => video.userId === userId);
    if (postId) {
      result = result.filter((video) => video.postId === postId);
    }
    return result;
  }

  async getVideosDebug(videoId: string): Promise<Video[]> {
    const video = this.videos.get(videoId);
    return video ? [video] : [];
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const id = randomUUID();
    const newVideo: Video = {
      id,
      postId: video.postId || null,
      userId: video.userId,
      title: video.title,
      videoData: video.videoData || null,
      videoPath: video.videoPath || null,
      storageBucket: video.storageBucket || "renders",
      thumbnail: video.thumbnail || null,
      duration: video.duration || null,
      aspectRatio: video.aspectRatio || "9:16",
      hasCaption: video.hasCaption ?? true,
      musicStyle: video.musicStyle || null,
      status: video.status || "ready",
      lastError: video.lastError || null,
      edlJson: video.edlJson || null,
      exportedAt: new Date(),
    };
    this.videos.set(id, newVideo);
    return newVideo;
  }

  async deleteVideo(id: string, userId: string): Promise<void> {
    const video = this.videos.get(id);
    if (!video) throw new Error("Video not found");
    if (video.userId !== userId) throw new Error("Unauthorized: Cannot delete video you don't own");
    
    // Get clips to clean up before deleting
    const clipsToCleanup: Clip[] = [];
    if (video.postId) {
      const clipsEntries = Array.from(this.clips.entries())
        .filter(([_, clip]) => clip.postId === video.postId && clip.userId === userId);
      
      for (const [clipId, clip] of clipsEntries) {
        clipsToCleanup.push(clip);
        this.clips.delete(clipId);
      }
    }
    
    this.videos.delete(id);
    
    // Clean up Supabase Storage - video file
    if (video.videoPath) {
      try {
        await deleteVideoFromStorage(video.videoPath);
      } catch (err) {
        console.error("[storage] Failed to delete video from storage:", err);
      }
    }
    
    // Clean up Supabase Storage - associated clip files
    for (const clip of clipsToCleanup) {
      if (clip.videoPath) {
        try {
          await deleteClipFromStorage(clip.videoPath);
        } catch (err) {
          console.error("[storage] Failed to delete clip from storage:", err);
        }
      }
    }
  }

  // Transcription methods
  async getTranscription(videoId: string, userId: string): Promise<Transcription | undefined> {
    return Array.from(this.transcriptions.values()).find(
      (t) => t.videoId === videoId && t.userId === userId
    );
  }

  async createTranscription(transcription: InsertTranscription): Promise<Transcription> {
    const id = randomUUID();
    const newTranscription: Transcription = {
      id,
      videoId: transcription.videoId,
      userId: transcription.userId,
      language: transcription.language || null,
      duration: transcription.duration || null,
      captions: transcription.captions,
      styleSettings: null,
      lastExportedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transcriptions.set(id, newTranscription);
    return newTranscription;
  }

  async updateTranscription(id: string, userId: string, updates: Partial<Transcription>): Promise<Transcription | undefined> {
    const transcription = this.transcriptions.get(id);
    if (!transcription || transcription.userId !== userId) {
      return undefined;
    }
    const updated = { ...transcription, ...updates };
    this.transcriptions.set(id, updated);
    return updated;
  }

  async updateVideo(id: string, userId: string, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video || video.userId !== userId) {
      return undefined;
    }
    const updated = { ...video, ...updates };
    this.videos.set(id, updated);
    return updated;
  }

  // Render Job methods (stub - MemStorage doesn't need these)
  async getRenderJob(id: string, userId: string): Promise<RenderJob | undefined> {
    throw new Error("getRenderJob not implemented in MemStorage");
  }

  async getRenderJobsByUser(userId: string): Promise<RenderJob[]> {
    throw new Error("getRenderJobsByUser not implemented in MemStorage");
  }

  async getQueuedRenderJobs(): Promise<RenderJob[]> {
    throw new Error("getQueuedRenderJobs not implemented in MemStorage");
  }

  async createRenderJob(job: InsertRenderJob): Promise<RenderJob> {
    throw new Error("createRenderJob not implemented in MemStorage");
  }

  async updateRenderJob(id: string, updates: Partial<RenderJob>): Promise<RenderJob | undefined> {
    throw new Error("updateRenderJob not implemented in MemStorage");
  }

  async createRecordingSession(session: InsertRecordingSession): Promise<RecordingSession> {
    throw new Error("createRecordingSession not implemented in MemStorage");
  }

  async getRecordingSession(id: string): Promise<RecordingSession | undefined> {
    throw new Error("getRecordingSession not implemented in MemStorage");
  }

  async updateRecordingSession(id: string, updates: Partial<RecordingSession>): Promise<RecordingSession | undefined> {
    throw new Error("updateRecordingSession not implemented in MemStorage");
  }

  async createAiEditSession(session: InsertAiEditSession): Promise<AiEditSession> {
    throw new Error("createAiEditSession not implemented in MemStorage");
  }

  async getAiEditSession(id: string, userId: string): Promise<AiEditSession | undefined> {
    throw new Error("getAiEditSession not implemented in MemStorage");
  }

  async getAiEditSessionByPost(postId: string, userId: string): Promise<AiEditSession | undefined> {
    throw new Error("getAiEditSessionByPost not implemented in MemStorage");
  }

  async updateAiEditSession(id: string, userId: string, updates: Partial<AiEditSession>): Promise<AiEditSession | undefined> {
    throw new Error("updateAiEditSession not implemented in MemStorage");
  }

  async createAiEditMessage(message: InsertAiEditMessage): Promise<AiEditMessage> {
    throw new Error("createAiEditMessage not implemented in MemStorage");
  }

  async getAiEditMessages(sessionId: string): Promise<AiEditMessage[]> {
    throw new Error("getAiEditMessages not implemented in MemStorage");
  }
}

// Database-backed storage implementation
export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  getDb() {
    return this.db;
  }

  constructor() {
    let connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("No database URL configured. Set SUPABASE_DATABASE_URL or DATABASE_URL.");
    }
    
    const isSupabase = !!process.env.SUPABASE_DATABASE_URL;
    console.log(`[db] Using ${isSupabase ? 'Supabase' : 'Replit'} database`);

    if (isSupabase && connectionString.includes('.pooler.supabase.com')) {
      const urlObj = new URL(connectionString);
      if (urlObj.port === '5432' || !urlObj.port) {
        urlObj.port = '6543';
        connectionString = urlObj.toString();
        console.log(`[db] Switched to transaction mode (port 6543) for Supabase pooler`);
      }
    }

    const urlObj = new URL(connectionString);
    console.log(`[db] Connecting to database at ${urlObj.hostname}:${urlObj.port || 5432}`);

    const client = postgres(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 30,
      prepare: false,
      ssl: 'require',
    });

    client`SELECT 1`.then(() => {
      console.log("[db] Database connection successful");
    }).catch((err: any) => {
      console.error("[db] Database connection failed:", err.message);
    });
    
    this.db = drizzle(client);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const sanitizedUser = deepSanitize(user);
    const created = await this.db
      .insert(users)
      .values(sanitizedUser)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: sanitizedUser.email,
          firstName: sanitizedUser.firstName,
          lastName: sanitizedUser.lastName,
          profileImageUrl: sanitizedUser.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return created[0];
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(transcriptions).where(eq(transcriptions.userId, id));
    await this.db.delete(clips).where(eq(clips.userId, id));
    await this.db.delete(videos).where(eq(videos.userId, id));
    await this.db.delete(posts).where(eq(posts.userId, id));
    await this.db.delete(contentPlans).where(eq(contentPlans.userId, id));
    await this.db.delete(brandKits).where(eq(brandKits.userId, id));
    await this.db.delete(projects).where(eq(projects.userId, id));
    await this.db.delete(users).where(eq(users.id, id));
  }

  // Project methods
  async getProject(id: string, userId: string): Promise<Project | undefined> {
    const result = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getProjects(userId: string): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const sanitizedProject = deepSanitize(project);
    const created = await this.db.insert(projects).values(sanitizedProject).returning();
    return created[0];
  }

  // Brand Kit methods
  async getBrandKit(projectId: string, userId: string): Promise<BrandKit | undefined> {
    const result = await this.db
      .select()
      .from(brandKits)
      .where(and(eq(brandKits.projectId, projectId), eq(brandKits.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createOrUpdateBrandKit(brandKit: InsertBrandKit): Promise<BrandKit> {
    const sanitizedBrandKit = deepSanitize(brandKit);
    const existing = await this.getBrandKit(sanitizedBrandKit.projectId, sanitizedBrandKit.userId);
    
    if (existing) {
      const updated = await this.db
        .update(brandKits)
        .set({ ...sanitizedBrandKit, updatedAt: new Date() })
        .where(eq(brandKits.id, existing.id))
        .returning();
      return updated[0];
    }
    
    const created = await this.db.insert(brandKits).values(sanitizedBrandKit).returning();
    return created[0];
  }

  // Content Plan methods
  async getContentPlan(projectId: string, userId: string): Promise<ContentPlan | undefined> {
    const result = await this.db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.projectId, projectId), eq(contentPlans.userId, userId)))
      .orderBy(desc(contentPlans.createdAt))
      .limit(1);
    return result[0];
  }

  async createContentPlan(plan: InsertContentPlan): Promise<ContentPlan> {
    const sanitizedPlan = deepSanitize(plan);
    const created = await this.db.insert(contentPlans).values(sanitizedPlan).returning();
    return created[0];
  }

  async deleteContentPlansByProject(projectId: string, userId: string): Promise<void> {
    await this.db
      .delete(contentPlans)
      .where(and(eq(contentPlans.projectId, projectId), eq(contentPlans.userId, userId)));
  }

  // Post methods
  async getPost(id: string, userId: string): Promise<Post | undefined> {
    const result = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getPosts(projectId: string, userId: string): Promise<Post[]> {
    return await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.projectId, projectId), eq(posts.userId, userId)));
  }

  async getPostsByPlan(planId: string): Promise<Post[]> {
    return await this.db.select().from(posts).where(eq(posts.contentPlanId, planId));
  }

  async createPost(post: InsertPost): Promise<Post> {
    const sanitizedPost = deepSanitize(post);
    const created = await this.db.insert(posts).values(sanitizedPost).returning();
    return created[0];
  }

  async updatePostShot(postId: string, shotId: string, userId: string, completed: boolean): Promise<Post> {
    const post = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .limit(1);
    
    if (!post[0]) throw new Error("Post not found or unauthorized");

    const updatedShotList = post[0].shotList.map((shot) =>
      shot.id === shotId ? { ...shot, completed } : shot
    );

    const updated = await this.db
      .update(posts)
      .set({ shotList: updatedShotList, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning();
    return updated[0];
  }

  async updatePostShots(postId: string, userId: string, shotList: any[]): Promise<Post> {
    const updated = await this.db
      .update(posts)
      .set({ shotList: shotList as Post["shotList"], updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning();

    if (!updated[0]) throw new Error("Post not found or unauthorized");
    return updated[0];
  }

  async updatePostStatus(postId: string, userId: string, status: string): Promise<Post> {
    const updated = await this.db
      .update(posts)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning();
    
    if (!updated[0]) throw new Error("Post not found or unauthorized");
    return updated[0];
  }

  async deletePost(id: string, userId: string): Promise<void> {
    await this.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)));
  }

  // Clip methods
  async getClip(id: string, userId: string): Promise<Clip | undefined> {
    const result = await this.db
      .select()
      .from(clips)
      .where(and(eq(clips.id, id), eq(clips.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getClips(userId: string): Promise<Clip[]> {
    console.log(`[storage.getClips] Querying clips for userId: ${userId}`);
    const result = await this.db.select().from(clips).where(eq(clips.userId, userId));
    console.log(`[storage.getClips] Found ${result.length} clips`);
    if (result.length === 0) {
      // Debug: Check if there are any clips at all
      const allClips = await this.db.select({ id: clips.id, userId: clips.userId }).from(clips).limit(5);
      console.log(`[storage.getClips] All clips in DB (first 5):`, JSON.stringify(allClips));
    }
    return result;
  }

  async getClipsByPost(postId: string): Promise<Clip[]> {
    return await this.db.select().from(clips).where(eq(clips.postId, postId));
  }

  async createClip(clip: InsertClip): Promise<Clip> {
    console.log(`[storage.createClip] Creating clip with data:`, JSON.stringify({
      userId: clip.userId,
      postId: clip.postId,
      shotId: clip.shotId,
      duration: clip.duration,
      hasVideoPath: !!clip.videoPath,
      videoPathLength: clip.videoPath?.length || 0,
    }));
    const sanitizedClip = deepSanitize(clip);
    try {
      const created = await this.db.insert(clips).values(sanitizedClip).returning();
      console.log(`[storage.createClip] Clip created successfully with id: ${created[0]?.id}`);
      return created[0];
    } catch (error: any) {
      console.error(`[storage.createClip] Failed to create clip:`, error.message);
      throw error;
    }
  }

  async deleteClip(id: string, userId: string): Promise<void> {
    // First get the clip to find its storage path
    const clipToDelete = await this.db
      .select()
      .from(clips)
      .where(and(eq(clips.id, id), eq(clips.userId, userId)))
      .limit(1);
    
    const clip = clipToDelete[0];
    if (!clip) throw new Error("Clip not found or unauthorized");
    
    // Delete from database
    await this.db
      .delete(clips)
      .where(and(eq(clips.id, id), eq(clips.userId, userId)));
    
    // Clean up Supabase Storage if clip has a storage path
    if (clip.videoPath) {
      try {
        await deleteClipFromStorage(clip.videoPath);
      } catch (err) {
        console.error("[storage] Failed to delete clip from storage:", err);
      }
    }
  }

  // Video methods
  async getVideo(id: string, userId: string): Promise<Video | undefined> {
    const result = await this.db
      .select()
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getVideos(userId: string, postId?: string): Promise<Video[]> {
    if (postId) {
      return await this.db.select().from(videos).where(
        and(eq(videos.userId, userId), eq(videos.postId, postId))
      );
    }
    return await this.db.select().from(videos).where(eq(videos.userId, userId));
  }

  async getVideosDebug(videoId: string): Promise<Video[]> {
    // Debug: get video by ID without user filter (to diagnose user ID mismatch issues)
    return await this.db.select().from(videos).where(eq(videos.id, videoId));
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const sanitizedVideo = deepSanitize(video);
    const created = await this.db.insert(videos).values(sanitizedVideo).returning();
    return created[0];
  }

  async deleteVideo(id: string, userId: string): Promise<void> {
    // First get the video to find its postId and storage path
    const videoToDelete = await this.db
      .select()
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .limit(1);
    
    const video = videoToDelete[0];
    if (!video) throw new Error("Video not found or unauthorized");
    
    // Get clips to clean up their storage before deleting
    let clipsToCleanup: Array<{ videoPath: string | null }> = [];
    if (video.postId) {
      clipsToCleanup = await this.db
        .select({ videoPath: clips.videoPath })
        .from(clips)
        .where(and(
          eq(clips.postId, video.postId),
          eq(clips.userId, userId)
        ));
      
      // Delete clips from database
      await this.db
        .delete(clips)
        .where(and(
          eq(clips.postId, video.postId),
          eq(clips.userId, userId)
        ));
    }
    
    // Delete the video from database (transcriptions will cascade automatically)
    await this.db
      .delete(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)));
    
    // Clean up Supabase Storage - video file
    if (video.videoPath) {
      try {
        await deleteVideoFromStorage(video.videoPath);
      } catch (err) {
        console.error("[storage] Failed to delete video from storage:", err);
      }
    }
    
    // Clean up Supabase Storage - associated clip files
    for (const clip of clipsToCleanup) {
      if (clip.videoPath) {
        try {
          await deleteClipFromStorage(clip.videoPath);
        } catch (err) {
          console.error("[storage] Failed to delete clip from storage:", err);
        }
      }
    }
  }

  // Transcription methods
  async getTranscription(videoId: string, userId: string): Promise<Transcription | undefined> {
    const result = await this.db
      .select()
      .from(transcriptions)
      .where(and(eq(transcriptions.videoId, videoId), eq(transcriptions.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createTranscription(transcription: InsertTranscription): Promise<Transcription> {
    const sanitizedTranscription = deepSanitize(transcription);
    const created = await this.db.insert(transcriptions).values(sanitizedTranscription).returning();
    return created[0];
  }

  async updateTranscription(id: string, userId: string, updates: Partial<Transcription>): Promise<Transcription | undefined> {
    const sanitizedUpdates = deepSanitize(updates);
    const result = await this.db
      .update(transcriptions)
      .set(sanitizedUpdates)
      .where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId)))
      .returning();
    return result[0];
  }

  async updateVideo(id: string, userId: string, updates: Partial<Video>): Promise<Video | undefined> {
    const result = await this.db
      .update(videos)
      .set(updates)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .returning();
    return result[0];
  }

  async getUserEntitlement(userId: string): Promise<UserEntitlement | undefined> {
    const result = await this.db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, userId))
      .limit(1);
    return result[0];
  }

  async upsertUserEntitlementByEmail(email: string, data: Partial<UserEntitlement>): Promise<UserEntitlement | undefined> {
    const normalizedEmail = email.toLowerCase();
    const userResult = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    
    if (!userResult[0]) {
      console.log(`[upsertUserEntitlementByEmail] No user found with email ${normalizedEmail}, storing pending entitlement`);
      const existing = await this.db
        .select()
        .from(pendingEntitlements)
        .where(eq(pendingEntitlements.email, normalizedEmail))
        .limit(1);
      
      if (existing[0]) {
        await this.db
          .update(pendingEntitlements)
          .set({
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            plan: data.plan || existing[0].plan,
            status: data.status || existing[0].status,
            watermarkRequired: data.watermarkRequired ?? existing[0].watermarkRequired,
            aiBroll: data.aiBroll ?? existing[0].aiBroll,
            aiVoice: data.aiVoice ?? existing[0].aiVoice,
            maxExports: data.maxExports ?? existing[0].maxExports,
            exportAllowed: data.exportAllowed ?? existing[0].exportAllowed,
            currentPeriodEnd: data.currentPeriodEnd,
            updatedAt: new Date(),
          })
          .where(eq(pendingEntitlements.email, normalizedEmail));
        console.log(`[upsertUserEntitlementByEmail] Updated pending entitlement for ${normalizedEmail}`);
      } else {
        await this.db
          .insert(pendingEntitlements)
          .values({
            email: normalizedEmail,
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            plan: data.plan || "free",
            status: data.status || "active",
            watermarkRequired: data.watermarkRequired ?? true,
            aiBroll: data.aiBroll ?? false,
            aiVoice: data.aiVoice ?? false,
            maxExports: data.maxExports ?? 3,
            exportAllowed: data.exportAllowed ?? true,
            currentPeriodEnd: data.currentPeriodEnd,
          });
        console.log(`[upsertUserEntitlementByEmail] Created pending entitlement for ${normalizedEmail}`);
      }
      return undefined;
    }

    const userId = userResult[0].id;
    
    const existing = await this.db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, userId))
      .limit(1);

    if (existing[0]) {
      const updated = await this.db
        .update(userEntitlements)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userEntitlements.userId, userId))
        .returning();
      return updated[0];
    } else {
      const inserted = await this.db
        .insert(userEntitlements)
        .values({ userId, ...data })
        .returning();
      return inserted[0];
    }
  }

  async updateUserEntitlementByStripeCustomer(stripeCustomerId: string, data: Partial<UserEntitlement>): Promise<UserEntitlement | undefined> {
    const result = await this.db
      .update(userEntitlements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userEntitlements.stripeCustomerId, stripeCustomerId))
      .returning();
    return result[0];
  }

  async tryClaimWebhookEvent(eventId: string, eventType: string): Promise<boolean> {
    try {
      await this.db
        .insert(stripeWebhookEvents)
        .values({ id: eventId, eventType });
      return true;
    } catch (error: any) {
      if (error.code === "23505") {
        return false;
      }
      throw error;
    }
  }

  async getEntitlementByStripeCustomer(stripeCustomerId: string): Promise<UserEntitlement | undefined> {
    const result = await this.db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return result[0];
  }

  async createUserEntitlement(data: Partial<InsertUserEntitlement> & { userId: string }): Promise<UserEntitlement | undefined> {
    const existing = await this.db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, data.userId))
      .limit(1);
    
    if (existing[0]) {
      return existing[0];
    }
    
    const result = await this.db
      .insert(userEntitlements)
      .values(data)
      .returning();
    return result[0];
  }

  async upsertUserEntitlement(userId: string, data: Partial<InsertUserEntitlement>): Promise<UserEntitlement | undefined> {
    const existing = await this.db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, userId))
      .limit(1);
    
    if (existing[0]) {
      const updated = await this.db
        .update(userEntitlements)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userEntitlements.userId, userId))
        .returning();
      return updated[0];
    } else {
      const result = await this.db
        .insert(userEntitlements)
        .values({ userId, ...data })
        .returning();
      return result[0];
    }
  }

  async claimPendingEntitlement(userId: string, email: string): Promise<UserEntitlement | undefined> {
    const normalizedEmail = email.toLowerCase();
    const pending = await this.db
      .select()
      .from(pendingEntitlements)
      .where(eq(pendingEntitlements.email, normalizedEmail))
      .limit(1);
    
    if (!pending[0]) {
      return undefined;
    }
    
    console.log(`[claimPendingEntitlement] Claiming pending entitlement for ${normalizedEmail} -> ${userId}`);
    
    const existingForUser = await this.db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, userId))
      .limit(1);
    
    if (existingForUser[0]) {
      const updated = await this.db
        .update(userEntitlements)
        .set({
          plan: pending[0].plan,
          status: pending[0].status,
          stripeCustomerId: pending[0].stripeCustomerId,
          stripeSubscriptionId: pending[0].stripeSubscriptionId,
          watermarkRequired: pending[0].watermarkRequired,
          aiBroll: pending[0].aiBroll,
          aiVoice: pending[0].aiVoice,
          maxExports: pending[0].maxExports,
          exportAllowed: pending[0].exportAllowed,
          currentPeriodEnd: pending[0].currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(userEntitlements.userId, userId))
        .returning();
      
      await this.db.delete(pendingEntitlements).where(eq(pendingEntitlements.email, normalizedEmail));
      console.log(`[claimPendingEntitlement] Updated existing entitlement and deleted pending`);
      return updated[0];
    } else {
      const result = await this.db
        .insert(userEntitlements)
        .values({
          userId,
          plan: pending[0].plan,
          status: pending[0].status,
          stripeCustomerId: pending[0].stripeCustomerId,
          stripeSubscriptionId: pending[0].stripeSubscriptionId,
          watermarkRequired: pending[0].watermarkRequired,
          aiBroll: pending[0].aiBroll,
          aiVoice: pending[0].aiVoice,
          maxExports: pending[0].maxExports,
          exportAllowed: pending[0].exportAllowed,
          currentPeriodEnd: pending[0].currentPeriodEnd,
        })
        .returning();
      
      await this.db.delete(pendingEntitlements).where(eq(pendingEntitlements.email, normalizedEmail));
      console.log(`[claimPendingEntitlement] Created entitlement from pending for user`);
      return result[0];
    }
  }

  async createTermsAcceptance(data: Omit<InsertTermsAcceptance, 'id'>): Promise<TermsAcceptance> {
    const result = await this.db
      .insert(termsAcceptances)
      .values(data)
      .returning();
    return result[0];
  }

  async logStripeEvent(eventId: string, eventType: string, payload: any): Promise<void> {
    await this.db.execute(
      sql`INSERT INTO stripe_events_log (event_id, type, payload, processed) 
          VALUES (${eventId}, ${eventType}, ${JSON.stringify(payload)}::jsonb, false)
          ON CONFLICT (event_id) DO NOTHING`
    );
  }

  async markStripeEventProcessed(eventId: string): Promise<void> {
    await this.db.execute(
      sql`UPDATE stripe_events_log SET processed = true WHERE event_id = ${eventId}`
    );
  }

  async getRecentStripeEvents(limit: number = 10): Promise<any[]> {
    const result = await this.db.execute(
      sql`SELECT event_id, type, created_at, processed 
          FROM stripe_events_log 
          ORDER BY created_at DESC 
          LIMIT ${limit}`
    );
    return result.rows;
  }

  // Render Job methods
  async getRenderJob(id: string, userId: string): Promise<RenderJob | undefined> {
    const result = await this.db
      .select()
      .from(renderJobs)
      .where(and(eq(renderJobs.id, id), eq(renderJobs.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getRenderJobsByUser(userId: string): Promise<RenderJob[]> {
    return await this.db
      .select()
      .from(renderJobs)
      .where(eq(renderJobs.userId, userId))
      .orderBy(desc(renderJobs.createdAt));
  }

  async getQueuedRenderJobs(): Promise<RenderJob[]> {
    return await this.db
      .select()
      .from(renderJobs)
      .where(eq(renderJobs.status, "queued"))
      .orderBy(desc(renderJobs.createdAt));
  }

  async createRenderJob(job: InsertRenderJob): Promise<RenderJob> {
    const sanitizedJob = deepSanitize(job);
    const created = await this.db.insert(renderJobs).values(sanitizedJob).returning();
    return created[0];
  }

  async updateRenderJob(id: string, updates: Partial<RenderJob>): Promise<RenderJob | undefined> {
    const sanitizedUpdates = deepSanitize(updates);
    const result = await this.db
      .update(renderJobs)
      .set({ ...sanitizedUpdates, updatedAt: new Date() })
      .where(eq(renderJobs.id, id))
      .returning();
    return result[0];
  }

  async createRecordingSession(session: InsertRecordingSession): Promise<RecordingSession> {
    const sanitizedSession = deepSanitize(session);
    const created = await this.db.insert(recordingSessions).values(sanitizedSession).returning();
    return created[0];
  }

  async getRecordingSession(id: string): Promise<RecordingSession | undefined> {
    const result = await this.db
      .select()
      .from(recordingSessions)
      .where(eq(recordingSessions.id, id));
    return result[0];
  }

  async updateRecordingSession(id: string, updates: Partial<RecordingSession>): Promise<RecordingSession | undefined> {
    const sanitizedUpdates = deepSanitize(updates);
    const result = await this.db
      .update(recordingSessions)
      .set({ ...sanitizedUpdates, updatedAt: new Date() })
      .where(eq(recordingSessions.id, id))
      .returning();
    return result[0];
  }
  async addToWaitlist(email: string): Promise<WaitlistEntry> {
    const result = await this.db
      .insert(waitlist)
      .values({ email, status: "waiting" })
      .onConflictDoNothing()
      .returning();
    if (result.length === 0) {
      const existing = await this.db
        .select()
        .from(waitlist)
        .where(eq(waitlist.email, email));
      return existing[0];
    }
    return result[0];
  }

  async getWaitlistByEmail(email: string): Promise<WaitlistEntry | undefined> {
    const result = await this.db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email));
    return result[0];
  }

  async redeemWaitlistCode(email: string, userId?: string): Promise<WaitlistEntry> {
    const result = await this.db
      .update(waitlist)
      .set({
        status: "approved",
        redeemedAt: new Date(),
        redeemedByUserId: userId || null,
      })
      .where(eq(waitlist.email, email))
      .returning();
    return result[0];
  }

  // AI Edit Sessions
  async createAiEditSession(session: InsertAiEditSession): Promise<AiEditSession> {
    const result = await this.db.insert(aiEditSessions).values(session).returning();
    return result[0];
  }

  async getAiEditSession(id: string, userId: string): Promise<AiEditSession | undefined> {
    const result = await this.db
      .select()
      .from(aiEditSessions)
      .where(and(eq(aiEditSessions.id, id), eq(aiEditSessions.userId, userId)))
      .limit(1);
    return result[0];
  }

  async getAiEditSessionByPost(postId: string, userId: string): Promise<AiEditSession | undefined> {
    const result = await this.db
      .select()
      .from(aiEditSessions)
      .where(and(eq(aiEditSessions.postId, postId), eq(aiEditSessions.userId, userId), eq(aiEditSessions.status, "active")))
      .orderBy(desc(aiEditSessions.createdAt))
      .limit(1);
    return result[0];
  }

  async updateAiEditSession(id: string, userId: string, updates: Partial<AiEditSession>): Promise<AiEditSession | undefined> {
    const result = await this.db
      .update(aiEditSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(aiEditSessions.id, id), eq(aiEditSessions.userId, userId)))
      .returning();
    return result[0];
  }

  async createAiEditMessage(message: InsertAiEditMessage): Promise<AiEditMessage> {
    const result = await this.db.insert(aiEditMessages).values(message).returning();
    return result[0];
  }

  async getAiEditMessages(sessionId: string): Promise<AiEditMessage[]> {
    return this.db
      .select()
      .from(aiEditMessages)
      .where(eq(aiEditMessages.sessionId, sessionId))
      .orderBy(aiEditMessages.createdAt);
  }
}

// Use database storage for persistent data
export const storage = new DbStorage();
