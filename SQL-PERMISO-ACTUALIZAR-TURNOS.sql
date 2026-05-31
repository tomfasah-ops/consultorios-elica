-- Ejecutar en Supabase si FINALIZAR ATENCIÓN o sala de espera no actualiza.
drop policy if exists "permitir_actualizar_turnos" on public.turnos;

create policy "permitir_actualizar_turnos"
on public.turnos
for update
to anon
using (true)
with check (true);
