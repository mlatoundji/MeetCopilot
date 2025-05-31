create table public.user_settings (
  user_id uuid not null,
  language character varying(10) null default 'en'::character varying,
  theme character varying(20) null default 'light'::character varying,
  notifications jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_settings_pkey primary key (user_id),
  constraint user_settings_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;