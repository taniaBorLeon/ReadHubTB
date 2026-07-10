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
