-- =============================================================================
-- ReadHub — Datos de prueba
-- Pensado para `supabase db reset` (se ejecuta después de todas las migraciones).
-- Contraseña de todos los usuarios de prueba: ReadHub123!
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Usuarios de prueba (auth.users)
-- El trigger on_auth_user_created crea automáticamente la fila correspondiente
-- en public.profiles (con role = 'reader' por defecto) para cada INSERT aquí.
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@readhub.test', crypt('ReadHub123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'writer1@readhub.test', crypt('ReadHub123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'writer2@readhub.test', crypt('ReadHub123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
   'reader1@readhub.test', crypt('ReadHub123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
   'reader2@readhub.test', crypt('ReadHub123!', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Perfiles: completar rol, fecha de nacimiento y teléfono.
-- -----------------------------------------------------------------------------
update public.profiles set role = 'admin',  birth_date = '1988-02-10', phone = '+51900000001' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'writer', birth_date = '1992-05-21', phone = '+51900000002' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'writer', birth_date = '1995-11-03', phone = '+51900000003' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'reader', birth_date = '1999-07-15', phone = '+51900000004' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'reader', birth_date = '2001-01-30', phone = '+51900000005' where id = '55555555-5555-5555-5555-555555555555';

-- -----------------------------------------------------------------------------
-- 3. Artículos
-- -----------------------------------------------------------------------------
insert into public.articles (id, author_id, title, summary, document_path, image_path, is_public) values
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Introducción a Supabase', 'Qué es Supabase y cómo empezar.',
   'articles/writer1/intro-supabase.md', 'articles/writer1/intro-supabase.png', true),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Borrador: RLS avanzado', 'Notas sin publicar sobre RLS.',
   'articles/writer1/rls-avanzado-draft.md', null, false),
  ('a0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
   'Next.js 15 y App Router', 'Novedades del App Router en Next.js 15.',
   'articles/writer2/nextjs-15.md', 'articles/writer2/nextjs-15.png', true),
  ('a0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333',
   'TypeScript para APIs', 'Buenas prácticas de tipado en APIs.',
   'articles/writer2/typescript-apis.md', 'articles/writer2/typescript-apis.png', true),
  ('a0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'Guía de la plataforma', 'Cómo usar ReadHub.', 'articles/admin/guia-plataforma.md', null, true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Comentarios
-- -----------------------------------------------------------------------------
insert into public.comments (article_id, user_id, comment) values
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Muy claro, gracias por la guía.'),
  ('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '¿Podrías profundizar en Storage?'),
  ('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'El App Router cambió mucho, buen resumen.'),
  ('a0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'Excelente complemento a mi artículo anterior.');

-- -----------------------------------------------------------------------------
-- 5. Likes (UNIQUE(article_id, user_id) evita duplicados)
-- -----------------------------------------------------------------------------
insert into public.likes (article_id, user_id) values
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444'),
  ('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555'),
  ('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444'),
  ('a0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222')
on conflict (article_id, user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Visualizaciones (cada fila es un evento independiente, no un contador)
-- -----------------------------------------------------------------------------
insert into public.views (article_id, user_id, viewed_at) values
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '3 days'),
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', now());

-- -----------------------------------------------------------------------------
-- 7. Favoritos
-- -----------------------------------------------------------------------------
insert into public.favorites (article_id, user_id) values
  ('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555'),
  ('a0000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444');
