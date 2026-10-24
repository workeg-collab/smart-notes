-- ========================================================
-- Smart Notes (نوتتي الذكية) - Database Schema & Security
-- ========================================================

-- 1. جدول العناصر (الملاحظات، المصروفات، التذكيرات، كلمات المرور المشفرة)
create table if not exists public.items (
  id text primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade not null,
  data jsonb not null,
  updated_at timestamptz default now() not null,
  deleted boolean default false not null
);

-- فهارس لتسريع المزامنة والاستعلامات
create index if not exists idx_items_user_id on public.items(user_id);
create index if not exists idx_items_updated_at on public.items(user_id, updated_at);

-- تفعيل حماية على مستوى الصفوف (Row Level Security - RLS)
alter table public.items enable row level security;

-- سياسات الحماية: كل عميل يرى ويعدل بياناته فقط
drop policy if exists "Users can view their own items" on public.items;
create policy "Users can view their own items"
  on public.items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own items" on public.items;
create policy "Users can insert their own items"
  on public.items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own items" on public.items;
create policy "Users can update their own items"
  on public.items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own items" on public.items;
create policy "Users can delete their own items"
  on public.items for delete
  using (auth.uid() = user_id);

-- 2. جدول ملفات المستخدمين والاشتراكات (Profiles & Subscriptions)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  pin_salt text,
  pin_chk jsonb,
  subscription_tier text default 'beta_free' not null, -- beta_free, pro_monthly, pro_yearly
  subscription_status text default 'active' not null, -- active, past_due, canceled
  subscription_expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
