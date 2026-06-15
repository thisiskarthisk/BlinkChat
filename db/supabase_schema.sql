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
drop table if exists profiles cascade;

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