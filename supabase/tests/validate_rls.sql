-- =============================================================================
-- ReadHub — Validación de políticas RLS
--
-- Cómo ejecutar:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/validate_rls.sql
-- (o pegar el contenido en el SQL Editor de Supabase conectado como `postgres`).
--
-- Requisitos:
--   - Las migraciones y supabase/seed.sql ya deben estar aplicados.
--   - Debe ejecutarse con un rol que tenga membresía en anon/authenticated
--     (el rol `postgres` de un proyecto Supabase la tiene por defecto).
--
-- Todo el script corre dentro de una única transacción que termina en
-- ROLLBACK: no deja residuos, sin importar qué INSERT/UPDATE/DELETE se
-- ejecuten como parte de las pruebas.
--
-- Resultado: cada prueba imprime NOTICE [PASS] o WARNING [FAIL] <descripción>.
-- Revisar la salida al final: no debe haber ningún [FAIL].
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Simula un usuario autenticado con el JWT que usaría PostgREST/Supabase.
create or replace function pg_temp.auth_as(p_user_id uuid, p_role text default 'authenticated')
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'role', p_role)::text,
    true
  );
  execute format('set local role %I', p_role);
end;
$$;

-- Simula una solicitud sin sesión (usuario no autenticado).
create or replace function pg_temp.auth_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
end;
$$;

-- Vuelve al rol propietario (bypassa RLS) entre pruebas.
create or replace function pg_temp.auth_reset()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  reset role;
end;
$$;

create or replace function pg_temp.expect(p_description text, p_condition boolean)
returns void
language plpgsql
as $$
begin
  if p_condition then
    raise notice '[PASS] %', p_description;
  else
    raise warning '[FAIL] %', p_description;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Usuarios de prueba (ver supabase/seed.sql)
--   admin    11111111-1111-1111-1111-111111111111
--   writer1  22222222-2222-2222-2222-222222222222  (autor de art. 1 público y 2 privado)
--   writer2  33333333-3333-3333-3333-333333333333  (autor de art. 3 y 4, públicos)
--   reader1  44444444-4444-4444-4444-444444444444
--   reader2  55555555-5555-5555-5555-555555555555
--
-- Artículos:
--   a0000000-0000-0000-0000-000000000001  público,  autor writer1
--   a0000000-0000-0000-0000-000000000002  PRIVADO,  autor writer1
--   a0000000-0000-0000-0000-000000000003  público,  autor writer2
--   a0000000-0000-0000-0000-000000000004  público,  autor writer2
-- -----------------------------------------------------------------------------

-- =============================================================================
-- PROFILES — cada usuario únicamente puede ver y modificar su propio perfil.
-- =============================================================================

-- [AUTOR/PROPIETARIO] ve su propio perfil.
select pg_temp.auth_reset();
select pg_temp.auth_as('22222222-2222-2222-2222-222222222222');
select pg_temp.expect(
  'profiles: un usuario ve su propio perfil',
  (select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222') = 1
);

-- [SIN PERMISOS] no puede ver el perfil de otro usuario.
select pg_temp.expect(
  'profiles: un usuario NO ve el perfil de otro usuario',
  (select count(*) from public.profiles where id = '44444444-4444-4444-4444-444444444444') = 0
);

-- [NO AUTENTICADO] no puede ver ningún perfil.
select pg_temp.auth_as_anon();
select pg_temp.expect(
  'profiles: usuario no autenticado NO ve perfiles',
  (select count(*) from public.profiles) = 0
);

-- [AUTOR/PROPIETARIO] actualiza su propio perfil.
select pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
do $$
declare
  v_updated int;
begin
  update public.profiles set phone = '+51900000099' where id = '44444444-4444-4444-4444-444444444444';
  get diagnostics v_updated = row_count;
  perform pg_temp.expect('profiles: un usuario actualiza su propio perfil', v_updated = 1);
end $$;

-- [SIN PERMISOS] intenta actualizar el perfil de otro usuario (0 filas, sin error).
do $$
declare
  v_updated int;
begin
  update public.profiles set phone = '+51900000000' where id = '55555555-5555-5555-5555-555555555555';
  get diagnostics v_updated = row_count;
  perform pg_temp.expect('profiles: un usuario NO puede actualizar el perfil de otro', v_updated = 0);
end $$;

-- =============================================================================
-- ARTICLES
-- =============================================================================

-- [NO AUTENTICADO] solo ve artículos públicos.
select pg_temp.auth_as_anon();
select pg_temp.expect(
  'articles: usuario no autenticado solo ve artículos públicos',
  not exists (select 1 from public.articles where is_public = false)
  and (select count(*) from public.articles) = (select count(*) from public.articles where is_public = true)
);

-- [AUTOR] intentando ver su propio artículo privado (documenta la política tal
-- como está especificada: SELECT solo permite is_public = true, sin excepción
-- para el autor; por eso el resultado esperado es 0 filas).
select pg_temp.auth_as('22222222-2222-2222-2222-222222222222');
select pg_temp.expect(
  'articles: el autor no ve su propio artículo privado (comportamiento según especificación)',
  (select count(*) from public.articles where id = 'a0000000-0000-0000-0000-000000000002') = 0
);

-- [AUTENTICADO] crea un artículo como sí mismo: debe permitirse.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('22222222-2222-2222-2222-222222222222');
  begin
    insert into public.articles (author_id, title, is_public)
    values ('22222222-2222-2222-2222-222222222222', 'Artículo de prueba RLS', true);
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('articles: un usuario autenticado SI puede crear un artículo propio', not v_failed);
end $$;

-- [SIN PERMISOS] intenta crear un artículo a nombre de otro usuario: debe rechazarse.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  begin
    insert into public.articles (author_id, title, is_public)
    values ('22222222-2222-2222-2222-222222222222', 'Suplantación de autor', true);
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('articles: NO se puede crear un artículo a nombre de otro usuario', v_failed);
end $$;

-- [AUTOR] actualiza su propio artículo.
do $$
declare
  v_updated int;
begin
  perform pg_temp.auth_as('22222222-2222-2222-2222-222222222222');
  update public.articles set title = 'Introducción a Supabase (editado)'
    where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics v_updated = row_count;
  perform pg_temp.expect('articles: el autor SI puede actualizar su propio artículo', v_updated = 1);
end $$;

-- [SIN PERMISOS] intenta actualizar un artículo ajeno.
do $$
declare
  v_updated int;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  update public.articles set title = 'Hackeado'
    where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics v_updated = row_count;
  perform pg_temp.expect('articles: un usuario sin permisos NO puede actualizar un artículo ajeno', v_updated = 0);
end $$;

-- [SIN PERMISOS] intenta eliminar un artículo ajeno.
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
  delete from public.articles where id = 'a0000000-0000-0000-0000-000000000003';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('articles: un usuario sin permisos NO puede eliminar un artículo ajeno', v_deleted = 0);
end $$;

-- [AUTOR] elimina su propio artículo.
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('33333333-3333-3333-3333-333333333333');
  delete from public.articles where id = 'a0000000-0000-0000-0000-000000000004';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('articles: el autor SI puede eliminar su propio artículo', v_deleted = 1);
end $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

-- [NO AUTENTICADO] puede leer todos los comentarios.
select pg_temp.auth_as_anon();
select pg_temp.expect(
  'comments: usuario no autenticado puede leer todos los comentarios',
  (select count(*) from public.comments) = 4
);

-- [AUTENTICADO] crea un comentario propio.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
  begin
    insert into public.comments (article_id, user_id, comment)
    values ('a0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'Comentario de prueba');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('comments: un usuario autenticado SI puede comentar en su propio nombre', not v_failed);
end $$;

-- [SIN PERMISOS] intenta comentar suplantando a otro usuario.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
  begin
    insert into public.comments (article_id, user_id, comment)
    values ('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'Suplantación');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('comments: NO se puede comentar suplantando a otro usuario', v_failed);
end $$;

-- [AUTOR] edita su propio comentario.
do $$
declare
  v_updated int;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  update public.comments set comment = 'Editado por el autor'
    where article_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '44444444-4444-4444-4444-444444444444';
  get diagnostics v_updated = row_count;
  perform pg_temp.expect('comments: el autor SI puede editar su propio comentario', v_updated = 1);
end $$;

-- [SIN PERMISOS] intenta eliminar el comentario de otro usuario (no admin).
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('33333333-3333-3333-3333-333333333333');
  delete from public.comments
    where article_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '44444444-4444-4444-4444-444444444444';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('comments: un usuario sin permisos NO puede eliminar el comentario de otro', v_deleted = 0);
end $$;

-- [ADMIN] elimina el comentario de otro usuario (override explícito en la especificación).
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('11111111-1111-1111-1111-111111111111');
  delete from public.comments
    where article_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '55555555-5555-5555-5555-555555555555';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('comments: un administrador SI puede eliminar el comentario de otro usuario', v_deleted = 1);
end $$;

-- =============================================================================
-- LIKES — sin política SELECT (ver supabase/policies.sql): nadie puede leer.
-- =============================================================================

-- [AUTENTICADO] da like en su propio nombre.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
  begin
    insert into public.likes (article_id, user_id)
    values ('a0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('likes: un usuario autenticado SI puede dar like en su propio nombre', not v_failed);
end $$;

-- [SIN PERMISOS] intenta dar like a nombre de otro usuario.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
  begin
    insert into public.likes (article_id, user_id)
    values ('a0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('likes: NO se puede dar like a nombre de otro usuario', v_failed);
end $$;

-- [SIN PERMISOS] intenta eliminar el like de otro usuario.
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  delete from public.likes
    where article_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '55555555-5555-5555-5555-555555555555';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('likes: un usuario sin permisos NO puede eliminar el like de otro', v_deleted = 0);
end $$;

-- [AUTOR/PROPIETARIO] elimina su propio like.
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  delete from public.likes
    where article_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '44444444-4444-4444-4444-444444444444';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('likes: el propietario SI puede eliminar su propio like', v_deleted = 1);
end $$;

-- [NO AUTENTICADO] no puede leer ningún like (no existe política SELECT).
select pg_temp.auth_as_anon();
select pg_temp.expect(
  'likes: nadie puede leer likes (sin política SELECT definida en la especificación)',
  (select count(*) from public.likes) = 0
);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- [AUTENTICADO] registra una visualización propia.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  begin
    insert into public.views (article_id, user_id)
    values ('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('views: un usuario autenticado SI puede registrar su propia visualización', not v_failed);
end $$;

-- [SIN PERMISOS] intenta registrar una visualización a nombre de otro usuario.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  begin
    insert into public.views (article_id, user_id)
    values ('a0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('views: NO se puede registrar una visualización a nombre de otro usuario', v_failed);
end $$;

-- [AUTOR del artículo] ve las visualizaciones de su propio artículo.
select pg_temp.auth_as('22222222-2222-2222-2222-222222222222');
select pg_temp.expect(
  'views: el autor del artículo SI ve las visualizaciones de su artículo',
  (select count(*) from public.views where article_id = 'a0000000-0000-0000-0000-000000000001') > 0
);

-- [SIN PERMISOS] intenta ver las visualizaciones de un artículo ajeno.
select pg_temp.expect(
  'views: un usuario sin permisos NO ve las visualizaciones de un artículo ajeno',
  (select count(*) from public.views where article_id = 'a0000000-0000-0000-0000-000000000003') = 0
);

-- [ADMIN] ve las visualizaciones de cualquier artículo.
select pg_temp.auth_as('11111111-1111-1111-1111-111111111111');
select pg_temp.expect(
  'views: un administrador SI ve las visualizaciones de cualquier artículo',
  (select count(*) from public.views) >= (select count(*) from public.views where article_id = 'a0000000-0000-0000-0000-000000000001')
  and (select count(*) from public.views where article_id = 'a0000000-0000-0000-0000-000000000003') > 0
);

-- [NO AUTENTICADO] no puede leer ninguna visualización (la política es solo para `authenticated`).
select pg_temp.auth_as_anon();
select pg_temp.expect(
  'views: un usuario no autenticado NO puede leer visualizaciones',
  (select count(*) from public.views) = 0
);

-- =============================================================================
-- FAVORITES
-- =============================================================================

-- [AUTOR/PROPIETARIO] ve sus propios favoritos.
select pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
select pg_temp.expect(
  'favorites: el propietario SI ve sus propios favoritos',
  (select count(*) from public.favorites where user_id = '55555555-5555-5555-5555-555555555555') > 0
);

-- [SIN PERMISOS] no ve los favoritos de otro usuario.
select pg_temp.expect(
  'favorites: un usuario sin permisos NO ve los favoritos de otro',
  (select count(*) from public.favorites where user_id = '44444444-4444-4444-4444-444444444444') = 0
);

-- [AUTENTICADO] agrega un favorito propio.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  begin
    insert into public.favorites (article_id, user_id)
    values ('a0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('favorites: un usuario autenticado SI puede agregar su propio favorito', not v_failed);
end $$;

-- [SIN PERMISOS] intenta agregar un favorito a nombre de otro usuario.
do $$
declare
  v_failed boolean := false;
begin
  perform pg_temp.auth_as('44444444-4444-4444-4444-444444444444');
  begin
    insert into public.favorites (article_id, user_id)
    values ('a0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555');
  exception when others then
    v_failed := true;
  end;
  perform pg_temp.expect('favorites: NO se puede agregar un favorito a nombre de otro usuario', v_failed);
end $$;

-- [AUTOR/PROPIETARIO] elimina su propio favorito.
do $$
declare
  v_deleted int;
begin
  perform pg_temp.auth_as('55555555-5555-5555-5555-555555555555');
  delete from public.favorites
    where article_id = 'a0000000-0000-0000-0000-000000000001'
      and user_id = '55555555-5555-5555-5555-555555555555';
  get diagnostics v_deleted = row_count;
  perform pg_temp.expect('favorites: el propietario SI puede eliminar su propio favorito', v_deleted = 1);
end $$;

-- [NO AUTENTICADO] no puede leer ni crear favoritos.
select pg_temp.auth_as_anon();
select pg_temp.expect(
  'favorites: un usuario no autenticado NO puede leer favoritos',
  (select count(*) from public.favorites) = 0
);

-- -----------------------------------------------------------------------------
-- Sin cambios permanentes: se descarta todo lo ejecutado en esta transacción.
-- -----------------------------------------------------------------------------
rollback;
