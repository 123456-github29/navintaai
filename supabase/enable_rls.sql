-- =====================================================
-- NAVINTA DATABASE SECURITY: Row Level Security (RLS)
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_edit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_edit_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- Users can only read and update their own profile
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- =====================================================
-- PROJECTS TABLE POLICIES
-- Users can only access their own projects
-- =====================================================

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON projects;
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- BRAND_KITS TABLE POLICIES
-- Users can only access their own brand kits
-- =====================================================

DROP POLICY IF EXISTS "Users can view own brand_kits" ON brand_kits;
CREATE POLICY "Users can view own brand_kits" ON brand_kits
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own brand_kits" ON brand_kits;
CREATE POLICY "Users can create own brand_kits" ON brand_kits
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own brand_kits" ON brand_kits;
CREATE POLICY "Users can update own brand_kits" ON brand_kits
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own brand_kits" ON brand_kits;
CREATE POLICY "Users can delete own brand_kits" ON brand_kits
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- CONTENT_PLANS TABLE POLICIES
-- Users can only access their own content plans
-- =====================================================

DROP POLICY IF EXISTS "Users can view own content_plans" ON content_plans;
CREATE POLICY "Users can view own content_plans" ON content_plans
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own content_plans" ON content_plans;
CREATE POLICY "Users can create own content_plans" ON content_plans
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own content_plans" ON content_plans;
CREATE POLICY "Users can update own content_plans" ON content_plans
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own content_plans" ON content_plans;
CREATE POLICY "Users can delete own content_plans" ON content_plans
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- POSTS TABLE POLICIES
-- Users can only access their own posts
-- =====================================================

DROP POLICY IF EXISTS "Users can view own posts" ON posts;
CREATE POLICY "Users can view own posts" ON posts
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own posts" ON posts;
CREATE POLICY "Users can create own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- CLIPS TABLE POLICIES
-- Users can only access their own clips
-- =====================================================

DROP POLICY IF EXISTS "Users can view own clips" ON clips;
CREATE POLICY "Users can view own clips" ON clips
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own clips" ON clips;
CREATE POLICY "Users can create own clips" ON clips
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own clips" ON clips;
CREATE POLICY "Users can update own clips" ON clips
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own clips" ON clips;
CREATE POLICY "Users can delete own clips" ON clips
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- VIDEOS TABLE POLICIES
-- Users can only access their own videos
-- =====================================================

DROP POLICY IF EXISTS "Users can view own videos" ON videos;
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own videos" ON videos;
CREATE POLICY "Users can create own videos" ON videos
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own videos" ON videos;
CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- TRANSCRIPTIONS TABLE POLICIES
-- Users can only access their own transcriptions
-- =====================================================

DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
CREATE POLICY "Users can view own transcriptions" ON transcriptions
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own transcriptions" ON transcriptions;
CREATE POLICY "Users can create own transcriptions" ON transcriptions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own transcriptions" ON transcriptions;
CREATE POLICY "Users can update own transcriptions" ON transcriptions
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own transcriptions" ON transcriptions;
CREATE POLICY "Users can delete own transcriptions" ON transcriptions
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- SESSIONS TABLE POLICIES
-- Sessions are managed by the server with service role
-- Users should not directly access this table
-- =====================================================

DROP POLICY IF EXISTS "Service role only for sessions" ON sessions;
CREATE POLICY "Service role only for sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- STORAGE BUCKET POLICIES (for clips and videos buckets)
-- Run these if you haven't already set up storage policies
-- =====================================================

-- Note: Storage policies are set via Supabase Dashboard > Storage > Policies
-- Or via the following SQL (uncomment if needed):

-- INSERT INTO storage.policies (name, bucket_id, operation, definition)
-- VALUES 
--   ('Users can upload own clips', 'clips', 'INSERT', 'auth.uid()::text = (storage.foldername(name))[1]'),
--   ('Users can view own clips', 'clips', 'SELECT', 'auth.uid()::text = (storage.foldername(name))[1]'),
--   ('Users can delete own clips', 'clips', 'DELETE', 'auth.uid()::text = (storage.foldername(name))[1]'),
--   ('Users can upload own videos', 'videos', 'INSERT', 'auth.uid()::text = (storage.foldername(name))[1]'),
--   ('Users can view own videos', 'videos', 'SELECT', 'auth.uid()::text = (storage.foldername(name))[1]'),
--   ('Users can delete own videos', 'videos', 'DELETE', 'auth.uid()::text = (storage.foldername(name))[1]');

-- =====================================================
-- LUMA_GENERATIONS TABLE POLICIES
-- Users can only access their own Luma AI generations
-- =====================================================

ALTER TABLE luma_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own luma_generations" ON luma_generations;
CREATE POLICY "Users can view own luma_generations" ON luma_generations
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own luma_generations" ON luma_generations;
CREATE POLICY "Users can create own luma_generations" ON luma_generations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own luma_generations" ON luma_generations;
CREATE POLICY "Users can update own luma_generations" ON luma_generations
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own luma_generations" ON luma_generations;
CREATE POLICY "Users can delete own luma_generations" ON luma_generations
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- AI_EDIT_SESSIONS TABLE POLICIES
-- Users can only access their own editing sessions
-- Server (service_role/postgres) gets full access
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to ai_edit_sessions" ON ai_edit_sessions;
CREATE POLICY "Service role full access to ai_edit_sessions" ON ai_edit_sessions
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

DROP POLICY IF EXISTS "Users can view own ai_edit_sessions" ON ai_edit_sessions;
CREATE POLICY "Users can view own ai_edit_sessions" ON ai_edit_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create own ai_edit_sessions" ON ai_edit_sessions;
CREATE POLICY "Users can create own ai_edit_sessions" ON ai_edit_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own ai_edit_sessions" ON ai_edit_sessions;
CREATE POLICY "Users can update own ai_edit_sessions" ON ai_edit_sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own ai_edit_sessions" ON ai_edit_sessions;
CREATE POLICY "Users can delete own ai_edit_sessions" ON ai_edit_sessions
  FOR DELETE USING (auth.uid()::text = user_id);

-- =====================================================
-- AI_EDIT_MESSAGES TABLE POLICIES
-- Ownership determined via parent ai_edit_sessions table
-- Server (service_role/postgres) gets full access
-- =====================================================

DROP POLICY IF EXISTS "Service role full access to ai_edit_messages" ON ai_edit_messages;
CREATE POLICY "Service role full access to ai_edit_messages" ON ai_edit_messages
  FOR ALL USING (auth.role() = 'service_role' OR current_user = 'postgres');

DROP POLICY IF EXISTS "Users can view own ai_edit_messages" ON ai_edit_messages;
CREATE POLICY "Users can view own ai_edit_messages" ON ai_edit_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_edit_sessions
      WHERE ai_edit_sessions.id = ai_edit_messages.session_id
        AND ai_edit_sessions.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can create own ai_edit_messages" ON ai_edit_messages;
CREATE POLICY "Users can create own ai_edit_messages" ON ai_edit_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_edit_sessions
      WHERE ai_edit_sessions.id = session_id
        AND ai_edit_sessions.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can delete own ai_edit_messages" ON ai_edit_messages;
CREATE POLICY "Users can delete own ai_edit_messages" ON ai_edit_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ai_edit_sessions
      WHERE ai_edit_sessions.id = ai_edit_messages.session_id
        AND ai_edit_sessions.user_id = auth.uid()::text
    )
  );

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify RLS is enabled
-- =====================================================

-- Check RLS status on all tables:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';

-- View all policies:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';
