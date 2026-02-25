-- ============================================
-- Round Table App — Auth + Freemium Migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. User profiles (auto-created on signup)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  messages_used INTEGER NOT NULL DEFAULT 0,
  messages_limit INTEGER NOT NULL DEFAULT 15,
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usage log (every AI call)
CREATE TABLE IF NOT EXISTS usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add user_id to conversations (nullable first, then we'll backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id ON usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON user_profiles(plan);

-- 5. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();

-- 6. RPC: atomic increment for messages_used
CREATE OR REPLACE FUNCTION public.increment_messages_used(user_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET messages_used = messages_used + 1,
      updated_at = NOW()
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. RLS Policies
-- ============================================

-- Drop old open policies
DROP POLICY IF EXISTS "Allow all access to conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all access to messages" ON messages;
DROP POLICY IF EXISTS "Allow all access to agents" ON agents;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- Conversations: user sees only their own
CREATE POLICY "Users see own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: access through conversation ownership
CREATE POLICY "Users see own messages" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );
CREATE POLICY "Users create own messages" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

-- Agents: everyone can read, no public write
CREATE POLICY "Agents are readable by all" ON agents
  FOR SELECT USING (true);

-- User profiles: users see only their own
CREATE POLICY "Users see own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Usage log: users see only their own
CREATE POLICY "Users see own usage" ON usage_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage" ON usage_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
