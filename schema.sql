-- Ur Blog database schema (recovery reference)
-- Run top to bottom on a NEW Supabase project (SQL Editor).
-- Never put passwords, API keys, or personal data in this file.
-- When you change the database later, append the new SQL at the bottom with a date.

-- ===== 1. posts =====
create table posts (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  author_id uuid default auth.uid() references auth.users(id),
  created_at timestamptz default now()
);

alter table posts enable row level security;

create policy "anyone can read posts"
  on posts for select using (true);

create policy "users can insert own posts"
  on posts for insert to authenticated
  with check (auth.uid() = author_id);

create policy "users can update own posts"
  on posts for update to authenticated
  using (auth.uid() = author_id);

create policy "users can delete own posts"
  on posts for delete to authenticated
  using (auth.uid() = author_id);

-- ===== 2. profiles =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 20),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "anyone can read profiles"
  on profiles for select using (true);

create policy "users can update own profile"
  on profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'user_' || substr(new.id::text, 1, 8));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table posts
  add constraint posts_author_profile_fkey
  foreign key (author_id) references profiles(id);

-- ===== 3. post images =====
alter table posts add column image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images', 'post-images', true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "anyone can view post images"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "users can upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===== 4. comments =====
create table comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz default now()
);

create index comments_post_id_idx on comments (post_id, created_at);

alter table comments enable row level security;

create policy "anyone can read comments"
  on comments for select using (true);

create policy "users can add own comments"
  on comments for insert to authenticated
  with check (auth.uid() = author_id);

create policy "author or post owner can delete comments"
  on comments for delete to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1 from posts p
      where p.id = comments.post_id and p.author_id = auth.uid()
    )
  );

-- ===== 5. constraints, anti-forgery, rate limits =====
alter table posts
  add constraint posts_title_length check (char_length(title) between 1 and 100);

alter table posts
  add constraint posts_content_length check (char_length(content) between 1 and 20000);

alter table posts
  add constraint posts_image_path_owner
  check (image_path is null or image_path like author_id::text || '/%');

create or replace function public.protect_post_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
    new.author_id := old.author_id;
  end if;
  return new;
end;
$$;

create trigger protect_post_columns_trigger
  before insert or update on public.posts
  for each row execute function public.protect_post_columns();

create or replace function public.set_comment_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger set_comment_created_at_trigger
  before insert on public.comments
  for each row execute function public.set_comment_created_at();

create or replace function public.limit_post_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.posts
    where author_id = new.author_id
      and created_at > now() - interval '1 minute'
  ) >= 3 then
    raise exception 'Too many posts. Please wait a moment.';
  end if;
  return new;
end;
$$;

create trigger limit_post_rate_trigger
  before insert on public.posts
  for each row execute function public.limit_post_rate();

create or replace function public.limit_comment_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.comments
    where author_id = new.author_id
      and created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'Too many comments. Please wait a moment.';
  end if;
  return new;
end;
$$;

create trigger limit_comment_rate_trigger
  before insert on public.comments
  for each row execute function public.limit_comment_rate();