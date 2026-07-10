-- Bucket de Storage para documentos e imágenes de portada de artículos.
-- No existía ningún bucket configurado; es estrictamente necesario para que
-- el Flujo 6 (publicación de artículos) pueda almacenar archivos reales.
-- Público de lectura porque next.config.ts ya está preparado para servir
-- imágenes desde /storage/v1/object/public/** sin autenticación.

insert into storage.buckets (id, name, public)
values ('articles', 'articles', true)
on conflict (id) do nothing;

create policy "articles_storage_read_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'articles');

create policy "articles_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'articles' and owner = auth.uid());

create policy "articles_storage_update_own"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'articles' and owner = auth.uid())
  with check (bucket_id = 'articles' and owner = auth.uid());

create policy "articles_storage_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'articles' and owner = auth.uid());
