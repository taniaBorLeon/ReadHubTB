-- =============================================================================
-- ReadHub — Esquema completo de la base de datos
-- Este archivo es una referencia de solo lectura que documenta la estructura
-- resultante de aplicar, en orden, todas las migraciones en supabase/migrations/.
-- La fuente de verdad ejecutable son las migraciones, no este archivo.
-- =============================================================================

-- Extensiones ------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists vector;

-- profiles -----------------------------------------------------------------
-- Relación 1:1 con auth.users: mismo UUID como PK y FK.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  phone text,
  role text not null default 'reader' check (role in ('reader', 'writer', 'admin')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- articles -------------------------------------------------------------------
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

-- views ------------------------------------------------------------------
-- Cada fila es un evento de visualización independiente (no es un contador).
create table public.views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

-- likes ------------------------------------------------------------------
-- Un usuario solo puede dar like una vez por artículo.
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

-- comments ---------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

-- favorites --------------------------------------------------------------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- article_chunks -----------------------------------------------------------
-- Infraestructura vectorial (sesión 4): un artículo se trocea en fragmentos
-- de texto, cada uno con su propio embedding (dimensión 1536, OpenAI
-- text-embedding-3-small). Sin datos todavía: la generación de embeddings
-- se implementará en una fase posterior (embedding.service.ts).
create table public.article_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, chunk_index)
);

-- Índices recomendados -----------------------------------------------------
create index idx_articles_author_id on public.articles (author_id);
create index idx_views_article_id on public.views (article_id);
create index idx_likes_article_id on public.likes (article_id);
create index idx_comments_article_id on public.comments (article_id);
create index idx_favorites_article_id on public.favorites (article_id);
create index idx_article_chunks_article_id on public.article_chunks (article_id);
create index idx_article_chunks_embedding_hnsw
  on public.article_chunks using hnsw (embedding vector_cosine_ops);

-- Funciones de búsqueda vectorial --------------------------------------------
-- SECURITY DEFINER, replica is_public = true igual que list_articles_with_stats.
-- Reutilizable por Services futuros; no se invoca todavía desde la aplicación.
create function public.match_article_chunks(
  p_query_embedding vector(1536),
  p_match_count int default 5,
  p_min_similarity float default 0.0
)
returns table (
  chunk_id uuid,
  article_id uuid,
  article_title text,
  chunk_index int,
  content text,
  similarity float
)
language sql
security definer
set search_path = public
stable
as $$
  -- Two-step CTE: deja que el índice HNSW resuelva el top-k por distancia
  -- primero, y recién sobre ese conjunto reducido aplica el umbral de
  -- similitud (ver migración 20260712090000 para la justificación completa).
  with nearest as (
    select
      c.id,
      c.article_id,
      a.title,
      c.chunk_index,
      c.content,
      c.embedding <=> p_query_embedding as distance
    from public.article_chunks c
    join public.articles a on a.id = c.article_id
    where a.is_public = true
      and c.embedding is not null
    order by c.embedding <=> p_query_embedding
    limit p_match_count
  )
  select
    id,
    article_id,
    title,
    chunk_index,
    content,
    1 - distance as similarity
  from nearest
  where 1 - distance >= p_min_similarity
  order by distance;
$$;
