-- Initial Schema Migration
-- This migration creates all required database tables, indexes, and RLS policies
-- It's safe to run multiple times (uses IF NOT EXISTS)

-- ============================================
-- USER TABLES
-- ============================================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  age INTEGER,
  location TEXT,
  interests TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age_range_min INTEGER DEFAULT 18,
  age_range_max INTEGER DEFAULT 100,
  preferred_personalities TEXT[] DEFAULT '{}',
  preferred_interests TEXT[] DEFAULT '{}',
  communication_style_preference TEXT,
  relationship_goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- User Stats
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_swipes INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_passes INTEGER DEFAULT 0,
  total_super_likes INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- User Profile Pictures
CREATE TABLE IF NOT EXISTS user_profile_pics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_pic_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profile_pics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile pic" ON user_profile_pics;
CREATE POLICY "Users can view own profile pic" ON user_profile_pics
  FOR SELECT USING (auth.uid() = user_id);

-- User Banners
CREATE TABLE IF NOT EXISTS user_banners (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own banner" ON user_banners;
CREATE POLICY "Users can view own banner" ON user_banners
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- COMPANION TABLES
-- ============================================

-- Companions
CREATE TABLE IF NOT EXISTS companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  bio TEXT NOT NULL,
  personality TEXT NOT NULL,
  interests TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  communication_style TEXT NOT NULL,
  learning_capacity TEXT,
  backstory TEXT,
  favorite_topics TEXT[] DEFAULT '{}',
  relationship_goals TEXT[] DEFAULT '{}',
  image_url TEXT NOT NULL,
  compatibility_score NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companions_is_active ON companions(is_active);
CREATE INDEX IF NOT EXISTS idx_companions_compatibility_score ON companions(compatibility_score DESC);

ALTER TABLE companions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active companions" ON companions;
CREATE POLICY "Anyone can view active companions" ON companions
  FOR SELECT USING (is_active = true);

-- Swipe Decisions
CREATE TABLE IF NOT EXISTS swipe_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('like', 'pass', 'super_like')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, companion_id)
);

CREATE INDEX IF NOT EXISTS idx_swipe_decisions_user_id ON swipe_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_decisions_companion_id ON swipe_decisions(companion_id);
CREATE INDEX IF NOT EXISTS idx_swipe_decisions_created_at ON swipe_decisions(created_at DESC);

ALTER TABLE swipe_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own swipe decisions" ON swipe_decisions;
CREATE POLICY "Users can view own swipe decisions" ON swipe_decisions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own swipe decisions" ON swipe_decisions;
CREATE POLICY "Users can insert own swipe decisions" ON swipe_decisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, companion_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_companion_id ON matches(companion_id);
CREATE INDEX IF NOT EXISTS idx_matches_is_active ON matches(is_active);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at DESC);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own matches" ON matches;
CREATE POLICY "Users can update own matches" ON matches
  FOR UPDATE USING (auth.uid() = user_id);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, companion_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_companion_id ON conversations(companion_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  companion_id UUID REFERENCES companions(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON messages;
CREATE POLICY "Users can insert messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
CREATE POLICY "Users can update messages in own conversations" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companions_updated_at ON companions;
CREATE TRIGGER update_companions_updated_at
  BEFORE UPDATE ON companions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

