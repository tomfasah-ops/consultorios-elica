alter table public.historias_clinicas add column if not exists especialidad text;
alter table public.historias_clinicas add column if not exists motivo text;
alter table public.historias_clinicas add column if not exists intervencion text;
alter table public.historias_clinicas add column if not exists objetivos text;
alter table public.historias_clinicas add column if not exists fecha date default current_date;

alter table public.historias_clinicas enable row level security;

drop policy if exists "leer_historia" on public.historias_clinicas;
drop policy if exists "insertar_historia" on public.historias_clinicas;

create policy "leer_historia"
on public.historias_clinicas
for select
to anon
using (true);

create policy "insertar_historia"
on public.historias_clinicas
for insert
to anon
with check (true);
