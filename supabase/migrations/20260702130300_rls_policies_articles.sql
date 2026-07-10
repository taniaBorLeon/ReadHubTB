-- articles

-- SELECT: todos pueden leer artículos públicos (incluye usuarios anónimos).
create policy "articles_select_public"
  on public.articles
  for select
  to anon, authenticated
  using (is_public = true);

-- INSERT: solo usuarios autenticados, y únicamente como autor de sí mismos.
create policy "articles_insert_authenticated"
  on public.articles
  for insert
  to authenticated
  with check (author_id = auth.uid());

-- UPDATE: solo el autor.
create policy "articles_update_own"
  on public.articles
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- DELETE: solo el autor.
create policy "articles_delete_own"
  on public.articles
  for delete
  to authenticated
  using (author_id = auth.uid());
