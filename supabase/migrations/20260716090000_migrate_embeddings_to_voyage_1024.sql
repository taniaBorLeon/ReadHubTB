-- Migración de proveedor de embeddings: OpenAI text-embedding-3-small (1536
-- dims) -> Voyage voyage-4 (1024 dims). pgvector fija la dimensión en el TIPO
-- de la columna, no se puede "reinterpretar" un vector(1536) como vector(1024)
-- in place -- hay que recrear la columna. Como además cambia el proveedor,
-- los vectores existentes ya no son comparables con los nuevos de todas
-- formas: no tiene sentido intentar preservarlos. Tras aplicar esta
-- migración es OBLIGATORIO reindexar todos los artículos (los chunks quedan
-- con embedding = null hasta entonces, y `match_article_chunks` ya filtra
-- `embedding is not null`, así que la búsqueda simplemente no los devuelve
-- mientras tanto, en vez de fallar).

-- 1. El índice HNSW depende de la dimensión de la columna: debe eliminarse
-- antes de poder alterar el tipo.
drop index if exists public.idx_article_chunks_embedding_hnsw;

-- 2. Recrear la columna con la nueva dimensión. drop+add en vez de
-- `alter column ... type` porque no existe conversión implícita entre
-- vector(1536) y vector(1024) (no son el mismo "shape"): un `alter type`
-- directo falla con error de cast.
alter table public.article_chunks drop column embedding;
alter table public.article_chunks add column embedding vector(1024);

-- 3. Recrear el índice HNSW. Se hace sobre la columna recién vaciada
-- (todos los embeddings a null): igual que en la migración original, HNSW
-- es la elección correcta precisamente porque no necesita datos previos
-- para construirse con buena calidad, a diferencia de IVFFlat.
create index idx_article_chunks_embedding_hnsw
  on public.article_chunks
  using hnsw (embedding vector_cosine_ops);

-- 4. La firma de match_article_chunks lleva la dimensión en el tipo del
-- parámetro (vector(1536) -> vector(1024)): un cambio de firma no es un
-- `create or replace` válido con distinto tipo de parámetro en algunas
-- versiones, así que se elimina explícitamente y se recrea completa.
drop function if exists public.match_article_chunks(vector(1536), int, float);

create function public.match_article_chunks(
  p_query_embedding vector(1024),
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
  -- Mismo patrón en dos pasos que la optimización previa (20260712...): el
  -- índice HNSW solo sabe recorrer eficientemente un
  -- `ORDER BY embedding <=> query LIMIT k` directo. Filtrar por similitud
  -- mínima en el mismo WHERE que el ORDER BY puede hacer que el planificador
  -- descarte el índice. Se obtienen primero los k vecinos más cercanos vía
  -- índice, y solo después se aplica el umbral sobre ese conjunto reducido.
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

grant execute on function public.match_article_chunks(vector(1024), int, float)
  to anon, authenticated;
