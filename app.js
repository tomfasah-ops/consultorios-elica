const SUPABASE_URL='https://eyleaxyvbugbhzpvwnpk.supabase.co';
const SUPABASE_KEY='sb_publishable_QXhtZJKQmiTC8BmmxHpp6A_VjyWqwZK';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const ADMIN_USER='admin@elica.com';
const ADMIN_PASS='Elica2026!';
const $=id=>document.getElementById(id);
function show(id,msg,type='success'){const el=$(id); if(!el)return; el.className='msg '+type; el.innerHTML=msg; el.style.display='block';}
function auth(){return localStorage.getItem('elica_admin')==='ok'}
function guard(){if(!auth()) location.href='login-centro.html'}
function logout(){localStorage.removeItem('elica_admin'); location.href='index.html'}
function times(){let arr=[]; for(let h=8;h<20;h++){for(let m=0;m<60;m+=10){arr.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)}} return arr}
function today(){return new Date().toISOString().slice(0,10)}
function addDays(dateStr, days){const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10)}
function diaNombre(dateStr){return new Date(dateStr+'T00:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'2-digit',month:'2-digit'})}
async function getEspecialidades(){
  const {data,error}=await sb.from('especialidades').select('*').order('nombre');
  let lista=(data||[]).filter(e=>e.activo!==false);
  if(error||lista.length===0) lista=['Cardiología','Psicología','Clínica médica','Kinesiología','Psiquiatría'].map((nombre,i)=>({id:i+1,nombre}));
  return lista;
}
async function getProfesionales(){
  const {data,error}=await sb.from('profesionales').select('*').order('nombre');
  let lista=(data||[]).filter(p=>p.activo!==false);
  if(error||lista.length===0) lista=['Profesional 1','Profesional 2','Profesional 3','Profesional 4','Profesional 5'].map((nombre,i)=>({id:i+1,nombre,especialidad:''}));
  return lista;
}

async function getEspecialidadDeProfesional(nombre){
  if(!nombre) return '';
  try{
    const profesionales = await getProfesionales();
    const encontrado = profesionales.find(p => String(p.nombre).trim().toLowerCase() === String(nombre).trim().toLowerCase());
    return encontrado?.especialidad || '';
  }catch(e){ return ''; }
}
function evolucionCard(h){
  const fecha = esc(h.fecha || String(h.created_at||'').slice(0,10));
  const prof = esc(h.profesional || 'Profesional no especificado');
  const esp = esc(h.especialidad || 'Especialidad no especificada');
  const motivo = esc(h.motivo || '');
  const evo = esc(h.evolucion || h.descripcion || '');
  const intervencion = esc(h.intervencion || '');
  const objetivos = esc(h.objetivos || '');
  return `<article class="evo-card"><div class="evo-head"><div><b>${fecha}</b><span>${prof} · ${esp}</span></div><span class="pill confirmado">Evolución</span></div>${motivo?`<p><b>Motivo:</b><br>${motivo}</p>`:''}${evo?`<p><b>Observación clínica:</b><br>${evo}</p>`:''}${intervencion?`<p><b>Intervención realizada:</b><br>${intervencion}</p>`:''}${objetivos?`<p><b>Próximos objetivos:</b><br>${objetivos}</p>`:''}</article>`;
}

async function loadTurnosForm(){
  const esp=$('especialidad'), prof=$('profesional'), hora=$('hora');
  if(!esp)return;
  esp.innerHTML='<option value="">Seleccionar especialidad</option>';
  prof.innerHTML='<option value="">Seleccionar profesional</option>';
  hora.innerHTML='<option value="">Seleccionar horario</option>';
  times().forEach(t=>hora.add(new Option(t,t)));
  (await getEspecialidades()).forEach(e=>esp.add(new Option(e.nombre,e.nombre)));
  (await getProfesionales()).forEach(p=>prof.add(new Option(p.especialidad?`${p.nombre} - ${p.especialidad}`:p.nombre,p.nombre)));
}
async function horariosOcupados(){const fecha=$('fecha')?.value, profesional=$('profesional')?.value; if(!fecha||!profesional||!$('hora'))return; const {data}=await sb.from('turnos').select('hora').eq('fecha',fecha).eq('profesional',profesional).neq('estado','cancelado'); const ocupados=new Set((data||[]).map(x=>String(x.hora).slice(0,5))); [...$('hora').options].forEach(o=>{if(!o.value)return; o.disabled=ocupados.has(o.value); o.textContent=ocupados.has(o.value)?`${o.value} - ocupado`:o.value});}
async function reservar(e){e.preventDefault(); const data={paciente_nombre:$('nombre').value.trim(),dni:$('dni').value.trim(),telefono:$('telefono').value.trim(),especialidad:$('especialidad').value,profesional:$('profesional').value,fecha:$('fecha').value,hora:$('hora').value,obra_social:$('obra_social').value.trim(),motivo_consulta:$('motivo').value.trim(),estado:'confirmado'}; const {error}=await sb.from('turnos').insert(data); if(error){show('msg', error.message.includes('duplicate')?'Ese horario ya fue reservado. Elegí otro horario.':error.message,'error'); await horariosOcupados(); return;} show('msg',`✅ <b>Tu turno ha sido reservado correctamente.</b><br><br>Profesional: ${data.profesional}<br>Especialidad: ${data.especialidad}<br>Fecha: ${data.fecha}<br>Hora: ${data.hora} hs<br>Dirección: Hermanos Ros 3246, Lanús Oeste`,'success'); $('turnoForm').reset(); await horariosOcupados();}
async function login(e){
  e.preventDefault();
  const usuario=$('usuario').value.trim().toLowerCase();
  const clave=$('clave').value.trim();
  const usuariosPermitidos=['admin@elica.com','admin'];
  const clavesPermitidas=['Elica2026!','1234'];
  if(usuariosPermitidos.includes(usuario) && clavesPermitidas.includes(clave)){
    localStorage.setItem('elica_admin','ok');
    location.href='panel.html';
  } else {
    show('loginMsg','Usuario o contraseña incorrectos. Probá usuario: admin@elica.com y clave: Elica2026!','error');
  }
}
async function agenda(){if(!$('calendarWrap')&&!$('agendaBody'))return; guard(); await cargarFiltroProfesionales(); const desde=$('agendaDesde')?.value||today(); const vista=$('agendaVista')?.value||'drapp'; const profesional=$('agendaProfesional')?.value||''; const hasta=(vista==='dia'||vista==='drapp')?addDays(desde,1):addDays(desde,7); let q=sb.from('turnos').select('*').gte('fecha',desde).lt('fecha',hasta).neq('estado','cancelado').order('fecha',{ascending:true}).order('hora',{ascending:true}); if(profesional) q=q.eq('profesional',profesional); const {data,error}=await q; if(error){show('msg',error.message,'error');return} renderAgenda(data||[],desde,vista);}
async function cargarFiltroProfesionales(){const sel=$('agendaProfesional'); if(!sel||sel.dataset.loaded)return; (await getProfesionales()).forEach(p=>sel.add(new Option(p.nombre,p.nombre))); sel.dataset.loaded='1';}
function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function estadoClass(estado){estado=String(estado||'confirmado').toLowerCase(); if(estado.includes('cancel'))return 'cancelado'; if(estado.includes('aus'))return 'ausente'; if(estado.includes('asist'))return 'asistio'; return 'confirmado';}
function actualizarStats(turnos){const box=$('agendaStats'); if(!box)return; const total=turnos.length; const profs=new Set(turnos.map(t=>t.profesional).filter(Boolean)).size; const esp=new Set(turnos.map(t=>t.especialidad).filter(Boolean)).size; box.innerHTML=`<div class="stat-card"><b>${total}</b><span>Turnos del día</span></div><div class="stat-card"><b>${profs}</b><span>Profesionales con turnos</span></div><div class="stat-card"><b>${esp}</b><span>Especialidades</span></div>`;}
function abrirTurno(id){
  const raw=sessionStorage.getItem('turnosAgenda')||'[]';
  const turnos=JSON.parse(raw);
  const t=turnos.find(x=>String(x.id)===String(id));
  if(!t)return;
  $('modalPaciente').textContent=t.paciente_nombre||'Paciente';
  $('modalContenido').innerHTML=`<div class="modal-grid"><p><b>Fecha:</b> ${esc(t.fecha)}</p><p><b>Hora:</b> ${esc(String(t.hora).slice(0,5))} hs</p><p><b>Profesional:</b> ${esc(t.profesional)}</p><p><b>Especialidad:</b> ${esc(t.especialidad)}</p><p><b>Teléfono:</b> ${esc(t.telefono)}</p><p><b>DNI:</b> ${esc(t.dni)}</p><p><b>Obra social:</b> ${esc(t.obra_social)}</p><p><b>Estado:</b> ${esc(t.estado||'confirmado')}</p></div><hr><p><b>Motivo:</b><br>${esc(t.motivo_consulta||'Sin motivo cargado')}</p><div class="modal-actions"><button class="btn ok" onclick="abrirHistoriaDesdeTurno(${t.id})">Abrir historia clínica</button><button class="btn secondary" onclick="cerrarModal()">Cerrar</button></div><div id="historiaAgendaBox"></div>`;
  $('turnoModal').classList.remove('hidden');
}
async function obtenerOCrearPacienteDesdeTurno(t){
  let paciente=null;
  if(t.dni){
    const r=await sb.from('pacientes').select('*').eq('dni',t.dni).maybeSingle();
    if(r.data) paciente=r.data;
  }
  if(!paciente && t.telefono){
    const r=await sb.from('pacientes').select('*').eq('telefono',t.telefono).limit(1);
    if(r.data && r.data.length) paciente=r.data[0];
  }
  if(paciente) return paciente;
  const nuevo={nombre:t.paciente_nombre||'Paciente sin nombre',dni:t.dni||null,telefono:t.telefono||'',obra_social:t.obra_social||'',observaciones:`Paciente creado automáticamente desde turno del ${t.fecha} a las ${String(t.hora).slice(0,5)}.`};
  const {data,error}=await sb.from('pacientes').insert(nuevo).select('*').single();
  if(error) throw error;
  return data;
}
async function abrirHistoriaDesdeTurno(turnoId){
  const box=$('historiaAgendaBox');
  if(box) box.innerHTML='<p class="small">Cargando historia clínica...</p>';
  const raw=sessionStorage.getItem('turnosAgenda')||'[]';
  const turnos=JSON.parse(raw);
  const t=turnos.find(x=>String(x.id)===String(turnoId));
  if(!t || !box) return;
  try{
    const paciente=await obtenerOCrearPacienteDesdeTurno(t);
    const {data:hist,error}=await sb.from('historias_clinicas').select('*').eq('paciente_id',paciente.id).order('fecha',{ascending:false}).order('created_at',{ascending:false});
    if(error) throw error;
    const especialidadProfesional = t.especialidad || await getEspecialidadDeProfesional(t.profesional);
    box.innerHTML=`
      <hr>
      <section class="hc-shell">
        <div class="hc-header">
          <div>
            <span class="small">Historia clínica compartida</span>
            <h3>${esc(paciente.nombre)}</h3>
            <p>DNI ${esc(paciente.dni||'No informado')} · ${esc(paciente.telefono||'Sin teléfono')}</p>
          </div>
          <div class="hc-badge">Equipo Elica</div>
        </div>
        <div class="hc-tabs">
          <button class="tab active">Evoluciones</button>
          <a class="tab" href="pacientes.html">Ficha completa</a>
        </div>
        <div class="hc-two-cols">
          <div class="hc-panel">
            <h4>Nueva evolución</h4>
            <div class="modal-grid">
              <div><label>Profesional</label><input id="agendaProfesionalHC" value="${esc(t.profesional||'')}"></div>
              <div><label>Especialidad</label><input id="agendaEspecialidadHC" value="${esc(especialidadProfesional||'')}"></div>
            </div>
            <label>Motivo / demanda actual</label>
            <textarea id="agendaMotivo" placeholder="Motivo de consulta o situación trabajada hoy"></textarea>
            <label>Observación clínica</label>
            <textarea id="agendaEvolucion" placeholder="Registro clínico, evolución, conducta observada, respuesta al tratamiento"></textarea>
            <label>Intervención realizada</label>
            <textarea id="agendaIntervencion" placeholder="Técnicas, indicaciones, intervenciones o abordajes realizados"></textarea>
            <label>Próximos objetivos</label>
            <textarea id="agendaObjetivos" placeholder="Objetivos para próximos encuentros, indicaciones, seguimiento"></textarea>
            <div class="modal-actions">
              <button class="btn ok" onclick="guardarHistoriaAgenda(${paciente.id},${turnoId})">Guardar evolución</button>
              <button class="btn secondary" onclick="cerrarModal()">Cerrar</button>
            </div>
            <div id="agendaHistMsg" class="msg"></div>
          </div>
          <div class="hc-panel">
            <h4>Evoluciones anteriores</h4>
            <p class="small">Ordenadas por fecha. Todos los profesionales del centro pueden ver el recorrido clínico del paciente.</p>
            <div class="timeline">${(hist||[]).map(evolucionCard).join('')||'<div class="empty-state">Sin evoluciones previas.</div>'}</div>
          </div>
        </div>
      </section>`;
  }catch(err){
    box.innerHTML=`<div class="msg error" style="display:block">${esc(err.message)}</div>`;
  }
}
async function guardarHistoriaAgenda(pacienteId,turnoId){
  const raw=sessionStorage.getItem('turnosAgenda')||'[]';
  const turnos=JSON.parse(raw);
  const t=turnos.find(x=>String(x.id)===String(turnoId));
  const motivo=$('agendaMotivo')?.value.trim()||'';
  const evolucion=$('agendaEvolucion')?.value.trim()||'';
  const intervencion=$('agendaIntervencion')?.value.trim()||'';
  const objetivos=$('agendaObjetivos')?.value.trim()||'';
  const profesional=$('agendaProfesionalHC')?.value.trim() || t?.profesional || '';
  const especialidad=$('agendaEspecialidadHC')?.value.trim() || t?.especialidad || await getEspecialidadDeProfesional(profesional);
  if(!motivo && !evolucion && !intervencion && !objetivos){show('agendaHistMsg','Escribí al menos un campo de la evolución antes de guardar.','error');return;}
  const row={paciente_id:pacienteId,profesional,especialidad,motivo,evolucion,intervencion,objetivos,fecha:today()};
  const {error}=await sb.from('historias_clinicas').insert(row);
  if(error){show('agendaHistMsg',error.message,'error');return;}
  show('agendaHistMsg','Evolución guardada correctamente.','success');
  await abrirHistoriaDesdeTurno(turnoId);
}
function cerrarModal(){ $('turnoModal')?.classList.add('hidden'); }
async function profesionalesParaAgenda(turnos){let profs=(await getProfesionales()).map(p=>p.nombre); const usados=[...new Set(turnos.map(t=>t.profesional).filter(Boolean))]; usados.forEach(p=>{if(!profs.includes(p))profs.push(p)}); const filtro=$('agendaProfesional')?.value||''; if(filtro)profs=profs.filter(p=>p===filtro); return profs;}
async function renderAgenda(turnos,desde,vista){sessionStorage.setItem('turnosAgenda',JSON.stringify(turnos)); const lista=$('agendaLista'), cal=$('calendarWrap'), tbody=$('agendaBody'); actualizarStats(turnos); if(vista==='lista'){if(lista)lista.classList.remove('hidden'); if(cal)cal.classList.add('hidden'); if(tbody)tbody.innerHTML=turnos.map(t=>`<tr><td>${esc(t.fecha)}</td><td>${esc(String(t.hora).slice(0,5))}</td><td>${esc(t.paciente_nombre)}</td><td>${esc(t.telefono)}</td><td>${esc(t.especialidad)}</td><td>${esc(t.profesional)}</td><td><span class="pill ${estadoClass(t.estado)}">${esc(t.estado||'confirmado')}</span></td></tr>`).join('')||'<tr><td colspan="7">No hay turnos cargados.</td></tr>'; return;} if(lista)lista.classList.add('hidden'); if(cal)cal.classList.remove('hidden'); if(vista==='drapp'){const profs=await profesionalesParaAgenda(turnos); const cols=Math.max(profs.length,1); let html=`<div class="drapp-grid" style="--cols:${cols}"><div class="drapp-head"><div class="time-head">Hora</div>${profs.map(p=>`<div class="pro-head"><b>${esc(p)}</b><span>${esc(diaNombre(desde))}</span></div>`).join('')}</div>`; for(const hora of times()){html+=`<div class="drapp-row"><div class="calendar-time">${hora}</div>`; for(const prof of profs){const eventos=turnos.filter(t=>t.fecha===desde && String(t.hora).slice(0,5)===hora && t.profesional===prof); html+=`<div class="slot ${eventos.length?'busy':'free'}">${eventos.map(t=>`<button class="event drapp-event ${estadoClass(t.estado)}" onclick="abrirTurno(${t.id})"><b>${esc(t.paciente_nombre)}</b><small>${esc(t.especialidad)}</small><small>${esc(t.telefono||'')}</small></button>`).join('')}</div>`;} html+='</div>';} html+='</div>'; if(cal)cal.innerHTML=html; return;} const dias=Array.from({length:1},(_,i)=>addDays(desde,i)); const cols=dias.length; let html=`<div class="calendar-grid" style="--cols:${cols}"><div class="calendar-head"><div>Hora</div>${dias.map(d=>`<div>${diaNombre(d)}</div>`).join('')}</div>`; for(const hora of times()){html+=`<div class="calendar-row"><div class="calendar-time">${hora}</div>`; for(const dia of dias){const eventos=turnos.filter(t=>t.fecha===dia && String(t.hora).slice(0,5)===hora); html+=`<div>${eventos.map(t=>`<button class="event" onclick="abrirTurno(${t.id})"><b>${esc(t.paciente_nombre)}</b><small>${esc(t.profesional)}</small><small>${esc(t.especialidad)}</small><small>${esc(t.telefono||'')}</small></button>`).join('')}</div>`;} html+='</div>';} html+='</div>'; if(cal)cal.innerHTML=html;}
async function loadConfig(){if(!$('profBody'))return; guard(); await llenarSelectsConfig(); await listarProfesionales(); await listarEspecialidades(); await listarHorarios();}
async function llenarSelectsConfig(){const esp=$('profEspecialidad'), hp=$('horProfesional'); if(esp){esp.innerHTML=''; (await getEspecialidades()).forEach(e=>esp.add(new Option(e.nombre,e.nombre)));} if(hp){hp.innerHTML=''; (await getProfesionales()).forEach(p=>hp.add(new Option(p.nombre,p.nombre)));}}
async function listarProfesionales(){const body=$('profBody'); if(!body)return; const data=await getProfesionales(); body.innerHTML=data.map(p=>`<tr><td>${p.nombre}</td><td>${p.especialidad||''}</td><td><button class="action-link" onclick="desactivar('profesionales',${p.id})">Desactivar</button></td></tr>`).join('')||'<tr><td colspan="3">Sin profesionales.</td></tr>';}
async function listarEspecialidades(){const body=$('espBody'); if(!body)return; const data=await getEspecialidades(); body.innerHTML=data.map(e=>`<tr><td>${e.nombre}</td><td><button class="action-link" onclick="desactivar('especialidades',${e.id})">Desactivar</button></td></tr>`).join('')||'<tr><td colspan="2">Sin especialidades.</td></tr>';}
async function listarHorarios(){const body=$('horBody'); if(!body)return; const {data,error}=await sb.from('horarios').select('*').order('profesional').order('dia_semana'); if(error){body.innerHTML=`<tr><td colspan="5">${error.message}</td></tr>`;return} const lista=(data||[]).filter(h=>h.activo!==false); body.innerHTML=lista.map(h=>`<tr><td>${h.profesional}</td><td>${h.dia_semana}</td><td>${String(h.hora_inicio).slice(0,5)}</td><td>${String(h.hora_fin).slice(0,5)}</td><td><button class="action-link" onclick="desactivar('horarios',${h.id})">Desactivar</button></td></tr>`).join('')||'<tr><td colspan="5">Sin horarios cargados.</td></tr>';}
async function crearProfesional(e){e.preventDefault(); const row={nombre:$('profNombre').value.trim(),especialidad:$('profEspecialidad').value,activo:true}; const {error}=await sb.from('profesionales').insert(row); if(error)show('profMsg',error.message,'error'); else{show('profMsg','Profesional guardado.','success'); e.target.reset(); await loadConfig();}}
async function crearEspecialidad(e){e.preventDefault(); const row={nombre:$('espNombre').value.trim(),activo:true}; const {error}=await sb.from('especialidades').insert(row); if(error)show('espMsg',error.message,'error'); else{show('espMsg','Especialidad guardada.','success'); e.target.reset(); await loadConfig();}}
async function crearHorario(e){e.preventDefault(); const row={profesional:$('horProfesional').value,dia_semana:$('horDia').value,hora_inicio:$('horInicio').value,hora_fin:$('horFin').value,activo:true}; const {error}=await sb.from('horarios').insert(row); if(error)show('horMsg',error.message,'error'); else{show('horMsg','Horario guardado.','success'); e.target.reset(); await loadConfig();}}
async function desactivar(tabla,id){if(!confirm('¿Desactivar este ítem?'))return; const {error}=await sb.from(tabla).update({activo:false}).eq('id',id); if(error)alert(error.message); else loadConfig();}
async function pacientes(){const body=$('pacientesBody'); if(!body)return; guard(); const {data}=await sb.from('pacientes').select('*').order('created_at',{ascending:false}); body.innerHTML=(data||[]).map(p=>`<tr><td>${p.nombre}</td><td>${p.dni||''}</td><td>${p.telefono||''}</td><td>${p.obra_social||''}</td><td><button class="btn" onclick="verPaciente(${p.id},'${(p.nombre||'').replaceAll("'",'')}')">Abrir</button></td></tr>`).join('')||'<tr><td colspan="5">Sin pacientes.</td></tr>';}
async function crearPaciente(e){e.preventDefault(); const p={nombre:$('p_nombre').value,dni:$('p_dni').value,telefono:$('p_tel').value,email:$('p_email').value,obra_social:$('p_os').value,observaciones:$('p_obs').value}; const {error}=await sb.from('pacientes').insert(p); if(error)show('pmsg',error.message,'error'); else{show('pmsg','Paciente creado correctamente.','success'); e.target.reset(); pacientes();}}
async function verPaciente(id,nombre){
  $('detalle').classList.remove('hidden');
  $('pacienteTitulo').textContent=nombre;
  $('paciente_id').value=id;
  const {data}=await sb.from('historias_clinicas').select('*').eq('paciente_id',id).order('fecha',{ascending:false}).order('created_at',{ascending:false});
  $('histBody').innerHTML=(data||[]).map(evolucionCard).join('')||'<div class="empty-state">Sin evoluciones.</div>';
  const {data:ar}=await sb.from('archivos_paciente').select('*').eq('paciente_id',id).order('created_at',{ascending:false});
  $('archBody').innerHTML=(ar||[]).map(a=>`<tr><td>${esc(a.nombre_archivo)}</td><td>${esc(a.descripcion||'')}</td><td>${a.url_archivo?`<a href="${esc(a.url_archivo)}" target="_blank">Abrir</a>`:''}</td></tr>`).join('')||'<tr><td colspan="3">Sin adjuntos.</td></tr>';
}
async function crearHistoria(e){
  e.preventDefault();
  const profesional=$('h_prof').value.trim();
  const especialidad=$('h_esp')?.value.trim() || await getEspecialidadDeProfesional(profesional);
  const row={paciente_id:$('paciente_id').value,profesional,especialidad,motivo:$('h_motivo')?.value||'',evolucion:$('h_evo').value,intervencion:$('h_intervencion')?.value||'',objetivos:$('h_objetivos')?.value||'',fecha:today()};
  const {error}=await sb.from('historias_clinicas').insert(row);
  if(error)show('hmsg',error.message,'error'); else{show('hmsg','Evolución guardada.','success'); verPaciente(row.paciente_id,$('pacienteTitulo').textContent); e.target.reset();}
}
async function crearArchivo(e){e.preventDefault(); const row={paciente_id:$('paciente_id').value,nombre_archivo:$('a_nombre').value,url_archivo:$('a_url').value,descripcion:$('a_desc').value}; const {error}=await sb.from('archivos_paciente').insert(row); if(error)show('amsg',error.message,'error'); else{show('amsg','Archivo registrado.','success'); verPaciente(row.paciente_id,$('pacienteTitulo').textContent); e.target.reset();}}
document.addEventListener('DOMContentLoaded',()=>{if($('agendaDesde')) $('agendaDesde').value=today(); loadTurnosForm(); agenda(); pacientes(); loadConfig(); $('turnoForm')?.addEventListener('submit',reservar); $('fecha')?.addEventListener('change',horariosOcupados); $('profesional')?.addEventListener('change',horariosOcupados); $('loginForm')?.addEventListener('submit',login); $('agendaBuscar')?.addEventListener('click',agenda); $('diaAnterior')?.addEventListener('click',()=>{const d=$('agendaDesde'); d.value=addDays(d.value||today(),-1); agenda();}); $('diaHoy')?.addEventListener('click',()=>{const d=$('agendaDesde'); d.value=today(); agenda();}); $('diaSiguiente')?.addEventListener('click',()=>{const d=$('agendaDesde'); d.value=addDays(d.value||today(),1); agenda();}); $('agendaProfesional')?.addEventListener('change',agenda); $('agendaVista')?.addEventListener('change',agenda); $('pacienteForm')?.addEventListener('submit',crearPaciente); $('histForm')?.addEventListener('submit',crearHistoria); $('archForm')?.addEventListener('submit',crearArchivo); $('profForm')?.addEventListener('submit',crearProfesional); $('espForm')?.addEventListener('submit',crearEspecialidad); $('horForm')?.addEventListener('submit',crearHorario);});
