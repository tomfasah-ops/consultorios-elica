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
  prof.innerHTML='<option value="">Primero seleccioná una especialidad</option>';
  hora.innerHTML='<option value="">Seleccionar horario</option>';

  times().forEach(t=>hora.add(new Option(t,t)));

  const especialidades = await getEspecialidades();
  const profesionales = await getProfesionales();

  especialidades.forEach(e=>esp.add(new Option(e.nombre,e.nombre)));

  esp.addEventListener('change', async ()=>{
    prof.innerHTML='<option value="">Seleccionar profesional</option>';
    hora.innerHTML='<option value="">Seleccionar horario</option>';
    times().forEach(t=>hora.add(new Option(t,t)));

    const seleccionada = esp.value;

    profesionales
      .filter(p=>String(p.especialidad||'').trim().toLowerCase()===String(seleccionada||'').trim().toLowerCase())
      .forEach(p=>prof.add(new Option(p.nombre,p.nombre)));

    if(prof.options.length===1){
      prof.innerHTML='<option value="">No hay profesionales cargados para esta especialidad</option>';
    }

    const resumen=$('fechaSeleccionadaResumen'); if(resumen) resumen.remove();
    const box=$('miniCalendarioTurnos'); if(box) box.classList.remove('mini-cal-colapsado');
    await actualizarInfoDiasAtencion();
    await renderMiniCalendarioTurnos();
  });

  prepararInfoDiasAtencion();
  prepararMiniCalendarioTurnos();
  await actualizarInfoDiasAtencion();
  await renderMiniCalendarioTurnos();
}

const DIAS_MAP={0:'Domingo',1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes',6:'Sábado'};

function diaSemanaDeFecha(fecha){
  if(!fecha) return '';
  return DIAS_MAP[new Date(fecha+'T00:00:00').getDay()];
}

function prepararInfoDiasAtencion(){
  const prof=$('profesional');
  if(!prof || $('diasAtencionInfo')) return;
  const box=document.createElement('div');
  box.id='diasAtencionInfo';
  box.className='msg success';
  box.style.display='none';
  prof.closest('div')?.appendChild(box);
}

function prepararMiniCalendarioTurnos(){
  const fecha=$('fecha');
  if(!fecha || $('miniCalendarioTurnos')) return;

  const contenedor=document.createElement('div');
  contenedor.id='miniCalendarioTurnos';
  contenedor.className='mini-calendario-turnos';
  contenedor.innerHTML='<p class="mini-cal-title">Elegí un día habilitado para el profesional.</p><div id="miniCalendarioDias" class="mini-cal-grid"></div>';

  fecha.closest('div')?.appendChild(contenedor);

  if(!document.getElementById('miniCalendarioTurnosStyles')){
    const style=document.createElement('style');
    style.id='miniCalendarioTurnosStyles';
    style.textContent=`
      .mini-calendario-turnos{margin-top:10px;padding:12px;border:1px solid #dbe4ea;border-radius:14px;background:#f8fafc}
      .mini-cal-title{margin:0 0 10px;color:#475569;font-size:13px;font-weight:700}
      .mini-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(38px,1fr));gap:6px}

      .mini-cal-month{text-align:center;color:#0f172a;margin-bottom:4px;padding:4px;font-size:14px}
      .mini-cal-weekday{text-align:center;font-size:11px;font-weight:800;color:#475569;padding:4px 0}
      .mini-cal-empty{min-height:36px}
      .mini-cal-dia{border:1px solid #dbe4ea;border-radius:10px;padding:8px 4px;text-align:center;font-size:12px;background:#e5e7eb;color:#64748b;cursor:not-allowed}
      .mini-cal-dia b{display:block;font-size:14px;color:inherit}
      .mini-cal-dia small{display:block;font-size:10px;margin-top:2px}
      .mini-cal-dia.habilitado{background:#dcfce7;border-color:#86efac;color:#166534;cursor:pointer;font-weight:700}
      .mini-cal-dia.habilitado:hover{outline:2px solid #22c55e}
      .mini-cal-dia.seleccionado{background:#087ea4;border-color:#087ea4;color:#fff}
      .mini-cal-dia.bloqueado{background:#f1f5f9;border-color:#cbd5e1;color:#94a3b8}

      .mini-cal-colapsado{display:none!important}
      .fecha-seleccionada-resumen{margin-top:10px;padding:12px 14px;border-radius:14px;background:#e8f7ff;border:1px solid #a7dff3;color:#075985;font-size:14px;line-height:1.35}
      .mini-cal-cambiar{margin-left:8px;border:0;border-radius:999px;background:#087ea4;color:white;padding:6px 10px;font-weight:700;cursor:pointer}
      #turnoForm .grid{align-items:start;row-gap:18px}
      #turnoForm label{margin-top:6px}
      #hora{margin-top:2px}
      #msg{margin-top:18px}
      #turnoForm textarea{margin-top:6px}
      @media(max-width:720px){.mini-cal-cambiar{display:block;margin:10px 0 0;width:100%}}
      @media(max-width:720px){.mini-cal-grid{grid-template-columns:repeat(4,1fr)}}
    `;
    document.head.appendChild(style);
  }
}

async function renderMiniCalendarioTurnos(){
  const grid=$('miniCalendarioDias');
  const fechaInput=$('fecha');
  const profesional=$('profesional')?.value;
  if(!grid || !fechaInput) return;

  if(!profesional){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Seleccioná una especialidad y un profesional para ver sus días disponibles.</div>';
    return;
  }

  const horarios=await horariosDelProfesional(profesional);
  const diasHabilitados=new Set(horarios.map(h=>h.dia_semana).filter(Boolean));

  if(!diasHabilitados.size){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Este profesional todavía no tiene días de atención cargados.</div>';
    return;
  }

  const base = fechaInput.value ? new Date(fechaInput.value+'T00:00:00') : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();

  const primerDiaMes = new Date(year, month, 1);
  const ultimoDiaMes = new Date(year, month + 1, 0);
  const diasDelMes = ultimoDiaMes.getDate();

  const nombreMes = base.toLocaleDateString('es-AR',{month:'long', year:'numeric'});
  const seleccionado=fechaInput.value;

  let html=`<div class="mini-cal-month" style="grid-column:1/-1"><b>${nombreMes.charAt(0).toUpperCase()+nombreMes.slice(1)}</b></div>`;

  const encabezados=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  html += encabezados.map(d=>`<div class="mini-cal-weekday">${d}</div>`).join('');

  for(let i=0;i<primerDiaMes.getDay();i++){
    html += '<div class="mini-cal-empty"></div>';
  }

  for(let diaNum=1; diaNum<=diasDelMes; diaNum++){
    const d=new Date(year, month, diaNum);
    const iso=d.toISOString().slice(0,10);
    const diaNombre=DIAS_MAP[d.getDay()];
    const habilitado=diasHabilitados.has(diaNombre);
    const clase=habilitado?'habilitado':'bloqueado';
    const seleccionadoClase=iso===seleccionado?' seleccionado':'';

    html+=`<button type="button" class="mini-cal-dia ${clase}${seleccionadoClase}" ${habilitado?`onclick="seleccionarDiaTurno('${iso}')"`:'disabled'} title="${habilitado?'Día disponible':'El profesional no atiende este día'}">
      <b>${String(diaNum).padStart(2,'0')}</b>
      <small>${diaNombre.slice(0,3)}</small>
    </button>`;
  }

  grid.innerHTML=html;
}

async function seleccionarDiaTurno(fecha){
  const fechaInput=$('fecha');
  if(!fechaInput) return;
  fechaInput.value=fecha;
  await horariosOcupados();
  await renderMiniCalendarioTurnos();

  const box=$('miniCalendarioTurnos');
  const d=new Date(fecha+'T00:00:00');
  const fechaBonita=d.toLocaleDateString('es-AR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  if(box){
    box.classList.add('mini-cal-colapsado');
    let resumen=$('fechaSeleccionadaResumen');
    if(!resumen){
      resumen=document.createElement('div');
      resumen.id='fechaSeleccionadaResumen';
      resumen.className='fecha-seleccionada-resumen';
      box.parentNode.insertBefore(resumen, box.nextSibling);
    }
    resumen.innerHTML=`<b>Fecha seleccionada:</b> ${fechaBonita} <button type="button" class="mini-cal-cambiar" onclick="abrirMiniCalendarioTurnos()">Cambiar fecha</button>`;
  }

  const hora=$('hora');
  if(hora) hora.scrollIntoView({behavior:'smooth', block:'center'});
}

function abrirMiniCalendarioTurnos(){
  const box=$('miniCalendarioTurnos');
  if(box) box.classList.remove('mini-cal-colapsado');
}

async function horariosDelProfesional(profesional){
  if(!profesional) return [];
  const {data,error}=await sb.from('horarios')
    .select('*')
    .eq('profesional',profesional)
    .eq('activo',true)
    .order('dia_semana',{ascending:true});
  if(error) return [];
  return data||[];
}

async function actualizarInfoDiasAtencion(){
  const profesional=$('profesional')?.value;
  const box=$('diasAtencionInfo');
  if(!box) return [];
  if(!profesional){
    box.style.display='none';
    return [];
  }
  const horarios=await horariosDelProfesional(profesional);
  const dias=[...new Set(horarios.map(h=>h.dia_semana).filter(Boolean))];
  if(!dias.length){
    box.className='msg error';
    box.innerHTML='Este profesional todavía no tiene días de atención cargados.';
    box.style.display='block';
    return [];
  }
  box.className='msg success';
  box.innerHTML=`<b>Días de atención:</b> ${dias.join(' · ')}`;
  box.style.display='block';
  return horarios;
}

async function horariosOcupados(){
  const fecha=$('fecha')?.value, profesional=$('profesional')?.value, hora=$('hora');
  if(!hora) return;

  [...hora.options].forEach(o=>{
    if(!o.value)return;
    o.disabled=false;
    o.textContent=o.value;
  });

  const horarios=await actualizarInfoDiasAtencion();

  if(!fecha||!profesional){
    await renderMiniCalendarioTurnos();
    return;
  }

  const dia=diaSemanaDeFecha(fecha);
  const horariosDia=horarios.filter(h=>h.dia_semana===dia);

  if(!horariosDia.length){
    [...hora.options].forEach(o=>{if(o.value)o.disabled=true;});
    show('msg',`El profesional seleccionado no atiende los días ${dia}. Elegí un día habilitado.`, 'error');
    await renderMiniCalendarioTurnos();
    return;
  }

  const permitidos=new Set();
  for(const h of horariosDia){
    const inicio=String(h.hora_inicio).slice(0,5);
    const fin=String(h.hora_fin).slice(0,5);
    times().filter(t=>t>=inicio && t<fin).forEach(t=>permitidos.add(t));
  }

  const {data}=await sb.from('turnos')
    .select('hora')
    .eq('fecha',fecha)
    .eq('profesional',profesional)
    .neq('estado','cancelado');

  const ocupados=new Set((data||[]).map(x=>String(x.hora).slice(0,5)));

  [...hora.options].forEach(o=>{
    if(!o.value)return;
    const fueraHorario=!permitidos.has(o.value);
    const ocupado=ocupados.has(o.value);
    o.disabled=fueraHorario||ocupado;
    o.textContent=fueraHorario?`${o.value} - no atiende`:ocupado?`${o.value} - ocupado`:o.value;
  });

  await renderMiniCalendarioTurnos();
}

async function reservar(e){
  e.preventDefault();

  await horariosOcupados();

  if($('hora').selectedOptions[0]?.disabled){
    show('msg','Ese horario no está disponible para este profesional. Elegí otro día u horario.','error');
    return;
  }

  const data={paciente_nombre:$('nombre').value.trim(),dni:$('dni').value.trim(),telefono:$('telefono').value.trim(),especialidad:$('especialidad').value,profesional:$('profesional').value,fecha:$('fecha').value,hora:$('hora').value,obra_social:$('obra_social').value.trim(),motivo_consulta:$('motivo').value.trim(),estado:'confirmado'};
  const {error}=await sb.from('turnos').insert(data);
  if(error){
    show('msg', error.message.includes('duplicate')?'Ese horario ya fue reservado. Elegí otro horario.':error.message,'error');
    await horariosOcupados();
    return;
  }
  show('msg',`✅ <b>Tu turno ha sido reservado correctamente.</b><br><br>Profesional: ${data.profesional}<br>Especialidad: ${data.especialidad}<br>Fecha: ${data.fecha}<br>Hora: ${data.hora} hs<br>Dirección: Hermanos Ros 3246, Lanús Oeste`,'success');
  $('turnoForm').reset();
  await horariosOcupados();
}
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
async function agenda(){if(!$('calendarWrap')&&!$('agendaBody'))return; guard(); prepararBuscadorAgenda(); await cargarFiltroProfesionales(); const desde=$('agendaDesde')?.value||today(); const vista=$('agendaVista')?.value||'drapp'; const profesional=$('agendaProfesional')?.value||''; const hasta=(vista==='dia'||vista==='drapp')?addDays(desde,1):addDays(desde,7); let q=sb.from('turnos').select('*').gte('fecha',desde).lt('fecha',hasta).neq('estado','cancelado').order('fecha',{ascending:true}).order('hora',{ascending:true}); if(profesional) q=q.eq('profesional',profesional); const {data,error}=await q; if(error){show('msg',error.message,'error');return} renderAgenda(data||[],desde,vista);}
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
  $('modalContenido').innerHTML=`<div class="modal-grid"><p><b>Fecha:</b> ${esc(t.fecha)}</p><p><b>Hora:</b> ${esc(String(t.hora).slice(0,5))} hs</p><p><b>Profesional:</b> ${esc(t.profesional)}</p><p><b>Especialidad:</b> ${esc(t.especialidad)}</p><p><b>Teléfono:</b> ${esc(t.telefono)}</p><p><b>DNI:</b> ${esc(t.dni)}</p><p><b>Obra social:</b> ${esc(t.obra_social)}</p><p><b>Estado:</b> ${esc(t.estado||'confirmado')}</p></div><hr><p><b>Motivo:</b><br>${esc(t.motivo_consulta||'Sin motivo cargado')}</p><div class="modal-actions"><button class="btn ok" onclick="abrirHistoriaDesdeTurno(${t.id})">Abrir historia clínica</button><button class="btn secondary" onclick="cancelarTurnoCentro(${t.id})">Cancelar turno</button><button class="btn danger" onclick="eliminarTurnoCentro(${t.id})">Eliminar turno</button><button class="btn secondary" onclick="cerrarModal()">Cerrar</button></div><div id="historiaAgendaBox"></div>`;
  $('turnoModal').classList.remove('hidden');
}
async function obtenerOCrearPacienteDesdeTurno(t){
  // IMPORTANTE: no buscar solo por teléfono, porque muchas pruebas/pacientes pueden compartirlo.
  // Primero usamos DNI si parece válido; si no, usamos nombre + teléfono.
  let paciente=null;
  const dni=String(t.dni||'').trim();
  const tel=String(t.telefono||'').trim();
  const nombre=String(t.paciente_nombre||'Paciente sin nombre').trim();
  const dniValido=/^[0-9]{6,12}$/.test(dni);

  if(dniValido){
    const r=await sb.from('pacientes').select('*').eq('dni',dni).limit(1);
    if(r.data && r.data.length) paciente=r.data[0];
  }

  if(!paciente && tel && nombre){
    const r=await sb.from('pacientes').select('*').eq('telefono',tel).eq('nombre',nombre).limit(1);
    if(r.data && r.data.length) paciente=r.data[0];
  }

  if(paciente) return paciente;

  const nuevo={
    nombre,
    dni:dniValido ? dni : (dni || null),
    telefono:tel,
    obra_social:t.obra_social||'',
    observaciones:`Paciente creado automáticamente desde el turno #${t.id} del ${t.fecha} a las ${String(t.hora).slice(0,5)}.`
  };
  const {data,error}=await sb.from('pacientes').insert(nuevo).select('*').single();
  if(error) throw error;
  return data;
}
async function abrirHistoriaDesdeTurno(turnoId){
  const raw=sessionStorage.getItem('turnosAgenda')||'[]';
  const turnos=JSON.parse(raw);
  const t=turnos.find(x=>String(x.id)===String(turnoId));
  if(!t) return;
  try{
    const paciente=await obtenerOCrearPacienteDesdeTurno(t);
    const params=new URLSearchParams({id:paciente.id, turno:turnoId, profesional:t.profesional||'', especialidad:t.especialidad||''});
    location.href='historia-clinica.html?'+params.toString();
  }catch(err){
    const box=$('historiaAgendaBox');
    if(box) box.innerHTML=`<div class="msg error" style="display:block">${esc(err.message)}</div>`;
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
async function cancelarTurnoCentro(id){
  if(!confirm('¿Cancelar este turno? El horario quedará libre para otra reserva.')) return;
  const {error}=await sb.from('turnos').update({estado:'cancelado',cancelado_en:new Date().toISOString(),cancelado_por:'centro',motivo_cancelacion:'Cancelado desde agenda'}).eq('id',id);
  if(error){alert('No se pudo cancelar: '+error.message); return;}
  cerrarModal();
  await agenda();
  show('msg','Turno cancelado correctamente. El horario volvió a quedar disponible.','success');
}
async function eliminarTurnoCentro(id){
  if(!confirm('¿Eliminar definitivamente este turno de la agenda? Esta acción no se puede deshacer.')) return;
  const {error}=await sb.from('turnos').delete().eq('id',id);
  if(error){alert('No se pudo eliminar: '+error.message); return;}
  cerrarModal();
  await agenda();
  show('msg','Turno eliminado correctamente.','success');
}
async function buscarTurnosCancelar(e){
  e.preventDefault();
  const dni=($('cancelDni')?.value||'').trim();
  const telefono=($('cancelTelefono')?.value||'').replace(/\D/g,'');
  const fecha=($('cancelFecha')?.value||'').trim();
  const box=$('cancelResultados');
  if(!box) return;
  box.innerHTML='Buscando turnos...';
  if(!dni && !telefono){box.innerHTML='<div class="msg error" style="display:block">Ingresá al menos DNI o WhatsApp para buscar el turno.</div>';return;}
  let q=sb.from('turnos').select('*').neq('estado','cancelado').order('fecha',{ascending:true}).order('hora',{ascending:true});
  if(dni) q=q.eq('dni',dni);
  if(fecha) q=q.eq('fecha',fecha);
  const {data,error}=await q;
  if(error){box.innerHTML=`<div class="msg error" style="display:block">${esc(error.message)}</div>`;return;}
  let lista=(data||[]);
  if(telefono) lista=lista.filter(t=>String(t.telefono||'').replace(/\D/g,'').includes(telefono) || telefono.includes(String(t.telefono||'').replace(/\D/g,'')));
  if(!lista.length){box.innerHTML='<div class="empty-state">No encontramos turnos activos con esos datos.</div>';return;}
  box.innerHTML=lista.map(t=>`<div class="cancel-card"><b>${esc(t.paciente_nombre)}</b><span>${esc(t.fecha)} · ${esc(String(t.hora).slice(0,5))} hs</span><span>${esc(t.especialidad)} · ${esc(t.profesional)}</span><button class="btn danger" type="button" onclick="cancelarTurnoPaciente(${t.id})">Cancelar este turno</button></div>`).join('');
}
async function cancelarTurnoPaciente(id){
  if(!confirm('¿Querés cancelar este turno?')) return;
  const motivo=prompt('Motivo de cancelación (opcional):')||'Cancelado por paciente';
  const {error}=await sb.from('turnos').update({estado:'cancelado',cancelado_en:new Date().toISOString(),cancelado_por:'paciente',motivo_cancelacion:motivo}).eq('id',id);
  if(error){alert('No se pudo cancelar: '+error.message); return;}
  show('cancelMsg','✅ Tu turno fue cancelado correctamente. El horario quedó liberado.','success');
  const box=$('cancelResultados'); if(box) box.innerHTML='';
  await horariosOcupados();
}


function prepararBuscadorAgenda(){
  const agendaMain=document.querySelector('.agenda-main');
  if(!agendaMain || $('agendaBuscadorBox')) return;

  const box=document.createElement('div');
  box.id='agendaBuscadorBox';
  box.className='card slim-card';
  box.innerHTML=`
    <h3 style="margin-top:0">Buscar paciente en agenda</h3>
    <p class="muted">Buscá por DNI, nombre, apellido o teléfono. Te muestra los turnos activos del paciente.</p>
    <div class="filters drapp-filters">
      <div>
        <label>Buscar paciente</label>
        <input id="agendaBusquedaPaciente" placeholder="Ej: 12345678, Miguel, Pérez">
      </div>
      <div class="filter-actions">
        <button class="btn secondary" id="agendaBuscarPaciente" type="button">Buscar</button>
      </div>
    </div>
    <div id="agendaBusquedaResultados"></div>
  `;

  const stats=$('agendaStats');
  if(stats) stats.parentNode.insertBefore(box, stats);
  else agendaMain.prepend(box);

  $('agendaBuscarPaciente')?.addEventListener('click', buscarPacienteAgenda);
  $('agendaBusquedaPaciente')?.addEventListener('keydown', e=>{
    if(e.key==='Enter'){e.preventDefault(); buscarPacienteAgenda();}
  });
}

async function buscarPacienteAgenda(){
  const q=($('agendaBusquedaPaciente')?.value||'').trim().toLowerCase();
  const box=$('agendaBusquedaResultados');
  if(!box) return;

  if(q.length<2){
    box.innerHTML='<div class="msg error" style="display:block">Escribí al menos 2 caracteres para buscar.</div>';
    return;
  }

  box.innerHTML='<div class="empty-state">Buscando turnos...</div>';

  const {data,error}=await sb.from('turnos')
    .select('*')
    .neq('estado','cancelado')
    .order('fecha',{ascending:true})
    .order('hora',{ascending:true});

  if(error){
    box.innerHTML=`<div class="msg error" style="display:block">${esc(error.message)}</div>`;
    return;
  }

  const resultados=(data||[]).filter(t=>{
    const texto=[
      t.paciente_nombre,
      t.dni,
      t.telefono,
      t.profesional,
      t.especialidad
    ].map(x=>String(x||'').toLowerCase()).join(' ');
    return texto.includes(q);
  });

  if(!resultados.length){
    box.innerHTML='<div class="empty-state">No encontramos turnos activos con esos datos.</div>';
    return;
  }

  box.innerHTML=`
    <div class="agenda-search-list">
      ${resultados.map(t=>`
        <button type="button" class="agenda-search-item" onclick="irATurnoAgenda('${esc(t.fecha)}', ${t.id})">
          <b>${esc(t.paciente_nombre)}</b>
          <span>DNI: ${esc(t.dni||'No informado')} · Tel: ${esc(t.telefono||'')}</span>
          <span>${esc(t.fecha)} · ${esc(String(t.hora).slice(0,5))} hs · ${esc(t.profesional)} · ${esc(t.especialidad)}</span>
        </button>
      `).join('')}
    </div>
  `;

  if(!document.getElementById('agendaSearchStyles')){
    const style=document.createElement('style');
    style.id='agendaSearchStyles';
    style.textContent=`
      .agenda-search-list{display:grid;gap:10px;margin-top:12px}
      .agenda-search-item{width:100%;text-align:left;border:1px solid #dbe4ea;background:#fff;border-radius:14px;padding:12px;cursor:pointer}
      .agenda-search-item:hover{border-color:#087ea4;box-shadow:0 4px 14px rgba(8,126,164,.12)}
      .agenda-search-item b{display:block;color:#075985;margin-bottom:4px}
      .agenda-search-item span{display:block;color:#475569;font-size:13px;margin-top:2px}
      .slot.free{cursor:pointer;position:relative}
      .slot.free:hover{background:#ecfeff!important;outline:2px dashed #67e8f9;outline-offset:-4px}
      .slot.free:hover:after{content:'Agregar turno';position:absolute;inset:auto 8px 8px auto;background:#087ea4;color:#fff;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:700}
      .quick-turno-form{display:grid;gap:10px;margin-top:8px}
    `;
    document.head.appendChild(style);
  }
}

function irATurnoAgenda(fecha, id){
  const d=$('agendaDesde');
  if(d) d.value=fecha;
  agenda().then(()=>setTimeout(()=>abrirTurno(id), 250));
}

function abrirCrearTurnoAgenda(fecha, hora, profesional){
  const especialidadSugerida='';
  $('modalPaciente').textContent='Agregar turno';
  $('modalContenido').innerHTML=`
    <p class="muted">Cargá un turno manual desde la agenda del centro.</p>
    <form id="crearTurnoAgendaForm" class="quick-turno-form">
      <div class="modal-grid">
        <div><label>Fecha</label><input id="nuevoTurnoFecha" type="date" value="${esc(fecha)}" required></div>
        <div><label>Hora</label><select id="nuevoTurnoHora" required></select></div>
        <div><label>Profesional</label><select id="nuevoTurnoProfesional" required></select></div>
        <div><label>Especialidad</label><select id="nuevoTurnoEspecialidad" required></select></div>
        <div><label>Nombre y apellido</label><input id="nuevoTurnoNombre" required></div>
        <div><label>DNI</label><input id="nuevoTurnoDni"></div>
        <div><label>WhatsApp</label><input id="nuevoTurnoTelefono"></div>
        <div><label>Obra social / Particular</label><input id="nuevoTurnoObraSocial"></div>
      </div>
      <label>Motivo</label>
      <textarea id="nuevoTurnoMotivo" placeholder="Motivo de consulta"></textarea>
      <div class="modal-actions">
        <button class="btn ok" type="submit">Guardar turno</button>
        <button class="btn secondary" type="button" onclick="cerrarModal()">Cancelar</button>
      </div>
      <div id="nuevoTurnoMsg" class="msg"></div>
    </form>
  `;
  $('turnoModal').classList.remove('hidden');

  cargarFormularioTurnoAgenda(hora, profesional);
}

async function cargarFormularioTurnoAgenda(horaSeleccionada, profesionalSeleccionado){
  const horaSel=$('nuevoTurnoHora');
  const profSel=$('nuevoTurnoProfesional');
  const espSel=$('nuevoTurnoEspecialidad');

  times().forEach(t=>horaSel.add(new Option(t,t)));
  horaSel.value=horaSeleccionada;

  const especialidades=await getEspecialidades();
  const profesionales=await getProfesionales();

  especialidades.forEach(e=>espSel.add(new Option(e.nombre,e.nombre)));
  profesionales.forEach(p=>profSel.add(new Option(p.especialidad?`${p.nombre} - ${p.especialidad}`:p.nombre,p.nombre)));

  profSel.value=profesionalSeleccionado;

  const prof=profesionales.find(p=>p.nombre===profesionalSeleccionado);
  if(prof?.especialidad) espSel.value=prof.especialidad;

  profSel.addEventListener('change',()=>{
    const p=profesionales.find(x=>x.nombre===profSel.value);
    if(p?.especialidad) espSel.value=p.especialidad;
  });

  $('crearTurnoAgendaForm')?.addEventListener('submit', guardarTurnoDesdeAgenda);
}

async function guardarTurnoDesdeAgenda(e){
  e.preventDefault();

  const row={
    paciente_nombre:$('nuevoTurnoNombre').value.trim(),
    dni:$('nuevoTurnoDni').value.trim(),
    telefono:$('nuevoTurnoTelefono').value.trim(),
    especialidad:$('nuevoTurnoEspecialidad').value,
    profesional:$('nuevoTurnoProfesional').value,
    fecha:$('nuevoTurnoFecha').value,
    hora:$('nuevoTurnoHora').value,
    obra_social:$('nuevoTurnoObraSocial').value.trim(),
    motivo_consulta:$('nuevoTurnoMotivo').value.trim(),
    estado:'confirmado'
  };

  if(!row.paciente_nombre || !row.profesional || !row.fecha || !row.hora){
    show('nuevoTurnoMsg','Completá nombre, profesional, fecha y horario.','error');
    return;
  }

  const {error}=await sb.from('turnos').insert(row);

  if(error){
    show('nuevoTurnoMsg', error.message.includes('duplicate')?'Ese horario ya está ocupado. Elegí otro.':error.message, 'error');
    return;
  }

  show('nuevoTurnoMsg','Turno agregado correctamente.','success');
  setTimeout(async()=>{
    cerrarModal();
    const d=$('agendaDesde');
    if(d) d.value=row.fecha;
    await agenda();
  }, 700);
}


async function profesionalesParaAgenda(turnos){let profs=(await getProfesionales()).map(p=>p.nombre); const usados=[...new Set(turnos.map(t=>t.profesional).filter(Boolean))]; usados.forEach(p=>{if(!profs.includes(p))profs.push(p)}); const filtro=$('agendaProfesional')?.value||''; if(filtro)profs=profs.filter(p=>p===filtro); return profs;}
async function renderAgenda(turnos,desde,vista){sessionStorage.setItem('turnosAgenda',JSON.stringify(turnos)); const lista=$('agendaLista'), cal=$('calendarWrap'), tbody=$('agendaBody'); actualizarStats(turnos); if(vista==='lista'){if(lista)lista.classList.remove('hidden'); if(cal)cal.classList.add('hidden'); if(tbody)tbody.innerHTML=turnos.map(t=>`<tr><td>${esc(t.fecha)}</td><td>${esc(String(t.hora).slice(0,5))}</td><td>${esc(t.paciente_nombre)}</td><td>${esc(t.telefono)}</td><td>${esc(t.especialidad)}</td><td>${esc(t.profesional)}</td><td><span class="pill ${estadoClass(t.estado)}">${esc(t.estado||'confirmado')}</span></td></tr>`).join('')||'<tr><td colspan="7">No hay turnos cargados.</td></tr>'; return;} if(lista)lista.classList.add('hidden'); if(cal)cal.classList.remove('hidden'); if(vista==='drapp'){const profs=await profesionalesParaAgenda(turnos); const cols=Math.max(profs.length,1); let html=`<div class="drapp-grid" style="--cols:${cols}"><div class="drapp-head"><div class="time-head">Hora</div>${profs.map(p=>`<div class="pro-head"><b>${esc(p)}</b><span>${esc(diaNombre(desde))}</span></div>`).join('')}</div>`; for(const hora of times()){html+=`<div class="drapp-row"><div class="calendar-time">${hora}</div>`; for(const prof of profs){const eventos=turnos.filter(t=>t.fecha===desde && String(t.hora).slice(0,5)===hora && t.profesional===prof); html+=`<div class="slot ${eventos.length?'busy':'free'}" ${eventos.length?'':`onclick="abrirCrearTurnoAgenda('${desde}','${hora}','${esc(prof)}')"`}>${eventos.map(t=>`<button class="event drapp-event ${estadoClass(t.estado)}" onclick="abrirTurno(${t.id}); event.stopPropagation();"><b>${esc(t.paciente_nombre)}</b><small>${esc(t.especialidad)}</small><small>${esc(t.telefono||'')}</small></button>`).join('')}</div>`;} html+='</div>';} html+='</div>'; if(cal)cal.innerHTML=html; return;} const dias=Array.from({length:1},(_,i)=>addDays(desde,i)); const cols=dias.length; let html=`<div class="calendar-grid" style="--cols:${cols}"><div class="calendar-head"><div>Hora</div>${dias.map(d=>`<div>${diaNombre(d)}</div>`).join('')}</div>`; for(const hora of times()){html+=`<div class="calendar-row"><div class="calendar-time">${hora}</div>`; for(const dia of dias){const eventos=turnos.filter(t=>t.fecha===dia && String(t.hora).slice(0,5)===hora); html+=`<div class="slot ${eventos.length?'busy':'free'}" ${eventos.length?'':`onclick="abrirCrearTurnoAgenda('${dia}','${hora}','')"`}>${eventos.map(t=>`<button class="event" onclick="abrirTurno(${t.id}); event.stopPropagation();"><b>${esc(t.paciente_nombre)}</b><small>${esc(t.profesional)}</small><small>${esc(t.especialidad)}</small><small>${esc(t.telefono||'')}</small></button>`).join('')}</div>`;} html+='</div>';} html+='</div>'; if(cal)cal.innerHTML=html;}
async function loadConfig(){if(!$('profBody'))return; guard(); await llenarSelectsConfig(); await listarProfesionales(); await listarEspecialidades(); await listarHorarios();}
async function llenarSelectsConfig(){const esp=$('profEspecialidad'), hp=$('horProfesional'); if(esp){esp.innerHTML=''; (await getEspecialidades()).forEach(e=>esp.add(new Option(e.nombre,e.nombre)));} if(hp){hp.innerHTML=''; (await getProfesionales()).forEach(p=>hp.add(new Option(p.nombre,p.nombre)));}}
async function listarProfesionales(){const body=$('profBody'); if(!body)return; const data=await getProfesionales(); body.innerHTML=data.map(p=>`<tr><td>${p.nombre}</td><td>${p.especialidad||''}</td><td><button class="action-link" onclick="desactivar('profesionales',${p.id})">Desactivar</button></td></tr>`).join('')||'<tr><td colspan="3">Sin profesionales.</td></tr>';}
async function listarEspecialidades(){const body=$('espBody'); if(!body)return; const data=await getEspecialidades(); body.innerHTML=data.map(e=>`<tr><td>${e.nombre}</td><td><button class="action-link" onclick="desactivar('especialidades',${e.id})">Desactivar</button></td></tr>`).join('')||'<tr><td colspan="2">Sin especialidades.</td></tr>';}
async function listarHorarios(){
  const body=$('horBody');
  if(!body)return;

  const profesionalesActivos=await getProfesionales();
  const nombresActivos=new Set(profesionalesActivos.map(p=>String(p.nombre||'').trim()));

  const {data,error}=await sb.from('horarios')
    .select('*')
    .order('profesional')
    .order('dia_semana');

  if(error){
    body.innerHTML=`<tr><td colspan="5">${error.message}</td></tr>`;
    return;
  }

  const lista=(data||[]).filter(h=>
    h.activo!==false &&
    nombresActivos.has(String(h.profesional||'').trim())
  );

  body.innerHTML=lista.map(h=>`
    <tr>
      <td>${esc(h.profesional)}</td>
      <td>${esc(h.dia_semana)}</td>
      <td>${String(h.hora_inicio).slice(0,5)}</td>
      <td>${String(h.hora_fin).slice(0,5)}</td>
      <td><button class="action-link" onclick="desactivar('horarios',${h.id})">Desactivar</button></td>
    </tr>
  `).join('')||'<tr><td colspan="5">Sin horarios cargados.</td></tr>';
}
async function crearProfesional(e){e.preventDefault(); const row={nombre:$('profNombre').value.trim(),especialidad:$('profEspecialidad').value,activo:true}; const {error}=await sb.from('profesionales').insert(row); if(error)show('profMsg',error.message,'error'); else{show('profMsg','Profesional guardado.','success'); e.target.reset(); await loadConfig();}}
async function crearEspecialidad(e){e.preventDefault(); const row={nombre:$('espNombre').value.trim(),activo:true}; const {error}=await sb.from('especialidades').insert(row); if(error)show('espMsg',error.message,'error'); else{show('espMsg','Especialidad guardada.','success'); e.target.reset(); await loadConfig();}}
async function crearHorario(e){
  e.preventDefault();

  const profesionalSeleccionado=$('horProfesional').value;
  const dias=[...$('horDia').selectedOptions].map(x=>x.value);

  if(!profesionalSeleccionado){
    show('horMsg','Seleccioná un profesional.','error');
    return;
  }

  if(!dias.length){
    show('horMsg','Seleccioná al menos un día de atención.','error');
    return;
  }

  const rows=dias.map(dia=>({
    profesional:profesionalSeleccionado,
    dia_semana:dia,
    hora_inicio:$('horInicio').value,
    hora_fin:$('horFin').value,
    activo:true
  }));

  const {error}=await sb.from('horarios').insert(rows);

  if(error){
    show('horMsg',error.message,'error');
  } else {
    show('horMsg',`Horarios guardados correctamente para ${profesionalSeleccionado} (${dias.join(', ')}).`,'success');

    // Mantiene el mismo profesional seleccionado para seguir cargando días/horarios.
    $('horDia').selectedIndex=-1;

    await llenarSelectsConfig();
    if($('horProfesional')) $('horProfesional').value=profesionalSeleccionado;

    await listarProfesionales();
    await listarEspecialidades();
    await listarHorarios();
  }
}
async function desactivar(tabla,id){
  if(!confirm('¿Desactivar este ítem?'))return;

  let nombreProfesional=null;

  if(tabla==='profesionales'){
    const {data}=await sb.from('profesionales').select('nombre').eq('id',id).single();
    nombreProfesional=data?.nombre||null;
  }

  const {error}=await sb.from(tabla).update({activo:false}).eq('id',id);

  if(error){
    alert(error.message);
    return;
  }

  // Si se desactiva un profesional, sus horarios también dejan de mostrarse/usar.
  if(tabla==='profesionales' && nombreProfesional){
    await sb.from('horarios')
      .update({activo:false})
      .eq('profesional',nombreProfesional);
  }

  await loadConfig();
}
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

function mostrarTabHC(tab){
  document.querySelectorAll('.hc-tabs-page .tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.hc-tab-content').forEach(s=>s.classList.toggle('active', s.id==='tab-'+tab));
}
async function loadHistoriaClinicaFull(){
  if(!$('hcNombre')) return;
  guard();
  const params=new URLSearchParams(location.search);
  const id=params.get('id');
  const turnoId=params.get('turno');
  if(!id){show('hcMsg','No se encontró el paciente. Volvé a la agenda y abrí nuevamente la historia clínica.','error'); return;}
  $('hcPacienteId').value=id;
  $('fullProfesional').value=params.get('profesional')||'';
  $('fullEspecialidad').value=params.get('especialidad')||'';
  const {data:p,error:perr}=await sb.from('pacientes').select('*').eq('id',id).single();
  if(perr){show('hcMsg',perr.message,'error'); return;}
  $('hcNombre').textContent=p.nombre||'Paciente';
  $('hcDatos').textContent=`DNI: ${p.dni||'No informado'} · Teléfono: ${p.telefono||'No informado'} · Obra social: ${p.obra_social||'No informada'}`;
  $('hcFicha').innerHTML=`<p><b>Nombre:</b> ${esc(p.nombre)}</p><p><b>DNI:</b> ${esc(p.dni||'')}</p><p><b>Teléfono:</b> ${esc(p.telefono||'')}</p><p><b>Email:</b> ${esc(p.email||'')}</p><p><b>Obra social:</b> ${esc(p.obra_social||'')}</p><p><b>Observaciones:</b><br>${esc(p.observaciones||'')}</p>`;
  await cargarEvolucionesFull(id);
  await cargarTurnosPacienteFull(p);
  await cargarArchivosFull(id);
}
async function cargarEvolucionesFull(id){
  const {data,error}=await sb.from('historias_clinicas').select('*').eq('paciente_id',id).order('fecha',{ascending:false}).order('created_at',{ascending:false});
  if(error){$('hcEvoluciones').innerHTML=`<div class="msg error" style="display:block">${esc(error.message)}</div>`; return;}
  $('hcEvoluciones').innerHTML=(data||[]).map(evolucionCard).join('')||'<div class="empty-state">Sin evoluciones cargadas.</div>';
}
async function cargarTurnosPacienteFull(p){
  let q=sb.from('turnos').select('*').order('fecha',{ascending:false}).order('hora',{ascending:false});
  if(p.dni) q=q.eq('dni',p.dni); else if(p.telefono) q=q.eq('telefono',p.telefono); else q=q.eq('paciente_nombre',p.nombre);
  const {data,error}=await q;
  if(error){$('hcTurnos').innerHTML=`<tr><td colspan="5">${esc(error.message)}</td></tr>`; return;}
  $('hcTurnos').innerHTML=(data||[]).map(t=>`<tr><td>${esc(t.fecha)}</td><td>${esc(String(t.hora).slice(0,5))}</td><td>${esc(t.profesional)}</td><td>${esc(t.especialidad)}</td><td><span class="pill ${estadoClass(t.estado)}">${esc(t.estado||'confirmado')}</span></td></tr>`).join('')||'<tr><td colspan="5">Sin turnos registrados.</td></tr>';
}
async function cargarArchivosFull(id){
  const {data,error}=await sb.from('archivos_paciente').select('*').eq('paciente_id',id).order('created_at',{ascending:false});
  if(error){$('hcArchivos').innerHTML=`<tr><td colspan="3">${esc(error.message)}</td></tr>`; return;}
  $('hcArchivos').innerHTML=(data||[]).map(a=>`<tr><td>${esc(a.nombre_archivo)}</td><td>${esc(a.descripcion||'')}</td><td>${a.url_archivo?`<a href="${esc(a.url_archivo)}" target="_blank">Abrir</a>`:''}</td></tr>`).join('')||'<tr><td colspan="3">Sin archivos.</td></tr>';
}
async function crearHistoriaFull(e){
  e.preventDefault();
  const pacienteId=$('hcPacienteId').value;
  const row={paciente_id:pacienteId,profesional:$('fullProfesional').value.trim(),especialidad:$('fullEspecialidad').value.trim(),motivo:$('fullMotivo').value.trim(),evolucion:$('fullEvolucion').value.trim(),intervencion:$('fullIntervencion').value.trim(),objetivos:$('fullObjetivos').value.trim(),fecha:today()};
  if(!row.motivo && !row.evolucion && !row.intervencion && !row.objetivos){show('hcMsg','Escribí al menos un campo de la evolución.','error'); return;}
  const {error}=await sb.from('historias_clinicas').insert(row);
  if(error){show('hcMsg',error.message,'error'); return;}
  show('hcMsg','Evolución guardada correctamente.','success');
  e.target.reset();
  await cargarEvolucionesFull(pacienteId);
}
async function crearArchivoFull(e){
  e.preventDefault();
  const pacienteId=$('hcPacienteId').value;
  const row={paciente_id:pacienteId,nombre_archivo:$('fullArchivoNombre').value.trim(),url_archivo:$('fullArchivoUrl').value.trim(),descripcion:$('fullArchivoDesc').value.trim()};
  const {error}=await sb.from('archivos_paciente').insert(row);
  if(error){show('hcMsg',error.message,'error'); return;}
  show('hcMsg','Archivo registrado correctamente.','success');
  e.target.reset();
  await cargarArchivosFull(pacienteId);
}

document.addEventListener('DOMContentLoaded',()=>{if($('agendaDesde')) $('agendaDesde').value=today(); loadTurnosForm(); agenda(); pacientes(); loadConfig(); $('turnoForm')?.addEventListener('submit',reservar); $('cancelForm')?.addEventListener('submit',buscarTurnosCancelar); $('fecha')?.addEventListener('change',horariosOcupados); $('profesional')?.addEventListener('change',async()=>{const resumen=$('fechaSeleccionadaResumen'); if(resumen) resumen.remove(); const box=$('miniCalendarioTurnos'); if(box) box.classList.remove('mini-cal-colapsado'); await horariosOcupados();}); $('loginForm')?.addEventListener('submit',login); $('agendaBuscar')?.addEventListener('click',agenda); $('diaAnterior')?.addEventListener('click',()=>{const d=$('agendaDesde'); d.value=addDays(d.value||today(),-1); agenda();}); $('diaHoy')?.addEventListener('click',()=>{const d=$('agendaDesde'); d.value=today(); agenda();}); $('diaSiguiente')?.addEventListener('click',()=>{const d=$('agendaDesde'); d.value=addDays(d.value||today(),1); agenda();}); $('agendaProfesional')?.addEventListener('change',agenda); $('agendaVista')?.addEventListener('change',agenda); $('pacienteForm')?.addEventListener('submit',crearPaciente); $('histForm')?.addEventListener('submit',crearHistoria); $('archForm')?.addEventListener('submit',crearArchivo); loadHistoriaClinicaFull(); $('historiaFullForm')?.addEventListener('submit',crearHistoriaFull); $('archivoFullForm')?.addEventListener('submit',crearArchivoFull); $('profForm')?.addEventListener('submit',crearProfesional); $('espForm')?.addEventListener('submit',crearEspecialidad); $('horForm')?.addEventListener('submit',crearHorario);});