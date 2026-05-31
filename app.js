async function crearHorario(e){
  e.preventDefault();

  const dias = [...$('horDia').selectedOptions].map(o => o.value);

  if(dias.length===0){
    show('horMsg','Seleccioná al menos un día','error');
    return;
  }

  const filas = dias.map(dia => ({
    profesional:$('horProfesional').value,
    dia_semana:dia,
    hora_inicio:$('horInicio').value,
    hora_fin:$('horFin').value,
    activo:true
  }));

  const {error}=await sb.from('horarios').insert(filas);

  if(error){
    show('horMsg',error.message,'error');
  }else{
    show('horMsg','Horarios guardados correctamente.','success');
    e.target.reset();
    await loadConfig();
  }
}
