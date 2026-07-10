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
