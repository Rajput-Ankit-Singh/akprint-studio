# CyberPrint Pay — Supabase Backend Setup Guide

This project includes a complete, 100% free **Supabase** backend architecture for CyberPrint Pay. It handles:
- Private cloud storage bucket (`jobs`) with 10-minute auto-cleanup.
- RLS-protected database table (`public.jobs`) with database-calculated pricing.
- Operator authentication and in-browser printing (`window.print()`).

---

## 1. Quick Setup (5 Minutes)

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com/](https://supabase.com/) and create a free account.
2. Click **New Project**, choose a name (e.g. `CyberPrint-Pay`), set a database password, and select your nearest region.

### Step 2: Run the Database Setup Script
1. In your Supabase Dashboard, open **SQL Editor** from the left sidebar.
2. Click **New query**, paste the complete SQL script below, and click **Run**:

```sql
-- CyberPrint Pay - Supabase setup (free tier)
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.jobs (
  id           uuid primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  customer_name text,
  file_name    text not null,
  file_path    text,                     -- set to null once the file is deleted
  file_type    text,
  file_deleted boolean not null default false,
  page_count   int  not null default 1 check (page_count between 1 and 500),
  copies       int  not null default 1 check (copies between 1 and 50),
  color_mode   text not null default 'bw'  check (color_mode in ('bw','color')),
  paper_size   text not null default 'A4',
  orientation  text not null default 'portrait' check (orientation in ('portrait','landscape')),
  status       text not null default 'pending',
  note         text,
  total_price  int generated always as (
                 page_count * copies * (case when color_mode = 'color' then 10 else 5 end)
               ) stored
);

-- Upgrades compatibility
alter table public.jobs add column if not exists file_deleted boolean not null default false;
alter table public.jobs alter column file_path drop not null;

-- Touch updated_at trigger
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_jobs_touch on public.jobs;
create trigger trg_jobs_touch before update on public.jobs
for each row execute function public.touch_updated_at();

-- Enable Row Level Security (RLS)
alter table public.jobs enable row level security;

-- Anon can insert pending jobs
drop policy if exists "anon can create jobs" on public.jobs;
create policy "anon can create jobs" on public.jobs
  for insert to anon, authenticated with check (status = 'pending');

-- Operator can read and update all jobs
drop policy if exists "operator can read jobs" on public.jobs;
create policy "operator can read jobs" on public.jobs
  for select to authenticated using (true);

drop policy if exists "operator can update jobs" on public.jobs;
create policy "operator can update jobs" on public.jobs
  for update to authenticated using (true) with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('jobs','jobs', false)
on conflict (id) do nothing;

drop policy if exists "anon can upload job files" on storage.objects;
create policy "anon can upload job files" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'jobs');

drop policy if exists "operator can read job files" on storage.objects;
create policy "operator can read job files" on storage.objects
  for select to authenticated using (bucket_id = 'jobs');

drop policy if exists "operator can delete job files" on storage.objects;
create policy "operator can delete job files" on storage.objects
  for delete to authenticated using (bucket_id = 'jobs');

-- Validate status constraint
update public.jobs set status = 'approved' where status not in ('pending','approved','rejected','cancelled');
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('pending','approved','rejected','cancelled'));
```

### Step 3: Create an Operator User
1. In Supabase Dashboard, click **Authentication** ➔ **Users**.
2. Click **Add User** ➔ **Create user**.
3. Enter your café email and a secure password (e.g. `operator@cyberprint.com` / `your-password`).
4. Click **Create user**. (Toggle "Auto Confirm User" to on if prompted).

### Step 4: Configure Environment Variables
1. In Supabase Dashboard, go to **Project Settings** ➔ **API**.
2. Copy your **Project URL** and **anon / public key**.
3. Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SHOP_NAME="AkPrint & Cyber Studio"
NEXT_PUBLIC_UPI_ID=uniquehacker@axl
```

4. If deploying on **Vercel** or **Cloudflare**, add these exact 4 environment variables under the project settings in the web dashboard.

---

## 2. In-Browser Native Printing

The operator console at `/operator` uses standard browser CSS `@page` styling:
- When you click **Approve & Print**, the document loads into the high-resolution print container and triggers `window.print()`.
- Your Windows/Mac default printer dialog opens with A4 paper and margins automatically preselected.
- Files are automatically removed from storage after 10 minutes or after print approval, ensuring maximum customer privacy.
