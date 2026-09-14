-- ── STRICT USER DATA ISOLATION FOR DETECTIONS ─────────────────────────────────
-- Run this in your Supabase SQL Editor to enforce strict multi-tenant privacy.
-- With these policies, every user CAN ONLY see and manage their OWN scans.
-- User "Kira" will NEVER see scans from any other user.

-- 1. Ensure Row Level Security is enabled
ALTER TABLE "detections" ENABLE ROW LEVEL SECURITY;

-- 2. Drop all previous/permissive policies
DROP POLICY IF EXISTS "Users can read own detections" ON "detections";
DROP POLICY IF EXISTS "Users can insert own detections" ON "detections";
DROP POLICY IF EXISTS "Users can update own detections" ON "detections";
DROP POLICY IF EXISTS "Users can delete own detections" ON "detections";
DROP POLICY IF EXISTS "Enable read access for all users" ON "detections";
DROP POLICY IF EXISTS "Public can view detections" ON "detections";
DROP POLICY IF EXISTS "Allow all" ON "detections";

-- 3. STRICT READ POLICY: A user can ONLY SELECT rows where user_id matches their own auth.uid()
CREATE POLICY "Users can read own detections" ON "detections"
FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.role() = 'service_role'
);

-- 4. STRICT INSERT POLICY: A user can ONLY INSERT rows where user_id matches their own auth.uid()
CREATE POLICY "Users can insert own detections" ON "detections"
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR auth.role() = 'service_role'
);

-- 5. STRICT UPDATE POLICY: A user can ONLY UPDATE their own rows
CREATE POLICY "Users can update own detections" ON "detections"
FOR UPDATE
USING (
  auth.uid() = user_id
  OR auth.role() = 'service_role'
);

-- 6. STRICT DELETE POLICY: A user can ONLY DELETE their own rows
CREATE POLICY "Users can delete own detections" ON "detections"
FOR DELETE
USING (
  auth.uid() = user_id
  OR auth.role() = 'service_role'
);
