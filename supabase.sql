-- Chạy trong Supabase > SQL Editor. An toàn khi chạy lại nhiều lần (không mất dữ liệu).
-- Việc lặp hàng tuần, phân loại, theme... nằm trong cột jsonb `data` nên KHÔNG cần thêm cột mới.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;
drop policy if exists "own row" on public.user_data;
create policy "own row" on public.user_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('moments', 'moments', false)
  on conflict (id) do nothing;

drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects for all
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
