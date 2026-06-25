
-- Move has_role to a private schema so it's not callable by anon/authenticated via PostgREST
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- Recreate policies using the private function
drop policy if exists "Users view own roles" on public.user_roles;
drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins manage roles" on public.user_roles
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins insert gallery" on public.gallery_images;
drop policy if exists "Admins update gallery" on public.gallery_images;
drop policy if exists "Admins delete gallery" on public.gallery_images;
create policy "Admins insert gallery" on public.gallery_images
  for insert to authenticated with check (private.has_role(auth.uid(), 'admin'));
create policy "Admins update gallery" on public.gallery_images
  for update to authenticated using (private.has_role(auth.uid(), 'admin'));
create policy "Admins delete gallery" on public.gallery_images
  for delete to authenticated using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins upload gallery bucket" on storage.objects;
drop policy if exists "Admins update gallery bucket" on storage.objects;
drop policy if exists "Admins delete gallery bucket" on storage.objects;
create policy "Admins upload gallery bucket" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery' and private.has_role(auth.uid(), 'admin'));
create policy "Admins update gallery bucket" on storage.objects
  for update to authenticated
  using (bucket_id = 'gallery' and private.has_role(auth.uid(), 'admin'));
create policy "Admins delete gallery bucket" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and private.has_role(auth.uid(), 'admin'));

-- Drop the old public.has_role now that nothing references it
drop function if exists public.has_role(uuid, public.app_role);

-- Remove broad public listing policy on the gallery bucket (public bucket still serves files by URL)
drop policy if exists "Public read gallery bucket" on storage.objects;
