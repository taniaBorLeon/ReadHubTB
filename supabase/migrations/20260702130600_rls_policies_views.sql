-- views

-- INSERT: usuarios autenticados.
create policy "views_insert_authenticated"
  on public.views
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- SELECT: solo administradores o el autor del artículo visualizado.
create policy "views_select_admin_or_article_author"
  on public.views
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.articles
      where articles.id = views.article_id
        and articles.author_id = auth.uid()
    )
  );
