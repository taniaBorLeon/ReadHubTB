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
