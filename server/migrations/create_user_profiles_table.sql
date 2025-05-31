-- Migration: Create user_profiles table
create table if not exists public.user_profiles (
  user_id uuid not null,
  avatar_url text null,
  bio text null,
  metadata jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_profiles_pkey primary key (user_id),
  constraint user_profiles_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
) tablespace pg_default; 