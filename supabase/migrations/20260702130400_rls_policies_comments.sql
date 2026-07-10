-- comments

-- SELECT: leer todos.
create policy "comments_select_all"
  on public.comments
  for select
  to anon, authenticated
  using (true);

-- INSERT: crear autenticado.
create policy "comments_insert_authenticated"
  on public.comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: editar solo autor.
create policy "comments_update_own"
  on public.comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: eliminar autor o admin.
create policy "comments_delete_own_or_admin"
  on public.comments
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
