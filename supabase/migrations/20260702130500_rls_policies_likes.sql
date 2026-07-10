-- likes
-- La especificación únicamente define INSERT y DELETE para esta tabla.
-- No se define una política SELECT: con RLS habilitada, ninguna fila será
-- legible hasta que se agregue explícitamente en una fase posterior.

-- INSERT: solo autenticado.
create policy "likes_insert_authenticated"
  on public.likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: solo propietario.
create policy "likes_delete_own"
  on public.likes
  for delete
  to authenticated
  using (user_id = auth.uid());
