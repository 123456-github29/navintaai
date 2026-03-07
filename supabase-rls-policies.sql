-- Supabase RLS Policies for Navinta
-- Run this ENTIRE script in your Supabase SQL Editor

-- =============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: DROP ANY EXISTING POLICIES (clean slate)
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Sessions access for authenticated" ON sessions;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own brand_kits" ON brand_kits;
DROP POLICY IF EXISTS "Users can insert own brand_kits" ON brand_kits;
DROP POLICY IF EXISTS "Users can update own brand_kits" ON brand_kits;
DROP POLICY IF EXISTS "Users can delete own brand_kits" ON brand_kits;
DROP POLICY IF EXISTS "Users can view own content_plans" ON content_plans;
DROP POLICY IF EXISTS "Users can insert own content_plans" ON content_plans;
DROP POLICY IF EXISTS "Users can update own content_plans" ON content_plans;
DROP POLICY IF EXISTS "Users can delete own content_plans" ON content_plans;
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "Users can view own clips" ON clips;
DROP POLICY IF EXISTS "Users can insert own clips" ON clips;
DROP POLICY IF EXISTS "Users can update own clips" ON clips;
DROP POLICY IF EXISTS "Users can delete own clips" ON clips;
DROP POLICY IF EXISTS "Users can view own videos" ON videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can insert own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can update own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can delete own transcriptions" ON transcriptions;

-- =============================================
-- STEP 3: CREATE RLS POLICIES
-- =============================================

-- USERS TABLE
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = id);

-- SESSIONS TABLE
CREATE POLICY "Sessions access for authenticated" ON sessions FOR ALL USING (auth.role() = 'authenticated');

-- PROJECTS TABLE
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid()::text = user_id);

-- BRAND KITS TABLE
CREATE POLICY "Users can view own brand_kits" ON brand_kits FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own brand_kits" ON brand_kits FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own brand_kits" ON brand_kits FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own brand_kits" ON brand_kits FOR DELETE USING (auth.uid()::text = user_id);

-- CONTENT PLANS TABLE
CREATE POLICY "Users can view own content_plans" ON content_plans FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own content_plans" ON content_plans FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own content_plans" ON content_plans FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own content_plans" ON content_plans FOR DELETE USING (auth.uid()::text = user_id);

-- POSTS TABLE
CREATE POLICY "Users can view own posts" ON posts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid()::text = user_id);

-- CLIPS TABLE
CREATE POLICY "Users can view own clips" ON clips FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own clips" ON clips FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own clips" ON clips FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own clips" ON clips FOR DELETE USING (auth.uid()::text = user_id);

-- VIDEOS TABLE
CREATE POLICY "Users can view own videos" ON videos FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own videos" ON videos FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own videos" ON videos FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own videos" ON videos FOR DELETE USING (auth.uid()::text = user_id);

-- TRANSCRIPTIONS TABLE
CREATE POLICY "Users can view own transcriptions" ON transcriptions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own transcriptions" ON transcriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own transcriptions" ON transcriptions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own transcriptions" ON transcriptions FOR DELETE USING (auth.uid()::text = user_id);

-- LUMA GENERATIONS TABLE
ALTER TABLE luma_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own luma_generations" ON luma_generations;
DROP POLICY IF EXISTS "Users can insert own luma_generations" ON luma_generations;
DROP POLICY IF EXISTS "Users can update own luma_generations" ON luma_generations;
DROP POLICY IF EXISTS "Users can delete own luma_generations" ON luma_generations;
CREATE POLICY "Users can view own luma_generations" ON luma_generations FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own luma_generations" ON luma_generations FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own luma_generations" ON luma_generations FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own luma_generations" ON luma_generations FOR DELETE USING (auth.uid()::text = user_id);

-- Director Chat Studio tables
ALTER TABLE edit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edl_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own edit_sessions" ON edit_sessions;
DROP POLICY IF EXISTS "Users can insert own edit_sessions" ON edit_sessions;
DROP POLICY IF EXISTS "Users can update own edit_sessions" ON edit_sessions;
DROP POLICY IF EXISTS "Users can delete own edit_sessions" ON edit_sessions;
CREATE POLICY "Users can view own edit_sessions" ON edit_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own edit_sessions" ON edit_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own edit_sessions" ON edit_sessions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own edit_sessions" ON edit_sessions FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own edl_versions" ON edl_versions;
DROP POLICY IF EXISTS "Users can insert own edl_versions" ON edl_versions;
DROP POLICY IF EXISTS "Users can update own edl_versions" ON edl_versions;
DROP POLICY IF EXISTS "Users can delete own edl_versions" ON edl_versions;
CREATE POLICY "Users can view own edl_versions" ON edl_versions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own edl_versions" ON edl_versions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own edl_versions" ON edl_versions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own edl_versions" ON edl_versions FOR DELETE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own edit_messages" ON edit_messages;
DROP POLICY IF EXISTS "Users can insert own edit_messages" ON edit_messages;
DROP POLICY IF EXISTS "Users can delete own edit_messages" ON edit_messages;
CREATE POLICY "Users can view own edit_messages" ON edit_messages FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own edit_messages" ON edit_messages FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own edit_messages" ON edit_messages FOR DELETE USING (auth.uid()::text = user_id);

-- =============================================
-- STEP 4: VERIFY
-- =============================================
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
