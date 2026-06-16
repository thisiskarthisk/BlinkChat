-- ==========================================
-- BLINKCHAT COMPREHENSIVE SCHEMA UPDATE
-- ==========================================

-- 1. NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'request_accepted', 'request_rejected', 'new_request'
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    related_id TEXT, -- e.g. chat_id or request_id
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FRIEND REQUESTS ENHANCEMENTS (3-Strike Rule)
ALTER TABLE friend_requests ADD COLUMN IF NOT EXISTS rejection_count INT DEFAULT 0;

-- 3. CHAT MANAGEMENT & PRIVACY
-- Disappearing messages (shared)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS disappearing_messages_ttl INTERVAL; 

-- Per-user chat settings
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS chat_theme TEXT DEFAULT 'Default';
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS chat_background_image TEXT;

-- 4. MEDIA TRACKING (Auto-Cleanup Support)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_path TEXT;

-- 5. REALTIME ENABLEMENT
-- Ensure realtime is active for the new notifications table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- 6. STORAGE CONFIGURATION
-- Create the unified storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Drop existing to avoid conflicts during update
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Create Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'chat-media');
