/* =========================================================
   CONSULTORIOS ELICA - app.js FILTRADO
   Cambios incluidos:
   1) Oculta/elimina el cuadro "Especialidades activas".
   2) En "Trabajo en el centro" agrega dos accesos:
      a) Administración: mantiene el ingreso administrativo.
      b) Soy profesional: login propio por usuario/contraseña.
   3) Administración puede crear usuario/contraseña por profesional.
   4) Profesional ve su agenda, abre historia clínica y marca atendido.
   5) Al finalizar atención, el turno cambia de color y queda como "Atendido".
   ========================================================= */

(function () {
  "use strict";

  const LS = {
    professionalUsers: "elica_professional_users",
    currentProfessional: "elica_current_professional",
    attendance: "elica_professional_attendance",
    clinicalNotes: "elica_clinical_notes"
  };

  const ADMIN_USER = "admin@elica.com";
  const ADMIN_PASS = "Elica2026!";

  function $id(id) { return document.getElementById(id); }
  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function normalizeText(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function appRoot() {
    return $id("app") || $id("root") || document.querySelector("main") || document.body;
  }

  function buttonClass() { return "elica-btn"; }

  function injectStyles() {
    if ($id("elica-professional-style")) return;
    const style = document.createElement("style");
    style.id = "elica-professional-style";
    style.textContent = `
      :root{--elica-bg:#eef8fb;--elica-card:#ffffff;--elica-primary:#38a9c7;--elica-primary-dark:#247f99;--elica-text:#17323b;--elica-muted:#64748b;--elica-border:#dbeafe;--elica-ok:#dff7e8;--elica-ok-border:#8be0a8;--elica-warn:#fff7ed;}
      body{background:var(--elica-bg);}
      .elica-wrap{max-width:1100px;margin:0 auto;padding:28px 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--elica-text);}
      .elica-login{min-height:82vh;display:flex;align-items:center;justify-content:center;padding:22px;}
      .elica-card{background:var(--elica-card);border:1px solid var(--elica-border);border-radius:24px;padding:24px;box-shadow:0 18px 45px rgba(15,78,96,.10);margin-bottom:18px;}
      .elica-card h1,.elica-card h2,.elica-card h3{margin-top:0;color:var(--elica-text);}
      .elica-muted{color:var(--elica-muted);font-size:.95rem;}
      .elica-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;}
      .elica-choice{border:1px solid var(--elica-border);border-radius:20px;padding:22px;background:#fff;cursor:pointer;transition:.18s;min-height:150px;text-align:left;}
      .elica-choice:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(15,78,96,.12);border-color:var(--elica-primary);}
      .elica-label{display:block;font-weight:700;margin:12px 0 6px;}
      .elica-input,.elica-select,.elica-textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:14px;padding:12px 13px;font-size:1rem;background:#fff;}
      .elica-textarea{min-height:150px;resize:vertical;}
      .elica-btn{border:0;border-radius:14px;padding:12px 16px;background:var(--elica-primary);color:white;font-weight:800;cursor:pointer;margin:10px 8px 0 0;box-shadow:0 8px 18px rgba(56,169,199,.25);}
      .elica-btn:hover{background:var(--elica-primary-dark);}
      .elica-btn.secondary{background:#e2e8f0;color:#17323b;box-shadow:none;}
      .elica-btn.danger{background:#ef4444;}
      .elica-list{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
      .elica-item{border:1px solid var(--elica-border);border-radius:18px;padding:14px;background:#fff;}
      .elica-turno{cursor:pointer;transition:.15s;}
      .elica-turno:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(15,78,96,.09);}
      .elica-turno.atendido{background:var(--elica-ok);border-color:var(--elica-ok-border);}
      .elica-pill{display:inline-block;border-radius:999px;padding:4px 10px;font-size:.82rem;font-weight:800;background:#e0f2fe;color:#036786;margin-top:8px;}
      .elica-pill.ok{background:#bbf7d0;color:#166534;}
      .elica-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;}
      .elica-hidden{display:none!important;}
    `;
    document.head.appendChild(style);
  }

  function getProfessionalUsers() { return readJSON(LS.professionalUsers, []); }
  function saveProfessionalUsers(users) { writeJSON(LS.professionalUsers, users); }
  function getAttendance() { return readJSON(LS.attendance, {}); }
  function saveAttendance(obj) { writeJSON(LS.attendance, obj); }
  function getClinicalNotes() { return readJSON(LS.clinicalNotes, {}); }
  function saveClinicalNotes(obj) { writeJSON(LS.clinicalNotes, obj); }

  function allStorageArrays() {
    const arr = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = readJSON(key, null);
      if (Array.isArray(value)) arr.push({ key, value });
    }
    return arr;
  }

  function getProfessionals() {
    const likelyKeys = ["elica_professionals", "professionals", "profesionales", "elica_profesionales", "activeProfessionals", "profesionalesActivos"];
    let found = [];
    likelyKeys.forEach(key => {
      const value = readJSON(key, []);
      if (Array.isArray(value)) found = found.concat(value);
    });

    if (!found.length) {
      allStorageArrays().forEach(({ value }) => {
        value.forEach(item => {
          const text = normalizeText(JSON.stringify(item));
          if (text.includes("profesional") || item?.especialidad || item?.matricula) found.push(item);
        });
      });
    }

    const cleaned = found
      .map((p, index) => ({
        id: String(p.id ?? p.professionalId ?? p.profesionalId ?? p.dni ?? p.email ?? p.nombre ?? p.name ?? `prof-${index}`),
        name: String(p.nombre ?? p.name ?? p.fullName ?? p.apellidoNombre ?? p.profesional ?? p.email ?? `Profesional ${index + 1}`),
        raw: p,
        active: p.activo !== false && p.active !== false && p.estado !== "inactivo"
      }))
      .filter(p => p.active);

    const map = new Map();
    cleaned.forEach(p => map.set(p.id + "|" + p.name, p));
    return [...map.values()];
  }

  function getAppointments() {
    const likelyKeys = ["elica_appointments", "appointments", "turnos", "elica_turnos", "agenda", "elica_agenda"];
    let found = [];
    likelyKeys.forEach(key => {
      const value = readJSON(key, []);
      if (Array.isArray(value)) found = found.concat(value.map(v => ({ ...v, __sourceKey: key })));
    });

    if (!found.length) {
      allStorageArrays().forEach(({ key, value }) => {
        value.forEach(item => {
          const text = normalizeText(JSON.stringify(item));
          if (text.includes("turno") || text.includes("paciente") || item?.fecha || item?.hora) {
            found.push({ ...item, __sourceKey: key });
          }
        });
      });
    }

    return found.map((t, index) => {
      const patient = t.paciente || t.patientName || t.nombrePaciente || t.pacienteNombre || t.nombre || t.fullName || "Paciente";
      const professionalId = String(t.professionalId ?? t.profesionalId ?? t.idProfesional ?? t.professional_id ?? "");
      const professionalName = String(t.professionalName ?? t.profesionalNombre ?? t.profesional ?? t.professional ?? "");
      const date = t.fecha || t.date || t.dia || "";
      const time = t.hora || t.time || t.hour || "";
      const id = String(t.id ?? t.turnoId ?? `${date}-${time}-${patient}-${professionalId || professionalName}-${index}`);
      return { ...t, id, patient, professionalId, professionalName, date, time };
    });
  }

  function saveAppointmentUpdate(turnoId, changes) {
    const keys = ["elica_appointments", "appointments", "turnos", "elica_turnos", "agenda", "elica_agenda"];
    keys.forEach(key => {
      const list = readJSON(key, null);
      if (!Array.isArray(list)) return;
      let changed = false;
      const updated = list.map((t, index) => {
        const patient = t.paciente || t.patientName || t.nombrePaciente || t.pacienteNombre || t.nombre || t.fullName || "Paciente";
        const professionalId = String(t.professionalId ?? t.profesionalId ?? t.idProfesional ?? t.professional_id ?? "");
        const professionalName = String(t.professionalName ?? t.profesionalNombre ?? t.profesional ?? t.professional ?? "");
        const date = t.fecha || t.date || t.dia || "";
        const time = t.hora || t.time || t.hour || "";
        const id = String(t.id ?? t.turnoId ?? `${date}-${time}-${patient}-${professionalId || professionalName}-${index}`);
        if (String(id) === String(turnoId)) { changed = true; return { ...t, ...changes }; }
        return t;
      });
      if (changed) writeJSON(key, updated);
    });
  }

  function hideEspecialidadesActivas() {
    const candidates = [...document.querySelectorAll("section, article, .card, .panel, .box, div")];
    candidates.forEach(el => {
      const text = normalizeText(el.innerText || el.textContent || "");
      if (text.includes("especialidades activas") && text.length < 900) {
        el.classList.add("elica-hidden");
        el.style.display = "none";
      }
    });
  }

  function renderTrabajoCentroOpciones() {
    injectStyles();
    const root = appRoot();
    root.innerHTML = `
      <div class="elica-login">
        <div class="elica-card" style="max-width:780px;width:100%;">
          <h1>Trabajo en el centro</h1>
          <p class="elica-muted">Elegí el tipo de ingreso.</p>
          <div class="elica-grid">
            <button class="elica-choice" type="button" onclick="ElicaCentro.renderAdminLogin()">
              <h2>Administración</h2>
              <p class="elica-muted">Ingresar al panel del centro como hasta ahora, sin modificar el flujo administrativo.</p>
            </button>
            <button class="elica-choice" type="button" onclick="ElicaCentro.renderProfessionalLogin()">
              <h2>Soy profesional</h2>
              <p class="elica-muted">Ingreso privado para que cada profesional vea su agenda y registre la atención.</p>
            </button>
          </div>
        </div>
      </div>`;
  }

  function renderAdminLogin() {
    injectStyles();
    const root = appRoot();
    root.innerHTML = `
      <div class="elica-login">
        <div class="elica-card" style="max-width:430px;width:100%;">
          <h1>Administración</h1>
          <p class="elica-muted">Acceso privado del equipo.</p>
          <label class="elica-label">Usuario</label>
          <input id="adminUser" class="elica-input" autocomplete="username" value="${ADMIN_USER}">
          <label class="elica-label">Contraseña</label>
          <input id="adminPass" class="elica-input" type="password" autocomplete="current-password">
          <button class="elica-btn" onclick="ElicaCentro.adminLogin()">Ingresar</button>
          <button class="elica-btn secondary" onclick="ElicaCentro.renderTrabajoCentroOpciones()">Volver</button>
          <p class="elica-muted">Usuario: ${ADMIN_USER} · Clave: ${ADMIN_PASS}</p>
        </div>
      </div>`;
  }

  function adminLogin() {
    const user = $id("adminUser")?.value?.trim();
    const pass = $id("adminPass")?.value?.trim();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.setItem("elica_admin_logged", "true");
      window.location.href = "panel-centro.html";
    } else {
      alert("Usuario o contraseña incorrectos.");
    }
  }

  function renderProfessionalLogin() {
    injectStyles();
    const root = appRoot();
    root.innerHTML = `
      <div class="elica-login">
        <div class="elica-card" style="max-width:430px;width:100%;">
          <h1>Soy profesional</h1>
          <p class="elica-muted">Ingresá con el usuario y contraseña suministrados por administración.</p>
          <label class="elica-label">Usuario</label>
          <input id="professionalLoginUser" class="elica-input" autocomplete="username">
          <label class="elica-label">Contraseña</label>
          <input id="professionalLoginPass" class="elica-input" type="password" autocomplete="current-password">
          <button class="elica-btn" onclick="ElicaCentro.professionalLogin()">Ingresar</button>
          <button class="elica-btn secondary" onclick="ElicaCentro.renderTrabajoCentroOpciones()">Volver</button>
        </div>
      </div>`;
  }

  function professionalLogin() {
    const username = $id("professionalLoginUser")?.value?.trim();
    const password = $id("professionalLoginPass")?.value?.trim();
    const user = getProfessionalUsers().find(u => u.username === username && u.password === password && u.active !== false);
    if (!user) { alert("Usuario o contraseña incorrectos."); return; }
    writeJSON(LS.currentProfessional, user);
    renderProfessionalAgenda(user);
  }

  function professionalMatchesTurno(user, t) {
    const uid = normalizeText(user.professionalId);
    const uname = normalizeText(user.professionalName);
    return normalizeText(t.professionalId) === uid || normalizeText(t.professionalName) === uname || normalizeText(t.profesional) === uname;
  }

  function renderProfessionalAgenda(user) {
    injectStyles();
    const root = appRoot();
    const attendance = getAttendance();
    const turnos = getAppointments().filter(t => professionalMatchesTurno(user, t));
    root.innerHTML = `
      <div class="elica-wrap">
        <div class="elica-toolbar">
          <div>
            <h1>Agenda profesional</h1>
            <p class="elica-muted">${escapeHTML(user.professionalName || "Profesional")}</p>
          </div>
          <button class="elica-btn secondary" onclick="ElicaCentro.logoutProfessional()">Salir</button>
        </div>
        <div class="elica-card">
          <h2>Pacientes</h2>
          <p class="elica-muted">Tocá un turno para abrir la historia clínica.</p>
          <div class="elica-list">
            ${turnos.length ? turnos.map(t => {
              const attended = attendance[t.id] === "atendido" || t.estado === "atendido" || t.status === "atendido";
              return `
                <div class="elica-item elica-turno ${attended ? "atendido" : ""}" onclick="ElicaCentro.openClinicalRecord('${escapeHTML(t.id)}')">
                  <strong>${escapeHTML(t.patient)}</strong><br>
                  <span>${escapeHTML(t.date)} ${escapeHTML(t.time)}</span><br>
                  <span class="elica-pill ${attended ? "ok" : ""}">${attended ? "Atendido" : "Pendiente"}</span>
                </div>`;
            }).join("") : `<p class="elica-muted">No hay turnos cargados para este profesional.</p>`}
          </div>
        </div>
      </div>`;
  }

  function openClinicalRecord(turnoId) {
    injectStyles();
    const user = readJSON(LS.currentProfessional, null);
    const turno = getAppointments().find(t => String(t.id) === String(turnoId));
    if (!turno) { alert("No se encontró el turno."); return; }
    const notes = getClinicalNotes();
    const existingNote = notes[turnoId] || turno.historiaClinica || turno.notaClinica || "";
    appRoot().innerHTML = `
      <div class="elica-wrap">
        <div class="elica-card">
          <h1>Historia clínica</h1>
          <p><strong>Paciente:</strong> ${escapeHTML(turno.patient)}</p>
          <p><strong>Fecha y horario:</strong> ${escapeHTML(turno.date)} ${escapeHTML(turno.time)}</p>
          <p><strong>Profesional:</strong> ${escapeHTML(user?.professionalName || turno.professionalName || "")}</p>
          <label class="elica-label">Registro de atención</label>
          <textarea id="clinicalNote" class="elica-textarea" placeholder="Escribir evolución, observaciones, intervención realizada y próximos pasos...">${escapeHTML(existingNote)}</textarea>
          <button class="elica-btn" onclick="ElicaCentro.finishClinicalRecord('${escapeHTML(turnoId)}')">Finalizar atención</button>
          <button class="elica-btn secondary" onclick="ElicaCentro.backToProfessionalAgenda()">Volver</button>
        </div>
      </div>`;
  }

  function finishClinicalRecord(turnoId) {
    const note = $id("clinicalNote")?.value || "";
    const notes = getClinicalNotes();
    notes[turnoId] = note;
    saveClinicalNotes(notes);
    const attendance = getAttendance();
    attendance[turnoId] = "atendido";
    saveAttendance(attendance);
    saveAppointmentUpdate(turnoId, { historiaClinica: note, notaClinica: note, estado: "atendido", status: "atendido" });
    alert("Atención finalizada. El turno quedó marcado como atendido.");
    backToProfessionalAgenda();
  }

  function backToProfessionalAgenda() {
    const user = readJSON(LS.currentProfessional, null);
    if (user) renderProfessionalAgenda(user);
    else renderProfessionalLogin();
  }

  function logoutProfessional() {
    localStorage.removeItem(LS.currentProfessional);
    renderTrabajoCentroOpciones();
  }

  function renderProfessionalUsersAdmin(container) {
    injectStyles();
    const target = typeof container === "string" ? $id(container) : container;
    if (!target) return;
    const professionals = getProfessionals();
    const users = getProfessionalUsers();
    target.innerHTML = `
      <div class="elica-card">
        <h2>Usuarios para profesionales</h2>
        <p class="elica-muted">Creá el usuario y contraseña para que cada profesional ingrese a su agenda.</p>
        <label class="elica-label">Profesional</label>
        <select id="professionalUserProfessional" class="elica-select">
          ${professionals.length ? professionals.map(p => `<option value="${escapeHTML(p.id)}" data-name="${escapeHTML(p.name)}">${escapeHTML(p.name)}</option>`).join("") : `<option value="">Cargá primero profesionales activos</option>`}
        </select>
        <label class="elica-label">Usuario</label>
        <input id="professionalUserEmail" class="elica-input" placeholder="Ej: profesional@elica.com">
        <label class="elica-label">Contraseña</label>
        <input id="professionalUserPassword" class="elica-input" type="password" placeholder="Contraseña">
        <button class="elica-btn" onclick="ElicaCentro.createProfessionalUser()">Guardar usuario</button>
        <div class="elica-list">
          ${users.length ? users.map(u => `
            <div class="elica-item">
              <strong>${escapeHTML(u.professionalName)}</strong><br>
              <span>Usuario: ${escapeHTML(u.username)}</span>
              <br><button class="elica-btn danger" onclick="ElicaCentro.deleteProfessionalUser('${escapeHTML(u.id)}')">Eliminar</button>
            </div>`).join("") : `<p class="elica-muted">Todavía no hay usuarios cargados.</p>`}
        </div>
      </div>`;
  }

  function createProfessionalUser() {
    const select = $id("professionalUserProfessional");
    const username = $id("professionalUserEmail")?.value?.trim();
    const password = $id("professionalUserPassword")?.value?.trim();
    if (!select?.value || !username || !password) { alert("Completá profesional, usuario y contraseña."); return; }
    const professionalName = select.options[select.selectedIndex]?.dataset?.name || select.options[select.selectedIndex]?.text || "Profesional";
    const users = getProfessionalUsers();
    if (users.some(u => normalizeText(u.username) === normalizeText(username))) { alert("Ese usuario ya existe."); return; }
    users.push({ id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()), professionalId: select.value, professionalName, username, password, active: true });
    saveProfessionalUsers(users);
    alert("Usuario profesional creado correctamente.");
    mountProfessionalUsersAdmin();
  }

  function deleteProfessionalUser(id) {
    if (!confirm("¿Eliminar este usuario profesional?")) return;
    saveProfessionalUsers(getProfessionalUsers().filter(u => String(u.id) !== String(id)));
    mountProfessionalUsersAdmin();
  }

  function mountProfessionalUsersAdmin() {
    let container = $id("professional-users-admin") || $id("usuarios-profesionales-admin");
    if (!container) {
      const configTitles = [...document.querySelectorAll("h1,h2,h3,h4")].filter(h => normalizeText(h.textContent).includes("configuracion"));
      const anchor = configTitles[0]?.closest("section, .card, .panel, div") || document.querySelector("main") || document.body;
      container = document.createElement("div");
      container.id = "professional-users-admin";
      anchor.appendChild(container);
    }
    renderProfessionalUsersAdmin(container);
  }

  function init() {
    injectStyles();
    hideEspecialidadesActivas();
    setTimeout(hideEspecialidadesActivas, 500);
    setTimeout(hideEspecialidadesActivas, 1200);

    const path = window.location.pathname;
    const text = normalizeText(document.body.innerText || "");

    if (path.includes("login-centro") || (text.includes("trabajo en el centro") && text.includes("acceso privado"))) {
      renderTrabajoCentroOpciones();
      return;
    }

    if (path.includes("panel-centro") || text.includes("configuracion del centro") || text.includes("configuración del centro")) {
      setTimeout(mountProfessionalUsersAdmin, 600);
      setTimeout(hideEspecialidadesActivas, 700);
    }
  }

  window.ElicaCentro = {
    renderTrabajoCentroOpciones,
    renderAdminLogin,
    adminLogin,
    renderProfessionalLogin,
    professionalLogin,
    renderProfessionalAgenda,
    openClinicalRecord,
    finishClinicalRecord,
    backToProfessionalAgenda,
    logoutProfessional,
    renderProfessionalUsersAdmin,
    createProfessionalUser,
    deleteProfessionalUser,
    mountProfessionalUsersAdmin
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
