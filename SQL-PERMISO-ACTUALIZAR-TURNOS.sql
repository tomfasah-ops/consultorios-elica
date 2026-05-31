-- Ejecutar en Supabase si todavía no actualiza estados desde la app.
-- Permite que la app actualice turnos para marcar sala de espera / atendido.

drop policy if exists "permitir_actualizar_turnos" on public.turnos;

create policy "permitir_actualizar_turnos"
on public.turnos
for update
to anon
using (true)
with check (true);
