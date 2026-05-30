-- CONSULTORIOS ELICA - SQL COMPLETO

create table if not exists public.especialidades (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  activa boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.profesionales (
  id bigint generated always as identity primary key,
  nombre text not null,
  especialidad text not null,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.horarios (
  id bigint generated always as identity primary key,
  profesional text not null,
  dia_semana int not null check (dia_semana between 1 and 5),
  hora_inicio time not null,
  hora_fin time not null,
  duracion_minutos int default 10,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.turnos (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  paciente_nombre text not null,
  dni text,
  telefono text not null,
  especialidad text not null,
  profesional text not null,
  fecha date not null,
  hora time not null,
  obra_social text,
  motivo_consulta text,
  estado text default 'confirmado'
);

create unique index if not exists turnos_unicos
on public.turnos (profesional, fecha, hora)
where estado <> 'cancelado';

create table if not exists public.pacientes (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  nombre text not null,
  dni text unique,
  telefono text,
  email text,
  obra_social text,
  observaciones text
);

create table if not exists public.historias_clinicas (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  paciente_id bigint references public.pacientes(id) on delete cascade,
  fecha date default current_date,
  profesional text,
  evolucion text not null
);

create table if not exists public.archivos_paciente (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  paciente_id bigint references public.pacientes(id) on delete cascade,
  nombre_archivo text not null,
  url_archivo text,
  descripcion text
);

insert into public.especialidades (nombre) values
('Cardiología'), ('Psicología'), ('Clínica médica'), ('Kinesiología'), ('Psiquiatría')
on conflict (nombre) do nothing;

insert into public.profesionales (nombre, especialidad) values
('Profesional 1', 'Cardiología'),
('Profesional 2', 'Psicología'),
('Profesional 3', 'Clínica médica'),
('Profesional 4', 'Kinesiología'),
('Profesional 5', 'Psiquiatría')
on conflict do nothing;

alter table public.especialidades enable row level security;
alter table public.profesionales enable row level security;
alter table public.horarios enable row level security;
alter table public.turnos enable row level security;
alter table public.pacientes enable row level security;
alter table public.historias_clinicas enable row level security;
alter table public.archivos_paciente enable row level security;

drop policy if exists "leer_especialidades" on public.especialidades;
drop policy if exists "leer_profesionales" on public.profesionales;
drop policy if exists "leer_horarios" on public.horarios;
drop policy if exists "leer_turnos" on public.turnos;
drop policy if exists "insertar_turnos" on public.turnos;
drop policy if exists "centro_pacientes_demo" on public.pacientes;
drop policy if exists "centro_historias_demo" on public.historias_clinicas;
drop policy if exists "centro_archivos_demo" on public.archivos_paciente;

create policy "leer_especialidades" on public.especialidades for select to anon using (true);
create policy "leer_profesionales" on public.profesionales for select to anon using (true);
create policy "leer_horarios" on public.horarios for select to anon using (true);
create policy "leer_turnos" on public.turnos for select to anon using (true);
create policy "insertar_turnos" on public.turnos for insert to anon with check (true);

-- DEMO: permisos abiertos para panel del centro. Reemplazar con Supabase Auth antes de usar datos reales.
create policy "centro_pacientes_demo" on public.pacientes for all to anon using (true) with check (true);
create policy "centro_historias_demo" on public.historias_clinicas for all to anon using (true) with check (true);
create policy "centro_archivos_demo" on public.archivos_paciente for all to anon using (true) with check (true);
