-- ==========================================
-- BLINKCHAT COMPLETE DATABASE SCHEMA
-- DEVELOPMENT VERSION (NO RLS)
-- ==========================================

drop table if exists blocked_users cascade;
drop table if exists group_messages cascade;
drop table if exists group_members cascade;
drop table if exists groups cascade;
drop table if exists messages cascade;
drop table if exists chat_members cascade;
drop table if exists chats cascade;
drop table if exists companies cascade;
drop table if exists profiles cascade;

-- ==========================================
-- COMPANIES
-- ==========================================

create table companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    branch text,
    city text,
    state text,
    pincode text,
    website text,
    created_at timestamptz default now(),
    constraint companies_name_branch_key unique (name, branch)
);

-- ==========================================
-- PROFILES
-- ==========================================

create table profiles (
    id uuid primary key,
    full_name text not null,
    username text unique not null,
    email text unique,
    phone text unique,
    avatar_url text,
    status text default 'Hey there!',
    is_online boolean default false,
    last_seen timestamptz default now(),
    company_id uuid references companies(id) on delete set null,
    is_company_admin boolean default false,
    is_company_account boolean default false,
    push_token text,
    created_at timestamptz default now()
);

-- ==========================================
-- CHATS
-- ==========================================

create table chats (
    id uuid primary key default gen_random_uuid(),

    created_at timestamptz default now()
);

-- ==========================================
-- CHAT MEMBERS
-- ==========================================

create table chat_members (
    id bigint generated always as identity primary key,

    chat_id uuid references chats(id) on delete cascade,

    user_id uuid references profiles(id) on delete cascade,

    joined_at timestamptz default now()
);

-- ==========================================
-- PRIVATE MESSAGES
-- ==========================================

create table messages (
    id uuid primary key default gen_random_uuid(),

    chat_id uuid references chats(id) on delete cascade,

    sender_id uuid references profiles(id),

    message text not null,

    message_type text default 'text',

    is_seen boolean default false,

    is_delivered boolean default false,

    created_at timestamptz default now()
);

-- ==========================================
-- GROUPS
-- ==========================================

create table groups (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    description text,

    image_url text,

    created_by uuid references profiles(id),

    created_at timestamptz default now()
);

-- ==========================================
-- GROUP MEMBERS
-- ==========================================

create table group_members (
    id bigint generated always as identity primary key,

    group_id uuid references groups(id) on delete cascade,

    user_id uuid references profiles(id) on delete cascade,

    role text default 'member',

    joined_at timestamptz default now()
);

-- ==========================================
-- GROUP MESSAGES
-- ==========================================

create table group_messages (
    id uuid primary key default gen_random_uuid(),

    group_id uuid references groups(id) on delete cascade,

    sender_id uuid references profiles(id),

    message text not null,

    message_type text default 'text',

    created_at timestamptz default now()
);

-- ==========================================
-- BLOCKED USERS
-- ==========================================

create table blocked_users (
    id bigint generated always as identity primary key,

    blocker_id uuid references profiles(id) on delete cascade,

    blocked_id uuid references profiles(id) on delete cascade,

    created_at timestamptz default now()
);

-- ==========================================
-- FRIEND REQUESTS
-- ==========================================

create table friend_requests (
    id bigint generated always as identity primary key,

    sender_id uuid references profiles(id) on delete cascade,

    receiver_id uuid references profiles(id) on delete cascade,

    status text default 'pending', -- 'pending', 'accepted', 'rejected'

    created_at timestamptz default now(),

    unique(sender_id, receiver_id)
);

-- ==========================================
-- DISABLE RLS (IMPORTANT)
-- ==========================================

alter table profiles disable row level security;
alter table chats disable row level security;
alter table chat_members disable row level security;
alter table messages disable row level security;
alter table groups disable row level security;
alter table group_members disable row level security;
alter table group_messages disable row level security;
alter table blocked_users disable row level security;
alter table friend_requests disable row level security;

-- ==========================================
-- ENABLE REALTIME (Note for Dashboard)
-- ==========================================
-- Please ensure the following tables have Realtime enabled in the Supabase Dashboard:
-- 1. messages
-- 2. profiles
-- 3. friend_requests
-- 4. chats-- Add rejection_count to friend_requests
ALTER TABLE friend_requests ADD COLUMN IF NOT EXISTS rejection_count INT DEFAULT 0;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'request_accepted', 'request_rejected', 'new_request'
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    related_id TEXT, -- e.g. chat_id or request_id
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add chat settings
ALTER TABLE chats ADD COLUMN IF NOT EXISTS disappearing_messages_ttl INTERVAL; 
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS chat_theme TEXT;
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS chat_background_image TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_path TEXT;





-- SOME Change:

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
   
    -- Storage Policies (Surgical Update)
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
   
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
    CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
    CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media');

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


