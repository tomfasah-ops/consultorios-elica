-- Ejecutar en Supabase > SQL Editor si cancelar/eliminar da error de permisos.
-- Agrega campos de cancelación si todavía no existen.
alter table public.turnos add column if not exists cancelado_en timestamptz;
alter table public.turnos add column if not exists cancelado_por text;
alter table public.turnos add column if not exists motivo_cancelacion text;

-- Permisos para que la web pueda cancelar turnos y liberar horarios.
drop policy if exists "permitir_actualizar_turnos" on public.turnos;
create policy "permitir_actualizar_turnos"
on public.turnos
for update
to anon
using (true)
with check (true);

-- Permiso para eliminar turnos desde la agenda interna del centro.
drop policy if exists "permitir_eliminar_turnos" on public.turnos;
create policy "permitir_eliminar_turnos"
on public.turnos
for delete
to anon
using (true);
