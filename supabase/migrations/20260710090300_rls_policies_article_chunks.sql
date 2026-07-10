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
