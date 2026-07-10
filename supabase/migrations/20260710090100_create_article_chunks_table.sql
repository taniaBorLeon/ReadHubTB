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
