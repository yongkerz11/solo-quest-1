-- ============================================================================
-- SOLO LEVEL: DAILY QUEST & CLAN COMMUNITY - SUPABASE SQL SCHEMA
-- Jalankan script ini di menu "SQL Editor" pada Dashboard Supabase kamu.
-- ============================================================================

-- 1. TABEL PROFILES (Data Hunter / User)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  hunter_rank TEXT NOT NULL DEFAULT 'E',
  streak INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger otomatis membuat profile saat user baru register di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, xp, level, hunter_rank, streak)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1), 'Hunter'),
    NEW.email,
    100,
    1,
    'E',
    1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABEL PERSONAL QUESTS (Quest Pribadi masing-masing User)
CREATE TABLE IF NOT EXISTS public.personal_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Disiplin',
  xp_reward INTEGER NOT NULL DEFAULT 20,
  icon TEXT NOT NULL DEFAULT '☼',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL CLANS (Komunitas / Guild)
CREATE TABLE IF NOT EXISTS public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  invite_code TEXT NOT NULL UNIQUE,
  leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL CLAN MEMBERS (Anggota yang tergabung di dalam Clan)
CREATE TABLE IF NOT EXISTS public.clan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  contributed_xp INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clan_id, user_id)
);

-- 5. TABEL CLAN QUESTS (Quest yang dibuat oleh Leader Clan untuk anggotanya)
CREATE TABLE IF NOT EXISTS public.clan_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Kekuatan',
  xp_reward INTEGER NOT NULL DEFAULT 50,
  icon TEXT NOT NULL DEFAULT 'ϟ',
  quest_type TEXT NOT NULL DEFAULT 'daily' CHECK (quest_type IN ('daily', 'event')),
  deadline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABEL CLAN QUEST COMPLETIONS (Pencatatan penyelesaian Quest Clan per User)
CREATE TABLE IF NOT EXISTS public.clan_quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_quest_id UUID NOT NULL REFERENCES public.clan_quests(id) ON DELETE CASCADE,
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clan_quest_id, user_id, completed_date)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_quest_completions ENABLE ROW LEVEL SECURITY;

-- Profiles: Semua user bisa lihat profil untuk Leaderboard, hanya pemilik yang bisa update
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Personal Quests: Terpisah per user (hanya pemilik yang bisa lihat & CRUD)
CREATE POLICY "Users manage own personal quests" ON public.personal_quests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clans: Semua user bisa lihat daftar clan, hanya leader yang bisa update/delete
CREATE POLICY "Clans viewable by everyone" ON public.clans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create clans" ON public.clans FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leader or members can update clan xp" ON public.clans FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only leader can delete clan" ON public.clans FOR DELETE USING (auth.uid() = leader_id);

-- Clan Members: Semua bisa lihat member clan, user bisa join/update kontribusi XP sendiri
CREATE POLICY "Clan members viewable by everyone" ON public.clan_members FOR SELECT USING (true);
CREATE POLICY "Users can join clans" ON public.clan_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own member contribution" ON public.clan_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave clan" ON public.clan_members FOR DELETE USING (auth.uid() = user_id);

-- Clan Quests: Bisa dilihat semua member, hanya Leader Clan yang bisa buat/edit/hapus
CREATE POLICY "Clan quests viewable by everyone" ON public.clan_quests FOR SELECT USING (true);
CREATE POLICY "Only clan leader can insert clan quests" ON public.clan_quests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.clans WHERE id = clan_id AND leader_id = auth.uid()));
CREATE POLICY "Only clan leader can update clan quests" ON public.clan_quests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.clans WHERE id = clan_id AND leader_id = auth.uid()));
CREATE POLICY "Only clan leader can delete clan quests" ON public.clan_quests FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.clans WHERE id = clan_id AND leader_id = auth.uid()));

-- Clan Quest Completions: Hanya member clan yang bisa menyelesaikan quest
CREATE POLICY "Completions viewable by everyone" ON public.clan_quest_completions FOR SELECT USING (true);
CREATE POLICY "Clan members can complete quests" ON public.clan_quest_completions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_quest_completions.clan_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "Users can uncheck own completion" ON public.clan_quest_completions FOR DELETE
  USING (auth.uid() = user_id);

