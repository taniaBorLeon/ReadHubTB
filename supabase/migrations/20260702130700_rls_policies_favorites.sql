-- favorites: solo el propietario puede ver, crear y eliminar sus favoritos.

create policy "favorites_select_own"
  on public.favorites
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert_own"
  on public.favorites
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "favorites_delete_own"
  on public.favorites
  for delete
  to authenticated
  using (user_id = auth.uid());
