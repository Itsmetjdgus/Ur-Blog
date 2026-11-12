-- Tidnote database schema (recovery reference)
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

  -- 2026-10-30: block '@' in nicknames (avoid exposing email addresses)
alter table profiles
  add constraint profiles_nickname_no_at check (nickname !~ '@');

  -- 2026-11-01: reports and account deletion

create table reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id bigint not null,
  reason text not null check (reason in ('spam', 'harassment', 'privacy', 'illegal', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

alter table reports enable row level security;

create policy "users can create reports"
  on reports for insert to authenticated
  with check (auth.uid() = reporter_id and status = 'open');

create or replace function public.prepare_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();

  if (
    select count(*) from public.reports
    where reporter_id = new.reporter_id
      and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Too many reports. Please wait a moment.';
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_report_trigger on public.reports;

create trigger prepare_report_trigger
  before insert on public.reports
  for each row execute function public.prepare_report();

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.posts where author_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2026-11-05: add 'self_harm' to report reasons

alter table reports drop constraint if exists reports_reason_check;

alter table reports
  add constraint reports_reason_check
  check (reason in ('spam', 'harassment', 'privacy', 'illegal', 'self_harm', 'other'));

-- 2026-11-08: F1 follow, private account, block

-- 1. profiles: account privacy
alter table profiles add column if not exists is_private boolean not null default false;

-- 2. unique nickname (case-insensitive)
create unique index if not exists profiles_nickname_lower_idx on profiles (lower(nickname));

-- 3. blocks
create table if not exists blocks (
  blocker_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table blocks enable row level security;

create policy "blocker can read own blocks"
  on blocks for select to authenticated
  using (auth.uid() = blocker_id);

create policy "users can create own blocks"
  on blocks for insert to authenticated
  with check (auth.uid() = blocker_id);

create policy "blocker can delete own blocks"
  on blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- 4. follows
create table if not exists follows (
  follower_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on follows (following_id, status);

alter table follows enable row level security;

create policy "parties can read follows"
  on follows for select to authenticated
  using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "users can create own follows"
  on follows for insert to authenticated
  with check (auth.uid() = follower_id);

create policy "followed user can update follows"
  on follows for update to authenticated
  using (auth.uid() = following_id)
  with check (auth.uid() = following_id);

create policy "parties can delete follows"
  on follows for delete to authenticated
  using (auth.uid() = follower_id or auth.uid() = following_id);

-- 5. follow triggers
create or replace function public.prepare_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_private boolean;
begin
  if exists (
    select 1 from public.blocks b
    where b.blocker_id = new.following_id and b.blocked_id = new.follower_id
  ) then
    raise exception 'Unable to follow this user.';
  end if;

  select is_private into target_private
  from public.profiles where id = new.following_id;

  new.status := case when coalesce(target_private, true) then 'pending' else 'accepted' end;
  new.created_at := now();

  if (
    select count(*) from public.follows
    where follower_id = new.follower_id
      and created_at > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'Too many follow actions. Please wait a moment.';
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_follow_trigger on public.follows;

create trigger prepare_follow_trigger
  before insert on public.follows
  for each row execute function public.prepare_follow();

create or replace function public.protect_follow_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.follower_id := old.follower_id;
  new.following_id := old.following_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_follow_columns_trigger on public.follows;

create trigger protect_follow_columns_trigger
  before update on public.follows
  for each row execute function public.protect_follow_columns();

-- 6. privacy change and block triggers
create or replace function public.handle_privacy_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_private and not new.is_private then
    update public.follows
    set status = 'accepted'
    where following_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_privacy_change on public.profiles;

create trigger on_profile_privacy_change
  after update of is_private on public.profiles
  for each row execute function public.handle_privacy_change();

create or replace function public.handle_block_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists on_block_created on public.blocks;

create trigger on_block_created
  after insert on public.blocks
  for each row execute function public.handle_block_created();

-- 7. who can view an author's content
create or replace function public.can_view_author(author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    auth.uid() = author
    or (
      not exists (
        select 1 from public.blocks b
        where b.blocker_id = author and b.blocked_id = auth.uid()
      )
      and (
        exists (select 1 from public.profiles p where p.id = author and not p.is_private)
        or exists (
          select 1 from public.follows f
          where f.following_id = author
            and f.follower_id = auth.uid()
            and f.status = 'accepted'
        )
      )
    ),
    false
  );
$$;

-- 8. read rules now follow account privacy
drop policy if exists "anyone can read posts" on posts;

create policy "read posts of viewable authors"
  on posts for select
  using (public.can_view_author(author_id));

drop policy if exists "anyone can read comments" on comments;

create policy "read comments of viewable posts"
  on comments for select
  using (exists (select 1 from posts p where p.id = comments.post_id));

drop policy if exists "users can add own comments" on comments;

create policy "users can add own comments on viewable posts"
  on comments for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (select 1 from posts p where p.id = comments.post_id)
  );

  -- ============================================
-- 24일차: 프로필 소개글(bio)
-- ============================================
alter table profiles add column if not exists bio text not null default '';

alter table profiles drop constraint if exists profiles_bio_length;
alter table profiles add constraint profiles_bio_length check (char_length(bio) <= 100);

-- ============================================
-- 2026-11-13: 26일차 프로필 사진
-- ============================================

-- 1. profiles: 사진 경로 (본인 폴더 안의 파일만 허용)
alter table profiles add column if not exists avatar_path text;

alter table profiles drop constraint if exists profiles_avatar_path_owner;
alter table profiles
  add constraint profiles_avatar_path_owner
  check (avatar_path is null or avatar_path like id::text || '/%');

-- 2. 공개 저장소 avatars (파일당 512KB, 이미지 형식만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "anyone can view avatars" on storage.objects;
create policy "anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete own avatar" on storage.objects;
create policy "users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 2026-11-13: 26일차 사용자(프로필) 신고
-- ============================================
alter table reports
  add column if not exists target_user uuid references profiles(id) on delete cascade;

alter table reports alter column target_id drop not null;

alter table reports drop constraint if exists reports_target_type_check;
alter table reports
  add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'profile'));

alter table reports drop constraint if exists reports_target_check;
alter table reports
  add constraint reports_target_check
  check (
    (target_type in ('post', 'comment') and target_id is not null and target_user is null)
    or
    (target_type = 'profile' and target_user is not null and target_id is null
       and target_user <> reporter_id)
  );

create unique index if not exists reports_profile_unique
  on reports (reporter_id, target_user)
  where target_type = 'profile';