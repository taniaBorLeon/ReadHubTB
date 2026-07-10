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
