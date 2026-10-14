const form = document.querySelector('#prediction-form');
const steps = [...document.querySelectorAll('.step')];
const nextButton = document.querySelector('#next-button');
const backButton = document.querySelector('#back-button');
const submitButton = document.querySelector('#submit-button');
const progressFill = document.querySelector('#progress-fill');
const stepCount = document.querySelector('#step-count');
const stepName = document.querySelector('#step-name');
const assessment = document.querySelector('#assessment');
const resultPanel = document.querySelector('#result-panel');
let currentStep = 1;
const stepNames = ['IDENTITY SIGNAL', 'DIGITAL RHYTHM', 'RECOVERY SCAN'];

function number(id) { return Number(document.querySelector(`#${id}`).value); }
function updateLiveMap() {
  const usage = number('usage'), unlocks = number('unlocks'), study = number('study');
  const sleep = number('sleep'), activity = number('activity');
  const digital = Math.min(99, Math.round((usage / 16 * 60) + (unlocks / 500 * 40)));
  const recovery = Math.min(99, Math.round((sleep / 10 * 70) + (activity / 12 * 30)));
  const focus = Math.min(99, Math.round((study / 10 * 72) + ((16 - usage) / 16 * 28)));
  document.querySelector('#digital-readout').textContent = `${digital}%`;
  document.querySelector('#recovery-readout').textContent = `${recovery}%`;
  document.querySelector('#focus-readout').textContent = `${focus}%`;
  const scale = .9 + recovery / 1000;
  document.querySelector('#orbital-system').style.transform = `scale(${scale}) rotate(${(digital - 50) / 16}deg)`;
  return { digital, recovery, focus };
}

[['usage','usage-value',' HRS'],['unlocks','unlocks-value',''],['study','study-value',' HRS'],['sleep','sleep-value',' HRS'],['activity','activity-value',' HRS']].forEach(([input, output, suffix]) => {
  const el = document.querySelector(`#${input}`);
  el.addEventListener('input', () => { document.querySelector(`#${output}`).innerHTML = `${el.value} ${suffix ? `<small>${suffix.trim()}</small>` : ''}`; updateLiveMap(); });
});

function switchStep(step) {
  currentStep = step;
  steps.forEach(item => item.classList.toggle('active', Number(item.dataset.step) === step));
  progressFill.style.width = `${step / 3 * 100}%`;
  stepCount.textContent = `0${step} / 03`;
  stepName.textContent = stepNames[step - 1];
  backButton.hidden = step === 1;
  nextButton.hidden = step === 3;
  submitButton.hidden = step !== 3;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

nextButton.addEventListener('click', () => {
  const active = steps[currentStep - 1];
  if (!active.querySelectorAll('input, select').length || active.querySelectorAll('input, select').length) {
    const invalid = [...active.querySelectorAll('input, select')].find(field => !field.checkValidity());
    if (invalid) return invalid.reportValidity();
  }
  switchStep(currentStep + 1);
});
backButton.addEventListener('click', () => switchStep(currentStep - 1));

function observation(score) {
  if (score >= 7.5) return 'Your inputs form a steady, supportive pattern. Your current mix of recovery, focus, and digital habits is showing strong alignment.';
  if (score >= 6) return 'Your pattern has a solid foundation. There is room to protect recovery time when your digital load or academic demands increase.';
  if (score >= 4.5) return 'Your current pattern suggests a high-demand stretch. Small changes to rest, movement, or device boundaries may improve your daily reserve.';
  return 'Your signal points to a demanding routine right now. Consider treating rest as a priority and speaking with someone you trust if things feel heavy.';
}
function animateScore(target) {
  const text = document.querySelector('#score'), ring = document.querySelector('#ring-progress');
  const start = performance.now(), duration = 1500, circumference = 660;
  function frame(now) {
    const p = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - p, 4);
    text.textContent = (target * eased).toFixed(2);
    ring.style.strokeDashoffset = circumference - circumference * (target / 10 * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const raw = Object.fromEntries(new FormData(form));
  const payload = { ...raw, age:Number(raw.age), avg_daily_usage_hours:Number(raw.avg_daily_usage_hours), daily_unlocks:Number(raw.daily_unlocks), study_hours:Number(raw.study_hours), physical_activity_hours:Number(raw.physical_activity_hours), sleep_hours_per_night:Number(raw.sleep_hours_per_night) };
  const old = submitButton.innerHTML; submitButton.disabled = true; submitButton.innerHTML = 'Processing signal <b>◌</b>';
  try {
    const response = await fetch('/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await response.json(); if (!response.ok) throw new Error(data.detail || 'The scan could not be completed.');
    const score = data.predicted_mental_health_score, live = updateLiveMap();
    document.querySelector('#result-message').textContent = observation(score);
    document.querySelector('#country-note').textContent = `COUNTRY FEATURE GROUP · ${data.grouped_country.toUpperCase()}`;
    document.querySelector('#bar-digital').style.setProperty('--value', `${live.digital}%`);
    document.querySelector('#bar-recovery').style.setProperty('--value', `${live.recovery}%`);
    document.querySelector('#bar-focus').style.setProperty('--value', `${live.focus}%`);
    resultPanel.hidden = false; resultPanel.classList.remove('reveal'); void resultPanel.offsetWidth; resultPanel.classList.add('reveal');
    animateScore(score);
  } catch (error) { alert(error.message || 'Something interrupted the scan. Please try again.'); }
  finally { submitButton.disabled = false; submitButton.innerHTML = old; }
});
function closeResult(){ resultPanel.hidden = true; }
document.querySelector('.close-result').addEventListener('click', closeResult);
document.querySelector('#try-again').addEventListener('click', () => { closeResult(); assessment.scrollIntoView({behavior:'smooth'}); });
document.addEventListener('keydown', event => { if(event.key === 'Escape') closeResult(); });
updateLiveMap();
