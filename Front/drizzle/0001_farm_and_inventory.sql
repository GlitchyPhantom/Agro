-- ── AgroIntel Supabase PostgreSQL Database Schema: Farm & Inventory ─────────────
-- Run this script in the Supabase SQL Editor if the tables do not already exist.

-- 1. Farm Plots Table
CREATE TABLE IF NOT EXISTS "farm_plots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
  "plot_name" TEXT NOT NULL,
  "area" NUMERIC(10, 2) NOT NULL,
  "area_unit" TEXT NOT NULL DEFAULT 'Acres', -- 'Acres', 'Hectares', 'Bigha', 'Guntha'
  "crop" TEXT NOT NULL,
  "sowing_date" DATE,
  "soil_type" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Farm Inventory / Medicine Cabinet Table
CREATE TABLE IF NOT EXISTS "farm_inventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
  "item_name" TEXT NOT NULL,
  "category" TEXT NOT NULL, -- 'Fungicide', 'Pesticide', 'Fertilizer', 'Insecticide', 'Herbicide', 'Medicine', 'Seeds', 'Other'
  "quantity" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'ml', -- 'ml', 'L', 'g', 'kg', 'packets', 'bottles', 'bags'
  "active_ingredient" TEXT,
  "expiry_date" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE "farm_plots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "farm_inventory" ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can read own plots" ON "farm_plots";
DROP POLICY IF EXISTS "Users can insert own plots" ON "farm_plots";
DROP POLICY IF EXISTS "Users can update own plots" ON "farm_plots";
DROP POLICY IF EXISTS "Users can delete own plots" ON "farm_plots";

DROP POLICY IF EXISTS "Users can read own inventory" ON "farm_inventory";
DROP POLICY IF EXISTS "Users can insert own inventory" ON "farm_inventory";
DROP POLICY IF EXISTS "Users can update own inventory" ON "farm_inventory";
DROP POLICY IF EXISTS "Users can delete own inventory" ON "farm_inventory";

-- 5. Create RLS Policies for Farm Plots
CREATE POLICY "Users can read own plots" ON "farm_plots" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plots" ON "farm_plots" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plots" ON "farm_plots" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plots" ON "farm_plots" FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS Policies for Farm Inventory
CREATE POLICY "Users can read own inventory" ON "farm_inventory" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON "farm_inventory" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON "farm_inventory" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON "farm_inventory" FOR DELETE USING (auth.uid() = user_id);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_farm_plots_user_id ON "farm_plots"("user_id");
CREATE INDEX IF NOT EXISTS idx_farm_inventory_user_id ON "farm_inventory"("user_id");
