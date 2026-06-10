-- Ejecutar en el SQL Editor de Supabase si las tablas no existen

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid references public.spots(id) on delete cascade,
  version_id uuid references public.spot_versions(id) on delete set null,
  author text not null,
  title text not null,
  description text,
  image_url text,
  latitude double precision not null,
  longitude double precision not null,
  user_id uuid references auth.users(id) on delete cascade,
  likes integer default 0,
  comments_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  "user" text not null,
  text text not null,
  created_at timestamptz default now()
);

alter table public.spot_versions
  drop constraint if exists spot_versions_spot_id_fkey;

alter table public.spot_versions
  add constraint spot_versions_spot_id_fkey
  foreign key (spot_id) references public.spots(id) on delete cascade;

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;

create policy "Posts visibles para autenticados"
  on public.posts for select to authenticated using (true);

create policy "Usuarios crean sus posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Usuarios eliminan sus posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

create policy "Comentarios visibles para autenticados"
  on public.post_comments for select to authenticated using (true);

create policy "Usuarios autenticados comentan"
  on public.post_comments for insert to authenticated
  with check (true);

create policy "Comentarios se eliminan con el post"
  on public.post_comments for delete to authenticated
  using (true);
