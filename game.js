
import { createScene } from "./src/scene.js";
import { ShiftTimer } from "./src/timer.js";
import { AnomalyManager } from "./src/anomalies.js";
import { applyAnomaly } from "./src/office.js";
import { Printer } from "./src/printer.js";
import { getEnding } from "./src/endings.js";
import {
  initAudio,
  playClick,
  playAmbient,
  playReport
} from "./src/audio.js";
import { recordResult } from "./src/save.js";

const $ = selector => document.querySelector(selector);

const startScreen = $("#start-screen");
const pauseScreen = $("#pause-screen");
const reportScreen = $("#report-screen");
const hud = $("#hud");
const alertBox = $("#alert");
const message = $("#message");
const prompt = $("#prompt");
const clock = $("#clock");
const sanityBar = $("#sanity");

let game;
let timer;
let anomalyManager;
let printer;
let running = false;
let paused = false;
let sanity = 100;
let walkingTime = 0;
let previousFrame = performance.now();
let messageTimeout;
let reportCount = 0;
let handledKeys = new Set();

function showMessage(text, duration = 3500) {
  message.textContent = text;
  alertBox.classList.remove("hidden");

  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    if (!anomalyManager?.active) {
      alertBox.classList.add("hidden");
    }
  }, duration);
}

function updateSanity(amount) {
  sanity = Math.max(0, Math.min(100, sanity + amount));

  sanityBar.style.width = `${sanity}%`;
  $("#sanity-value").textContent = `${Math.round(sanity)}%`;

  const color = sanity > 60
    ? "#52e2ae"
    : sanity > 30
      ? "#ffc45c"
      : "#ff4b60";

  $("#sanity-value").style.color = color;

  if (sanity < 35) {
    document.body.classList.add("danger");
  } else {
    document.body.classList.remove("danger");
  }

  if (sanity <= 0 && running) finishGame();
}

function updateReportUI() {
  $("#report-count").textContent = `${reportCount} принято`;
  $("#progress-fill").style.width =
    `${Math.min(100, reportCount / 5 * 100)}%`;
}

function pauseGame() {
  if (!running || paused) return;

  paused = true;
  timer.stop();
  pauseScreen.classList.remove("hidden");
  document.exitPointerLock?.();
  playClick();
}

function resumeGame() {
  if (!running || !paused) return;

  paused = false;
  pauseScreen.classList.add("hidden");
  previousFrame = performance.now();
  timer.start();
  playClick();
  game.renderer.domElement.requestPointerLock?.();
}

function finishGame() {
  if (!running) return;

  running = false;
  paused = false;
  timer.stop();
  document.exitPointerLock?.();

  pauseScreen.classList.add("hidden");
  alertBox.classList.add("hidden");

  const ending = getEnding({
    correct: anomalyManager.correct,
    errors: anomalyManager.errors,
    sanity
  });

  const score = Math.max(
    0,
    anomalyManager.correct * 100 -
    anomalyManager.errors * 50 +
    Math.round(sanity)
  );

  recordResult(score);

  $("#report-title").textContent = ending.title;
  $("#report-text").textContent = ending.text;
  $("#result-correct").textContent = anomalyManager.correct;
  $("#result-errors").textContent = anomalyManager.errors;
  $("#result-score").textContent = score;

  reportScreen.classList.remove("hidden");
  playReport();
}

function beginGame() {
  initAudio();
  playClick();

  // Перезапуск страницы гарантирует чистое состояние сцены и таймера.
  if (game) {
    window.location.reload();
    return;
  }

  startScreen.classList.add("hidden");
  hud.classList.remove("hidden");

  game = createScene();
  printer = new Printer(game.scene);

  running = true;
  paused = false;
  sanity = 100;
  reportCount = 0;

  updateSanity(0);
  updateReportUI();

  anomalyManager = new AnomalyManager({
    onMessage: text => showMessage(text, 5000),

    onChange: anomaly => {
      applyAnomaly(game.scene, anomaly);

      if (anomaly) {
        $("#objective").textContent =
          `Обнаружено изменение: ${anomaly.title}. Найди его и нажми E или R для отчёта.`;

        alertBox.classList.remove("hidden");
        $("#alert-title").textContent = "ОБНАРУЖЕНА АНОМАЛИЯ";
      } else {
        $("#objective").textContent =
          "Осмотри помещение и сообщай об аномалиях.";

        alertBox.classList.add("hidden");
      }
    },

    onPenalty: penalty => updateSanity(-penalty)
  });

  timer = new ShiftTimer(
    600,

    seconds => {
      const total = Math.ceil(seconds);
      const minutes = Math.floor(total / 60);
      const secs = total % 60;

      clock.textContent =
        `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      clock.style.color = seconds < 60 ? "#ff4b60" : "#edf3ff";
    },

    finishGame
  );

  anomalyManager.start();
  timer.start();
  playAmbient();

  game.renderer.domElement.requestPointerLock?.();
}

function reportAnomaly() {
  if (!running || paused) return;

  const hadAnomaly = Boolean(anomalyManager.active);
  anomalyManager.report();

  if (hadAnomaly) {
    reportCount++;
    updateReportUI();
    updateSanity(4);
    playReport();
  } else {
    updateSanity(-8);
  }
}

function interact() {
  if (!running || paused || !game) return;

  const target = game.update(0);

  if (!target) {
    showMessage("Посмотри на предмет, чтобы взаимодействовать.", 1800);
    return;
  }

  playClick();

  if (target.name === "printer") {
    showMessage(printer.print(), 2500);
    return;
  }

  if (anomalyManager.active) {
    reportAnomaly();
  } else {
    showMessage("Изменений не обнаружено. Продолжай осмотр.", 2200);
    updateSanity(-1);
  }
}

function animate(now) {
  requestAnimationFrame(animate);

  if (!game) return;

  const delta = Math.min((now - previousFrame) / 1000, 0.05);
  previousFrame = now;

  if (running && !paused) {
    const target = game.update(delta);

    if (target) {
      prompt.textContent = `[E] ПРОВЕРИТЬ: ${target.name.toUpperCase()}`;
      prompt.style.opacity = "1";
    } else {
      prompt.textContent = "R — СООБЩИТЬ ОБ АНОМАЛИИ";
      prompt.style.opacity = ".75";
    }

    // Плавное покачивание камеры при движении.
    const keys = game.keys;
    if (keys && (
      keys.has("KeyW") || keys.has("KeyA") ||
      keys.has("KeyS") || keys.has("KeyD")
    )) {
      walkingTime += delta * 8;
      game.camera.position.y = 1.65 + Math.sin(walkingTime) * 0.025;
    } else {
      game.camera.position.y += (1.65 - game.camera.position.y) * Math.min(1, delta * 8);
    }

    anomalyManager.update();

    // Мерцание лампы при соответствующей аномалии.
    if (anomalyManager.active?.id === "light") {
      game.lamp.intensity = Math.random() > 0.5 ? 28 : 1;
    } else {
      game.lamp.intensity = 28;
    }
  }

  game.render();
}

document.addEventListener("keydown", event => {
  if (handledKeys.has(event.code)) return;
  handledKeys.add(event.code);

  if (event.code === "Escape" && running && !paused) {
    pauseGame();
    return;
  }

  if (event.code === "KeyE") interact();

  if (event.code === "KeyR") reportAnomaly();
});

document.addEventListener("keyup", event => {
  handledKeys.delete(event.code);
});

$("#start-button").addEventListener("click", beginGame);
$("#pause-button").addEventListener("click", pauseGame);
$("#resume-button").addEventListener("click", resumeGame);
$("#quit-button").addEventListener("click", finishGame);
$("#restart-button").addEventListener("click", () => window.location.reload());

requestAnimationFrame(animate);
