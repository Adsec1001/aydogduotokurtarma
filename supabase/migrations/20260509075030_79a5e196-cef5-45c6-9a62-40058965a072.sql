
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Gallery
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gallery_images enable row level security;

create policy "Anyone can view gallery" on public.gallery_images
  for select using (true);

create policy "Admins insert gallery" on public.gallery_images
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins update gallery" on public.gallery_images
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete gallery" on public.gallery_images
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true);

create policy "Public read gallery bucket" on storage.objects
  for select using (bucket_id = 'gallery');

create policy "Admins upload gallery bucket" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update gallery bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete gallery bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));
