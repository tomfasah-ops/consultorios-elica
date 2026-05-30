CONSULTORIOS ELICA - PLATAFORMA CENTRO

ARCHIVOS:
- index.html: pantalla inicial con 2 accesos.
- turnos.html: ingreso paciente para reservar turno.
- login-centro.html: acceso privado del equipo.
- panel.html: menú del centro.
- agenda.html: agenda privada.
- pacientes.html: gestión básica de pacientes, historia clínica y adjuntos.
- styles.css: estilos generales.
- app.js: lógica de Supabase, turnos, agenda, panel y pacientes.
- SQL-COMPLETO-SUPABASE.sql: tablas necesarias.

PASOS:
1) Subir el ZIP a Netlify.
2) En Supabase ejecutar SQL-COMPLETO-SUPABASE.sql desde SQL Editor.
3) Confirmar que las tablas se crearon.
4) Probar reserva desde turnos.html.
5) Entrar al centro desde login-centro.html.

ACCESO AL CENTRO EN ESTA VERSION:
Usuario: admin@elica.com
Clave: Elica2026!

IMPORTANTE:
Esta primera versión usa una clave simple en el navegador para acceso al panel. Sirve para prueba y demo.
Para uso real con historias clínicas y archivos, hay que activar Supabase Auth con usuarios reales y políticas RLS estrictas.
No uses historias clínicas reales hasta implementar login seguro.


NUEVO MODULO: HISTORIA CLINICA DESDE AGENDA
- En agenda.html, al hacer clic sobre un turno se abre el detalle del paciente.
- Botón: Abrir historia clínica.
- Si el paciente no existe en la tabla pacientes, se crea automáticamente con DNI/teléfono del turno.
- Permite guardar evolución clínica desde la misma agenda.
- También se puede entrar a pacientes.html para ficha completa y adjuntos.

SI APARECE ERROR DE PERMISOS:
Ejecutar SQL-HISTORIA-CLINICA-AGENDA.sql en Supabase > SQL Editor.
