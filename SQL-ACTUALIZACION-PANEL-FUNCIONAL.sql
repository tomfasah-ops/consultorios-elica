-- Ejecutar en Supabase > SQL Editor antes de usar esta versión.

-- Profesionales: agrega especialidad si no existe
alter table public.profesionales add column if not exists especialidad text;
alter table public.profesionales add column if not exists activo boolean default true;

-- Especialidades: unifica campo activo
alter table public.especialidades add column if not exists activo boolean default true;

-- Horarios: unifica campo activo
alter table public.horarios add column if not exists activo boolean default true;

-- Permisos básicos para esta versión web
alter table public.profesionales enable row level security;
alter table public.especialidades enable row level security;
alter table public.horarios enable row level security;

drop policy if exists "leer_profesionales" on public.profesionales;
drop policy if exists "insertar_profesionales" on public.profesionales;
drop policy if exists "editar_profesionales" on public.profesionales;
create policy "leer_profesionales" on public.profesionales for select to anon using (true);
create policy "insertar_profesionales" on public.profesionales for insert to anon with check (true);
create policy "editar_profesionales" on public.profesionales for update to anon using (true) with check (true);

drop policy if exists "leer_especialidades" on public.especialidades;
drop policy if exists "insertar_especialidades" on public.especialidades;
drop policy if exists "editar_especialidades" on public.especialidades;
create policy "leer_especialidades" on public.especialidades for select to anon using (true);
create policy "insertar_especialidades" on public.especialidades for insert to anon with check (true);
create policy "editar_especialidades" on public.especialidades for update to anon using (true) with check (true);

drop policy if exists "leer_horarios" on public.horarios;
drop policy if exists "insertar_horarios" on public.horarios;
drop policy if exists "editar_horarios" on public.horarios;
create policy "leer_horarios" on public.horarios for select to anon using (true);
create policy "insertar_horarios" on public.horarios for insert to anon with check (true);
create policy "editar_horarios" on public.horarios for update to anon using (true) with check (true);
