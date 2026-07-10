create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  summary text,
  document_path text,
  image_path text,
  created_at timestamptz not null default now(),
  is_public boolean not null default true
);
