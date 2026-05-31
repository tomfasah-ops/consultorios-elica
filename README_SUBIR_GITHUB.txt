Consultorios Elica - app.js filtrado

Qué hacer:
1. Descomprimir el ZIP.
2. Copiar app.js y reemplazar el app.js actual del proyecto en GitHub.
3. Subir los cambios a GitHub.
4. Vercel debería redeployar automáticamente.

Cambios incluidos:
- Se oculta el cuadro "Especialidades activas" dentro de Configuración del centro.
- En Trabajo en el centro aparecen dos opciones: Administración y Soy profesional.
- Administración conserva el ingreso actual con admin@elica.com / Elica2026!.
- En Configuración del centro se agrega "Usuarios para profesionales".
- Cada profesional puede entrar con usuario y contraseña creados por administración.
- El profesional ve su agenda, abre historia clínica y puede finalizar atención.
- Al finalizar, el turno queda como "Atendido" y cambia de color.

Nota importante:
Este app.js está armado para trabajar con localStorage y detectar varias estructuras posibles de turnos/profesionales. Si tu proyecto usa nombres de archivos o claves muy distintas, puede requerir un ajuste mínimo.
