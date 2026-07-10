-- =============================================================================
-- ReadHub — Script SQL consolidado (18 migraciones, en orden)
-- Generado para pegar una sola vez en Dashboard de Supabase > SQL Editor > New Query
-- No incluye supabase/seed.sql (crea usuarios de prueba con contraseñas conocidas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Migración: 20260702120000_enable_extensions.sql
-- -----------------------------------------------------------------------------
-- Requerido para gen_random_uuid() en las claves primarias.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Migración: 20260702120100_create_profiles_table.sql
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  phone text,
  role text not null default 'reader' check (role in ('reader', 'writer', 'admin')),
  created_at timestamptz not null default now()
);

-- Sincroniza automáticamente profiles con auth.users, garantizando la
-- relación 1:1 mediante el mismo UUID como PK/FK.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Migración: 20260702120200_create_articles_table.sql
-- -----------------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  summary text,
  document_path text,
  image_path text,
  created_at timestamptz not null default now(),
  is_public boolean not null default true
);

-- -----------------------------------------------------------------------------
-- Migración: 20260702120300_create_views_table.sql
-- -----------------------------------------------------------------------------
create table public.views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Migración: 20260702120400_create_likes_table.sql
-- -----------------------------------------------------------------------------
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Migración: 20260702120500_create_comments_table.sql
-- -----------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Migración: 20260702120600_create_favorites_table.sql
-- -----------------------------------------------------------------------------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Migración: 20260702120700_create_indexes.sql
-- -----------------------------------------------------------------------------
create index idx_articles_author_id on public.articles (author_id);
create index idx_views_article_id on public.views (article_id);
create index idx_likes_article_id on public.likes (article_id);
create index idx_comments_article_id on public.comments (article_id);
create index idx_favorites_article_id on public.favorites (article_id);

-- -----------------------------------------------------------------------------
-- Migración: 20260702130000_create_helper_functions.sql
-- -----------------------------------------------------------------------------
-- Función auxiliar para políticas RLS que necesitan verificar el rol admin
-- sin quedar atrapadas por la propia RLS de profiles (SECURITY DEFINER la evita).
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

-- -----------------------------------------------------------------------------
-- Migración: 20260702130100_enable_rls.sql
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.views enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;

-- -----------------------------------------------------------------------------
-- Migración: 20260702130200_rls_policies_profiles.sql
-- -----------------------------------------------------------------------------
-- profiles: cada usuario únicamente puede ver y modificar su propio perfil.

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

-- -----------------------------------------------------------------------------
-- Migración: 20260702130300_rls_policies_articles.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Migración: 20260702130400_rls_policies_comments.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Migración: 20260702130500_rls_policies_likes.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Migración: 20260702130600_rls_policies_views.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Migración: 20260702130700_rls_policies_favorites.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Migración: 20260703090000_create_public_read_helpers.sql
-- -----------------------------------------------------------------------------
-- Funciones de lectura pública (SECURITY DEFINER), aditivas a la infraestructura
-- existente: no modifican tablas, políticas RLS ni seed.sql.
--
-- Motivo: la especificación del frontend exige mostrar autor, cantidad de
-- visualizaciones y cantidad de "me gusta" en el listado y en el detalle de
-- artículo, pero las políticas RLS vigentes (supabase/policies.sql) no
-- exponen esa información a un cliente anon/authenticated normal:
--   - "likes" no tiene política SELECT (a propósito, ver policies.sql).
--   - "views" solo es legible por el autor del artículo o un admin.
--   - el nombre/email del autor vive en auth.users, inaccesible vía PostgREST.
-- Estas funciones agregan sobre esas fuentes sin alterar el modelo de acceso
-- de las tablas base, replicando explícitamente la misma regla de negocio
-- (is_public = true) en su propio cuerpo.

create function public.list_articles_with_stats()
returns table (
  id uuid,
  author_id uuid,
  author_email text,
  title text,
  summary text,
  document_path text,
  image_path text,
  created_at timestamptz,
  views_count bigint,
  likes_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.author_id,
    u.email,
    a.title,
    a.summary,
    a.document_path,
    a.image_path,
    a.created_at,
    (select count(*) from public.views v where v.article_id = a.id),
    (select count(*) from public.likes l where l.article_id = a.id)
  from public.articles a
  join auth.users u on u.id = a.author_id
  where a.is_public = true
  order by a.created_at desc;
$$;

create function public.get_article_with_stats(p_article_id uuid)
returns table (
  id uuid,
  author_id uuid,
  author_email text,
  title text,
  summary text,
  document_path text,
  image_path text,
  created_at timestamptz,
  is_public boolean,
  views_count bigint,
  likes_count bigint,
  liked_by_me boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.author_id,
    u.email,
    a.title,
    a.summary,
    a.document_path,
    a.image_path,
    a.created_at,
    a.is_public,
    (select count(*) from public.views v where v.article_id = a.id),
    (select count(*) from public.likes l where l.article_id = a.id),
    exists (
      select 1 from public.likes l
      where l.article_id = a.id and l.user_id = auth.uid()
    )
  from public.articles a
  join auth.users u on u.id = a.author_id
  where a.id = p_article_id
    and (a.is_public = true or a.author_id = auth.uid());
$$;

create function public.list_comments_with_author(p_article_id uuid)
returns table (
  id uuid,
  article_id uuid,
  user_id uuid,
  author_email text,
  comment text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.article_id,
    c.user_id,
    u.email,
    c.comment,
    c.created_at
  from public.comments c
  join auth.users u on u.id = c.user_id
  where c.article_id = p_article_id
  order by c.created_at asc;
$$;

grant execute on function public.list_articles_with_stats() to anon, authenticated;
grant execute on function public.get_article_with_stats(uuid) to anon, authenticated;
grant execute on function public.list_comments_with_author(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Migración: 20260703090100_create_storage_articles_bucket.sql
-- -----------------------------------------------------------------------------
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

