const form = document.querySelector("#prediction-form");
const resultPanel = document.querySelector("#result-panel");
const submitButton = document.querySelector("#submit-button");

const rangeBindings = [
  ["usage", "usage-value", " hrs"],
  ["study", "study-value", " hrs"],
  ["activity", "activity-value", " hrs"],
  ["sleep", "sleep-value", " hrs"],
  ["unlocks", "unlocks-value", ""],
];

rangeBindings.forEach(([inputId, outputId, suffix]) => {
  const input = document.querySelector(`#${inputId}`);
  const output = document.querySelector(`#${outputId}`);
  input.addEventListener("input", () => { output.textContent = `${input.value}${suffix}`; });
});

function insightFor(score) {
  if (score >= 7.5) return "Your routine is landing in a strong range. Keep protecting the habits that help you feel steady.";
  if (score >= 6) return "Your routine shows a balanced foundation, with a little room to make rest and recovery more intentional.";
  if (score >= 4.5) return "Your score suggests a busy season. Small, kind adjustments to sleep, movement, or screen time can add up.";
  return "Your routine may be asking a lot of you right now. A pause, a conversation, or support from someone you trust can help.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const payload = {
    ...values,
    age: Number(values.age),
    avg_daily_usage_hours: Number(values.avg_daily_usage_hours),
    daily_unlocks: Number(values.daily_unlocks),
    study_hours: Number(values.study_hours),
    physical_activity_hours: Number(values.physical_activity_hours),
    sleep_hours_per_night: Number(values.sleep_hours_per_night),
  };

  const originalLabel = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = "<span>Finding your score…</span><b>✦</b>";

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Unable to make a prediction.");

    const score = result.predicted_mental_health_score;
    document.querySelector("#score").textContent = score.toFixed(2);
    document.querySelector("#meter-fill").style.width = `${Math.max(0, Math.min(100, score * 10))}%`;
    document.querySelector("#result-message").textContent = insightFor(score);
    document.querySelector("#country-note").textContent = `Model country group: ${result.grouped_country}`;
    resultPanel.hidden = false;
    requestAnimationFrame(() => resultPanel.querySelector(".try-again").focus());
  } catch (error) {
    alert(error.message || "Something went wrong. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalLabel;
  }
});

function closeResult() { resultPanel.hidden = true; }
document.querySelector(".close-result").addEventListener("click", closeResult);
document.querySelector("#try-again").addEventListener("click", () => { closeResult(); form.scrollIntoView({ behavior: "smooth", block: "start" }); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeResult(); });
