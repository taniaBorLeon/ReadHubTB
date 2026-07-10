-- =============================================================================
-- ReadHub — Políticas RLS (referencia de solo lectura)
-- Documenta el resultado de aplicar, en orden, las migraciones RLS en
-- supabase/migrations/. La fuente de verdad ejecutable son las migraciones.
-- =============================================================================

-- Función auxiliar ---------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Habilitar RLS --------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.views enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;
alter table public.article_chunks enable row level security;

-- profiles ---------------------------------------------------------------
-- Cada usuario únicamente puede ver y modificar su propio perfil.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- articles -----------------------------------------------------------------
create policy "articles_select_public"
  on public.articles
  for select
  to anon, authenticated
  using (is_public = true);

create policy "articles_insert_authenticated"
  on public.articles
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "articles_update_own"
  on public.articles
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "articles_delete_own"
  on public.articles
  for delete
  to authenticated
  using (author_id = auth.uid());

-- comments -----------------------------------------------------------------
create policy "comments_select_all"
  on public.comments
  for select
  to anon, authenticated
  using (true);

create policy "comments_insert_authenticated"
  on public.comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "comments_update_own"
  on public.comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "comments_delete_own_or_admin"
  on public.comments
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- likes ----------------------------------------------------------------------
-- La especificación solo define INSERT y DELETE: sin política SELECT,
-- ninguna fila es legible hasta que se agregue en una fase posterior.
create policy "likes_insert_authenticated"
  on public.likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "likes_delete_own"
  on public.likes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- views ------------------------------------------------------------------
create policy "views_insert_authenticated"
  on public.views
  for insert
  to authenticated
  with check (user_id = auth.uid());

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

-- favorites ------------------------------------------------------------------
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

-- article_chunks (sesión 4) ---------------------------------------------------
-- Misma regla que "articles": solo fragmentos de artículos públicos son
-- legibles. Sin políticas de insert/update/delete todavía: nada en la
-- aplicación escribe en esta tabla en esta fase.
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
