-- ============================================================================
-- SOLO LEVEL: CLOUD SYNC SCHEMA (SUPABASE)
-- Jalankan query ini di menu "SQL Editor" pada Dashboard Supabase kamu:
-- https://supabase.com/dashboard/project/aihhuzblhnmxcfvcyryn/sql
-- ============================================================================

-- 1. TABEL USER_QUESTS (Menyimpan quest & detail latihan gym/reps/beban ke cloud)
CREATE TABLE IF NOT EXISTS public.user_quests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Gym',
  xp INTEGER NOT NULL DEFAULT 20,
  icon TEXT NOT NULL DEFAULT '🏋️',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  schedule JSONB DEFAULT '[]'::jsonb,
  completed_dates JSONB DEFAULT '[]'::jsonb,
  workout_exercises JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index agar performa query per user sangat kencang
CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON public.user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_username ON public.user_quests(username);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

-- Policy agar aplikasi web (baik local, Vercel, maupun HP) bisa membaca & menyimpan quest
DROP POLICY IF EXISTS "Allow public all on user_quests" ON public.user_quests;
CREATE POLICY "Allow public all on user_quests" ON public.user_quests
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. TABEL PROFILES (Menyimpan Level, XP, Rank, dan Streak Hunter)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  hunter_rank TEXT NOT NULL DEFAULT 'E',
  streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on profiles" ON public.profiles;
CREATE POLICY "Allow public all on profiles" ON public.profiles
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

