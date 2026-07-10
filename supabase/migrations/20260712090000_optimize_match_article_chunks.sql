-- Optimización de rendimiento (sin cambiar la firma ni el contrato de la
-- función): la versión original filtraba por umbral de similitud
-- (`1 - distancia >= p_min_similarity`) en el mismo WHERE que intentaba
-- ordenar/limitar por esa misma distancia. Combinar un predicado sobre una
-- expresión derivada de `<=>` con el ORDER BY del propio `<=>` puede llevar
-- al planificador a descartar el índice HNSW (que solo sabe recorrer de
-- forma eficiente un `ORDER BY embedding <=> query LIMIT k` directo) y caer
-- en un escaneo más amplio antes de ordenar.
--
-- Se reescribe en dos pasos: primero se obtienen los k vecinos más cercanos
-- (deja que el índice HNSW haga el trabajo), y solo después, sobre ese
-- conjunto ya reducido a k filas, se aplica el filtro de similitud mínima.
-- Nota de comportamiento: en el caso extremo de que ninguno de los k vecinos
-- más cercanos supere el umbral, esta versión puede devolver menos filas que
-- la original (que rastreaba todo el conjunto calificado); en la práctica,
-- con los valores por defecto del proyecto, es indistinguible.
create or replace function public.match_article_chunks(
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

grant execute on function public.match_article_chunks(vector(1536), int, float)
  to anon, authenticated;
