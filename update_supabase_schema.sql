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

-- 2.1 COMPANY SUPPORT
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_company_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_company_account BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles DROP COLUMN IF EXISTS company_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS website;

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

-- ==========================================
-- 7. COMPANIES RELATIONSHIPS
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branch TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT companies_name_branch_key UNIQUE (name, branch)
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Alter queries to handle upgrading an existing database:
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_name_key;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE companies ADD CONSTRAINT companies_name_branch_key UNIQUE (name, branch);

-- RPC to allow company admin to update an employee's password at database level
CREATE OR REPLACE FUNCTION admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf')) 
    WHERE id = target_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to allow company admin to update an employee's email at database level
CREATE OR REPLACE FUNCTION admin_update_user_email(target_user_id UUID, new_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE auth.users 
    SET email = new_email 
    WHERE id = target_user_id;
    UPDATE public.profiles
    SET email = new_email
    WHERE id = target_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to allow company admin to fully delete a user account from auth.users and profiles
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. LINK DEVICE SYSTEM (QR CODE LOGIN)
-- ==========================================
CREATE TABLE IF NOT EXISTS device_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_name TEXT DEFAULT 'Web Browser',
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE device_links ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Web Browser';

-- Enable RLS
ALTER TABLE device_links ENABLE ROW LEVEL SECURITY;

-- Allow public actions for device link synchronization
DROP POLICY IF EXISTS "Allow public insert" ON device_links;
CREATE POLICY "Allow public insert" ON device_links FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select" ON device_links;
CREATE POLICY "Allow public select" ON device_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update" ON device_links;
CREATE POLICY "Allow public update" ON device_links FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete" ON device_links;
CREATE POLICY "Allow public delete" ON device_links FOR DELETE USING (true);

-- Enable Realtime for device_links
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'device_links'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE device_links;
    END IF;
END $$;

