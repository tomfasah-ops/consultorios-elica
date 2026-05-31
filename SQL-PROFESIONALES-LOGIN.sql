alter table public.profesionales add column if not exists usuario text;
alter table public.profesionales add column if not exists clave text;

-- Permisos para que la app pueda validar el acceso profesional y actualizar turnos atendidos.
drop policy if exists "permitir_actualizar_profesionales" on public.profesionales;
create policy "permitir_actualizar_profesionales"
on public.profesionales
for update
to anon
using (true)
with check (true);
