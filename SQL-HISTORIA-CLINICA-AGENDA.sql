-- Ejecutar en Supabase > SQL Editor si al guardar historia clínica aparece error de permisos.

alter table public.pacientes enable row level security;
alter table public.historias_clinicas enable row level security;
alter table public.archivos_paciente enable row level security;

drop policy if exists "centro_pacientes_demo" on public.pacientes;
drop policy if exists "centro_historias_demo" on public.historias_clinicas;
drop policy if exists "centro_archivos_demo" on public.archivos_paciente;

create policy "centro_pacientes_demo"
on public.pacientes
for all
to anon
using (true)
with check (true);

create policy "centro_historias_demo"
on public.historias_clinicas
for all
to anon
using (true)
with check (true);

create policy "centro_archivos_demo"
on public.archivos_paciente
for all
to anon
using (true)
with check (true);
