-- ── AgroIntel Supabase PostgreSQL Database Schema (Idempotent) ─────────────

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users("id") ON DELETE CASCADE,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "state" TEXT,
  "district" TEXT,
  "preferred_language" TEXT DEFAULT 'en',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Detections Table
CREATE TABLE IF NOT EXISTS "detections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
  "crop_name" TEXT NOT NULL,
  "disease_name" TEXT NOT NULL,
  "confidence" REAL NOT NULL,
  "image_url" TEXT,
  "top_predictions" JSONB,
  "advisory" JSONB,
  "location" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Chat Messages Table
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
  "sender" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audio_url" TEXT,
  "language" TEXT DEFAULT 'en',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "detections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent "already exists" errors
DROP POLICY IF EXISTS "Users can read own profile" ON "profiles";
DROP POLICY IF EXISTS "Users can insert own profile" ON "profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "profiles";

DROP POLICY IF EXISTS "Users can read own detections" ON "detections";
DROP POLICY IF EXISTS "Users can insert own detections" ON "detections";
DROP POLICY IF EXISTS "Users can delete own detections" ON "detections";

DROP POLICY IF EXISTS "Users can read own chat messages" ON "chat_messages";
DROP POLICY IF EXISTS "Users can insert own chat messages" ON "chat_messages";

-- 6. Create RLS Policies
CREATE POLICY "Users can read own profile" ON "profiles" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON "profiles" FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON "profiles" FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own detections" ON "detections" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own detections" ON "detections" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own detections" ON "detections" FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own chat messages" ON "chat_messages" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat messages" ON "chat_messages" FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Trigger & Function for Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

