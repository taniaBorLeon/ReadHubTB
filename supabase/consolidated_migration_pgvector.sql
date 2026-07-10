-- =============================================================================
-- ReadHub — Infraestructura vectorial (pgvector) — script consolidado
-- Generado para pegar en Dashboard de Supabase > SQL Editor > New Query
-- Requiere que las 18 migraciones anteriores ya estén aplicadas.
-- No incluye ningún dato: no inserta embeddings ni artículos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Migración: 20260710090000_enable_pgvector.sql
-- -----------------------------------------------------------------------------
-- Habilita pgvector para soportar almacenamiento y búsqueda de embeddings.
-- Aditivo: no toca ninguna extensión ni tabla existente (pgcrypto sigue igual).
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- Migración: 20260710090100_create_article_chunks_table.sql
-- -----------------------------------------------------------------------------
-- Almacenamiento vectorial: un artículo se trocea en fragmentos de texto
-- ("chunks"); cada fragmento tiene su propio embedding. Granularidad por
-- chunk (no por artículo completo) para permitir recuperación precisa y
-- citación de fuentes específicas en fases posteriores del sistema RAG.
--
-- Dimensión del vector: 1536, correspondiente a text-embedding-3-small de
-- OpenAI (proveedor de embeddings definido para este proyecto). Si en el
-- futuro se cambia de modelo/proveedor con otra dimensión, esta columna
-- deberá recrearse (pgvector fija la dimensión en el tipo de la columna).
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

-- -----------------------------------------------------------------------------
-- Migración: 20260710090200_create_article_chunks_indexes.sql
-- -----------------------------------------------------------------------------
-- Índice estándar para filtrar/joinear por artículo (mismo patrón que el
-- resto de tablas hijas de "articles").
create index idx_article_chunks_article_id on public.article_chunks (article_id);

-- Índice vectorial HNSW con distancia coseno: se eligió HNSW en vez de
-- IVFFlat porque IVFFlat requiere ya tener datos representativos para
-- calcular sus clusters ("lists") y degrada su calidad con tablas pequeñas o
-- vacías -- exactamente el estado inicial de este proyecto. HNSW no depende
-- del volumen de filas para dar buena calidad de búsqueda desde el primer
-- embedding insertado, a costa de algo más de tiempo de construcción del
-- índice, aceptable para el volumen esperado de artículos de ReadHub.
-- vector_cosine_ops porque los embeddings de OpenAI están normalizados y la
-- similitud coseno es la métrica recomendada por el proveedor.
create index idx_article_chunks_embedding_hnsw
  on public.article_chunks
  using hnsw (embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- Migración: 20260710090300_rls_policies_article_chunks.sql
-- -----------------------------------------------------------------------------
-- article_chunks: misma regla de visibilidad que "articles" (solo fragmentos
-- de artículos públicos son legibles por anon/authenticated).
-- Sin políticas de INSERT/UPDATE/DELETE todavía: en esta fase no existe
-- ningún Service que escriba en esta tabla. La escritura la hará el futuro
-- embedding.service.ts con la service_role key (bypassa RLS), consistente
-- con que ningún usuario final deba poder insertar/alterar embeddings.

alter table public.article_chunks enable row level security;

create policy "article_chunks_select_public"
  on public.article_chunks
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.articles
      where articles.id = article_chunks.article_id
        and articles.is_public = true
    )
  );

-- -----------------------------------------------------------------------------
-- Migración: 20260710090400_create_vector_search_functions.sql
-- -----------------------------------------------------------------------------
-- Función SQL reutilizable de búsqueda por similitud vectorial.
-- SECURITY DEFINER, mismo patrón que list_articles_with_stats /
-- get_article_with_stats: replica explícitamente is_public = true en su
-- propio cuerpo en vez de depender únicamente de la política RLS.
--
-- No se invoca todavía desde ningún Service/Hook/Route Handler -- queda
-- lista para que la consuma vector-search.service.ts en una fase posterior.

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
  select
    c.id,
    c.article_id,
    a.title,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.article_chunks c
  join public.articles a on a.id = c.article_id
  where a.is_public = true
    and c.embedding is not null
    and 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$$;

grant execute on function public.match_article_chunks(vector(1536), int, float)
  to anon, authenticated;

