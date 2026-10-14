const form = document.querySelector('#prediction-form');
const submitButton = document.querySelector('#submit-button');
const resultPanel = document.querySelector('#result-panel');
const value = id => Number(document.querySelector(`#${id}`).value);

function updateMap() {
  const usage=value('usage'), unlocks=value('unlocks'), study=value('study'), sleep=value('sleep'), activity=value('activity');
  const digital=Math.min(99,Math.round(usage/16*60+unlocks/500*40));
  const recovery=Math.min(99,Math.round(sleep/10*70+activity/12*30));
  const focus=Math.min(99,Math.round(study/10*72+(16-usage)/16*28));
  document.querySelector('#digital-readout').textContent=`${digital}%`;
  document.querySelector('#recovery-readout').textContent=`${recovery}%`;
  document.querySelector('#focus-readout').textContent=`${focus}%`;
  document.querySelector('#orbital-system').style.transform=`scale(${.9+recovery/1000}) rotate(${(digital-50)/16}deg)`;
  return {digital,recovery,focus};
}
[['usage','usage-value',' HRS'],['unlocks','unlocks-value',''],['study','study-value',' HRS'],['sleep','sleep-value',' HRS'],['activity','activity-value',' HRS']].forEach(([id,out,suffix])=>{
  const input=document.querySelector(`#${id}`); input.addEventListener('input',()=>{document.querySelector(`#${out}`).innerHTML=`${input.value}${suffix?` <small>${suffix.trim()}</small>`:''}`;updateMap();});
});

function suggestion(score, p) {
  const actions=[];
  if (p.sleep_hours_per_night < 7) actions.push('Aim for 7–9 hours of sleep to give your mind a real reset.');
  if (p.avg_daily_usage_hours > 5) actions.push('Try one screen-free block each day to lower your digital load.');
  if (p.physical_activity_hours < 1) actions.push('Add a short walk or 20 minutes of movement to your day.');
  if (p.daily_unlocks > 150) actions.push('Turn off nonessential notifications to reduce phone check-ins.');
  if (p.stress_level === 'High' || p.stress_level === 'Very High') actions.push('Protect one calm break in your day—small pauses count.');
  if (score < 6) return actions.slice(0,2).join(' ') || 'Your routine looks demanding right now. Start with one small habit that helps you recharge.';
  if (score < 8) return `You have a good foundation with room to grow. ${actions[0] || 'Keep your sleep, movement, and focused study time consistent.'}`;
  return `Excellent balance—your current routine is supporting you well. ${actions[0] ? `Keep it strong, and ${actions[0].charAt(0).toLowerCase()+actions[0].slice(1)}` : 'Keep protecting the habits that are working for you.'}`;
}
function animateScore(target){const text=document.querySelector('#score'),ring=document.querySelector('#ring-progress'),start=performance.now(),duration=1500,circumference=660;function tick(now){const progress=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-progress,4);text.textContent=(target*ease).toFixed(2);ring.style.strokeDashoffset=circumference-circumference*(target/10*ease);if(progress<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}

form.addEventListener('submit',async event=>{
  event.preventDefault(); if(!form.reportValidity())return;
  const raw=Object.fromEntries(new FormData(form));
  const payload={...raw,age:+raw.age,avg_daily_usage_hours:+raw.avg_daily_usage_hours,daily_unlocks:+raw.daily_unlocks,study_hours:+raw.study_hours,physical_activity_hours:+raw.physical_activity_hours,sleep_hours_per_night:+raw.sleep_hours_per_night};
  const old=submitButton.innerHTML;submitButton.disabled=true;submitButton.innerHTML='Processing signal <b>◌</b>';
  try{const response=await fetch('/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.detail||'The scan could not be completed.');const live=updateMap();document.querySelector('#result-message').textContent=suggestion(data.predicted_mental_health_score,payload);document.querySelector('#country-note').textContent=`COUNTRY FEATURE GROUP · ${data.grouped_country.toUpperCase()}`;[['#bar-digital',live.digital],['#bar-recovery',live.recovery],['#bar-focus',live.focus]].forEach(([id,n])=>document.querySelector(id).style.setProperty('--value',`${n}%`));resultPanel.hidden=false;resultPanel.classList.remove('reveal');void resultPanel.offsetWidth;resultPanel.classList.add('reveal');animateScore(data.predicted_mental_health_score)}catch(error){alert(error.message||'Something interrupted the scan. Please try again.')}finally{submitButton.disabled=false;submitButton.innerHTML=old}
});
const close=()=>resultPanel.hidden=true;document.querySelector('.close-result').addEventListener('click',close);document.querySelector('#try-again').addEventListener('click',()=>{close();form.scrollIntoView({behavior:'smooth'});});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});updateMap();
