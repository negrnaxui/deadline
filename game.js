
import { createScene } from "./src/scene.js";

const $ = selector => document.querySelector(selector);

const startScreen = $("#start-screen");
const pauseScreen = $("#pause-screen");
const reportScreen = $("#report-screen");
const hud = $("#hud");
const prompt = $("#prompt");
const clock = $("#clock");
const sanityBar = $("#sanity");
const sanityValue = $("#sanity-value");
const objective = $("#objective");
const progressFill = $("#progress-fill");

let game = null;
let running = false;
let paused = false;
let finished = false;

let sanity = 100;
let remainingTime = 600;
let lastFrame = performance.now();
let nextAnomalyAt = 0;
let activeAnomaly = null;

let correct = 0;
let mistakes = 0;
let score = 0;
let busy = false;
let audioContext = null;

const reportedTargets = new WeakSet();

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function hide(element) {
  element?.classList.add("hidden");
}

function show(element) {
  element?.classList.remove("hidden");
}

function sound(frequency = 440, duration = 0.08, type = "sine") {
  try {
    audioContext ??= new AudioContext();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.045, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Игра продолжает работать, даже если звук недоступен.
  }
}

function updateSanity(amount) {
  sanity = Math.max(0, Math.min(100, sanity + amount));

  if (sanityBar) {
    sanityBar.style.width = `${sanity}%`;
  }

  setText("#sanity-value", `${Math.round(sanity)}%`);

  if (sanityValue) {
    sanityValue.style.color =
      sanity > 60 ? "#52e2ae" :
      sanity > 30 ? "#ffc45c" :
      "#ff4b60";
  }

  document.body.classList.toggle("danger", sanity <= 30);

  if (sanity <= 0 && running) {
    finishGame("sanity");
  }
}

function updateProgress() {
  setText("#report-count", `${correct} найдено`);

  if (progressFill) {
    progressFill.style.width = `${Math.min(100, correct / 10 * 100)}%`;
  }
}

function updateClock() {
  const total = Math.max(0, Math.ceil(remainingTime));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  setText(
    "#clock",
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  );

  if (clock) {
    clock.style.color = total <= 60 ? "#ff4b60" : "#edf3ff";
  }
}

function chooseTarget() {
  if (!game || game.anomalyTargets.length === 0) return null;

  const candidates = game.anomalyTargets.filter(target =>
    target.visible &&
    !reportedTargets.has(target) &&
    !target.userData.isAnomaly &&
    !target.userData.fading
  );

  if (!candidates.length) {
    // После полного осмотра можно снова использовать предметы.
    for (const target of game.anomalyTargets) {
      reportedTargets.delete(target);
    }

    return chooseTarget();
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function spawnAnomaly() {
  if (!running || paused || activeAnomaly || !game) return;

  const target = chooseTarget();
  if (!target) return;

  const kinds = ["displaced", "screen", "enlarged", "dark"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  game.setAnomaly(target, kind);

  activeAnomaly = {
    target,
    kind,
    startedAt: performance.now()
  };

  // Не сообщаем игроку о появлении аномалии.
  // Не показываем всплывающие окна или предупреждения.
  nextAnomalyAt = performance.now() + 12000 + Math.random() * 10000;
}

async function detectAnomaly(target) {
  if (!running || paused || busy || !target) return;

  if (target.name === "printer") {
    sound(520, 0.07);
    setText("#objective", "Принтер: устройство работает.");
    return;
  }

  if (!activeAnomaly) {
    // Не подсказываем игроку, правильно ли он проверил предмет.
    updateSanity(-0.5);
    sound(150, 0.05, "triangle");
    return;
  }

  if (target !== activeAnomaly.target) {
    // Неправильная проверка не вызывает никаких уведомлений.
    mistakes++;
    updateSanity(-3);
    sound(110, 0.12, "triangle");
    return;
  }

  busy = true;

  const anomaly = activeAnomaly;
  activeAnomaly = null;

  correct++;
  score += 100;
  updateSanity(4);
  updateProgress();

  // Плавно скрываем изменённый предмет.
  await game.fadeOutObject(anomaly.target, 350);

  // После обнаружения возвращаем предмет к нормальному виду.
  game.clearAnomaly(anomaly.target);
  anomaly.target.visible = true;
  reportedTargets.add(anomaly.target);

  sound(680, 0.1);
  setText("#objective", "Продолжай осмотр помещения.");

  nextAnomalyAt = performance.now() + 5000 + Math.random() * 5000;
  busy = false;
}

function pauseGame() {
  if (!running || paused || finished) return;

  paused = true;
  show(pauseScreen);
  document.exitPointerLock?.();
  sound(260, 0.06);
}

function resumeGame() {
  if (!running || !paused || finished) return;

  paused = false;
  hide(pauseScreen);
  lastFrame = performance.now();
  sound(420, 0.06);
  game.renderer.domElement.requestPointerLock?.();
}

function finishGame(reason = "time") {
  if (finished) return;

  finished = true;
  running = false;
  paused = false;
  document.exitPointerLock?.();

  hide(pauseScreen);
  hide(hud);

  const title = reason === "sanity"
    ? "СОЗНАНИЕ ПОТЕРЯНО"
    : "СМЕНА ЗАВЕРШЕНА";

  const text = reason === "sanity"
    ? "Ты больше не можешь доверять собственным глазам."
    : "Смена закончилась. Но всё ли ты заметил?";

  setText("#report-title", title);
  setText("#report-text", text);
  setText("#result-correct", correct);
  setText("#result-errors", mistakes);
  setText("#result-score", score + Math.round(sanity));

  show(reportScreen);
  sound(reason === "sanity" ? 90 : 330, 0.5, "sawtooth");

  try {
    localStorage.setItem("deadline13-best", String(Math.max(
      Number(localStorage.getItem("deadline13-best") || 0),
      score + Math.round(sanity)
    )));
  } catch {
    // Хранилище может быть недоступно.
  }
}

function startGame() {
  if (game) {
    game.dispose();
    game = null;
  }

  sanity = 100;
  remainingTime = 600;
  correct = 0;
  mistakes = 0;
  score = 0;
  busy = false;
  finished = false;
  paused = false;
  running = true;
  activeAnomaly = null;
  nextAnomalyAt = performance.now() + 8000;

  game = createScene();

  hide(startScreen);
  hide(pauseScreen);
  hide(reportScreen);
  show(hud);

  setText("#objective", "Осмотри офис. Ищи предметы, которые выглядят неправильно.");
  setText("#prompt", "WASD — движение · E — осмотреть предмет");
  updateSanity(0);
  updateProgress();
  updateClock();

  lastFrame = performance.now();
  game.renderer.domElement.requestPointerLock?.();
  sound(440, 0.12);
}

function handleInteraction() {
  if (!running || paused || busy || !game) return;

  const target = game.target;

  if (!target) return;

  detectAnomaly(target);
}

function animate(now) {
  requestAnimationFrame(animate);

  if (!game || finished) return;

  const delta = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  if (running && !paused) {
    remainingTime -= delta;

    updateClock();

    if (remainingTime <= 0) {
      remainingTime = 0;
      updateClock();
      finishGame("time");
      return;
    }

    if (!activeAnomaly && now >= nextAnomalyAt) {
      spawnAnomaly();
    }

    const target = game.update(delta);

    if (prompt) {
      if (target) {
        prompt.textContent = `[E] ОСМОТРЕТЬ: ${target.userData.interactionName || target.name}`;
        prompt.style.opacity = "1";
      } else {
        prompt.textContent = "Осматривай помещение";
        prompt.style.opacity = "0.65";
      }
    }

    // Незаметное постепенное снижение рассудка.
    if (Math.random() < delta * 0.08) {
      updateSanity(-0.1);
    }
  }

  game.render();
}

document.addEventListener("keydown", event => {
  if (event.code === "KeyE" && !event.repeat) {
    handleInteraction();
  }

  if (event.code === "Escape") {
    if (running && !paused) {
      pauseGame();
    } else if (running && paused) {
      resumeGame();
    }
  }
});

$("#start-button")?.addEventListener("click", startGame);
$("#resume-button")?.addEventListener("click", resumeGame);
$("#pause-button")?.addEventListener("click", pauseGame);
$("#restart-button")?.addEventListener("click", startGame);
$("#quit-button")?.addEventListener("click", () => finishGame("time"));

requestAnimationFrame(animate);
