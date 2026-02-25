-- ============================================
-- Supplementary fixes for auth migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================

-- Fix 1: Allow authenticated users to manage agents
-- (Agent CRUD on /agents page was broken - no INSERT/UPDATE/DELETE policies)
CREATE POLICY "Authenticated users can create agents" ON agents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update agents" ON agents
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete agents" ON agents
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Fix 2: Ensure Google OAuth users get a profile
-- (Trigger fires on auth.users INSERT, but check if any users are missing profiles)
INSERT INTO user_profiles (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Fix 3: Allow authenticated users to insert usage_log via service
-- (The SECURITY DEFINER RPC handles increment, but direct inserts need this)
-- Already exists from migration, but make sure it's there:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users insert own usage' AND tablename = 'usage_log'
  ) THEN
    CREATE POLICY "Users insert own usage" ON usage_log
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
