const storageKey = "name-pickers-state-v1";

const elements = {
  form: document.querySelector("#nameForm"),
  input: document.querySelector("#nameInput"),
  list: document.querySelector("#nameList"),
  count: document.querySelector("#nameCount"),
  empty: document.querySelector("#emptyState"),
  message: document.querySelector("#duplicateMessage"),
  clear: document.querySelector("#clearButton"),
  shuffle: document.querySelector("#shuffleButton"),
  pick: document.querySelector("#pickButton"),
  pickCount: document.querySelector("#pickCount"),
  removeToggle: document.querySelector("#removeToggle"),
  result: document.querySelector("#result"),
  resultLabel: document.querySelector("#resultLabel"),
  winner: document.querySelector("#winnerName"),
  resultHint: document.querySelector("#resultHint"),
  history: document.querySelector("#historyList"),
  historyEmpty: document.querySelector("#historyEmpty"),
  reset: document.querySelector("#resetButton")
};

let state = loadState();
let picking = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.names) && Array.isArray(saved.history)) return saved;
  } catch (_) {}
  return { names: [], history: [], picked: [] };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function availableNames() {
  if (!elements.removeToggle.checked) return [...state.names];
  return state.names.filter(name => !state.picked.includes(name));
}

function render() {
  elements.list.innerHTML = state.names.map((name, index) => `
    <li class="name-item">
      <span class="avatar">${escapeHtml(initials(name))}</span>
      <span>${escapeHtml(name)}</span>
      <button class="remove-name" type="button" data-index="${index}" aria-label="Remove ${escapeHtml(name)}">×</button>
    </li>`).join("");

  elements.count.textContent = state.names.length;
  elements.empty.hidden = state.names.length > 0;
  elements.list.hidden = state.names.length === 0;
  const available = availableNames();
  elements.pick.disabled = available.length === 0 || picking;
  elements.resultHint.textContent = state.names.length
    ? `${available.length} ${available.length === 1 ? "name" : "names"} available this round.`
    : "Add at least two names to begin.";

  elements.history.innerHTML = state.history.slice(0, 10).map(name => `<li>${escapeHtml(name)}</li>`).join("");
  elements.historyEmpty.hidden = state.history.length > 0;
  saveState();
}

function addNames(raw) {
  const candidates = raw.split(/[,;\n]+/).map(name => name.trim()).filter(Boolean);
  let duplicates = 0;
  candidates.forEach(name => {
    if (state.names.some(existing => existing.toLowerCase() === name.toLowerCase())) duplicates += 1;
    else state.names.push(name);
  });
  elements.message.textContent = duplicates ? `${duplicates} duplicate ${duplicates === 1 ? "was" : "were"} skipped.` : "";
  render();
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickWinners() {
  const available = availableNames();
  if (!available.length || picking) return;
  picking = true;
  elements.pick.disabled = true;
  elements.result.classList.add("picking");
  elements.resultLabel.textContent = "Choosing…";
  let ticks = 0;
  const ticker = setInterval(() => {
    elements.winner.textContent = available[Math.floor(Math.random() * available.length)];
    ticks += 1;
    if (ticks < 12) return;
    clearInterval(ticker);
    const count = Math.min(Number(elements.pickCount.value), available.length);
    const winners = shuffle(available).slice(0, count);
    elements.winner.textContent = winners.join(" · ");
    elements.resultLabel.textContent = count === 1 ? "The pick is…" : "The picks are…";
    elements.result.classList.remove("picking");
    state.history.unshift(...winners);
    if (elements.removeToggle.checked) state.picked.push(...winners);
    picking = false;
    render();
  }, 75);
}

elements.form.addEventListener("submit", event => {
  event.preventDefault();
  addNames(elements.input.value);
  elements.input.value = "";
  elements.input.focus();
});

elements.input.addEventListener("paste", event => {
  const text = event.clipboardData.getData("text");
  if (!/[,;\n]/.test(text)) return;
  event.preventDefault();
  addNames(text);
});

elements.list.addEventListener("click", event => {
  const button = event.target.closest(".remove-name");
  if (!button) return;
  const [removed] = state.names.splice(Number(button.dataset.index), 1);
  state.picked = state.picked.filter(name => name !== removed);
  render();
});

elements.clear.addEventListener("click", () => {
  state = { names: [], history: [], picked: [] };
  elements.winner.textContent = "?";
  elements.resultLabel.textContent = "Ready when you are";
  render();
});

elements.shuffle.addEventListener("click", () => {
  state.names = shuffle(state.names);
  render();
});

elements.pick.addEventListener("click", pickWinners);
elements.removeToggle.addEventListener("change", render);
elements.reset.addEventListener("click", () => {
  state.picked = [];
  state.history = [];
  elements.winner.textContent = "?";
  elements.resultLabel.textContent = "Ready when you are";
  render();
});

render();
