
import { createScene } from "./src/scene.js";
import { ShiftTimer } from "./src/timer.js";
import { AnomalyManager } from "./src/anomalies.js";
import { applyAnomaly } from "./src/office.js";
import { Printer } from "./src/printer.js";
import { getEnding } from "./src/endings.js";
import { initAudio, playClick, playAmbient, playReport } from "./src/audio.js";
import { recordResult } from "./src/save.js";

const $ = selector => document.querySelector(selector);

const startScreen = $("#start-screen");
const reportScreen = $("#report-screen");
const message = $("#message");
const prompt = $("#prompt");
const clock = $("#clock");
const sanityBar = $("#sanity");

let game = null;
let timer = null;
let anomalyManager = null;
let printer = null;
let running = false;
let sanity = 100;
let lastMessage = 0;
let messageTimeout = null;
let flickerTime = 0;

function showMessage(text, duration = 3500) {
  message.textContent = text;
  lastMessage = performance.now();
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    if (performance.now() - lastMessage >= duration) message.textContent = "";
  }, duration);
}

function changeSanity(amount) {
  sanity = Math.max(0, Math.min(100, sanity + amount));
  sanityBar.style.width = `${sanity}%`;
  document.body.classList.toggle("danger", sanity < 35);

  if (sanity <= 0 && running) finishGame();
}

function finishGame() {
  if (!running) return;
  running = false;
  timer.stop();
  document.exitPointerLock?.();

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
  $("#report-score").textContent =
    `ОТЧЁТЫ: ${anomalyManager.correct} · ОШИБКИ: ${anomalyManager.errors} · СЧЁТ: ${score}`;

  reportScreen.classList.remove("hidden");
  playReport();
}

function beginGame() {
  initAudio();
  startScreen.classList.add("hidden");
  reportScreen.classList.add("hidden");

  if (game) {
    game.renderer.domElement.remove();
    window.location.reload();
    return;
  }

  game = createScene();
  printer = new Printer(game.scene);
  running = true;
  sanity = 100;
  sanityBar.style.width = "100%";

  anomalyManager = new AnomalyManager({
    onMessage: text => showMessage(text, 5000),
    onChange: anomaly => applyAnomaly(game.scene, anomaly),
    onPenalty: penalty => changeSanity(-penalty)
  });

  timer = new ShiftTimer(
    600,
    seconds => {
      clock.textContent = formatShiftTime(seconds);
      if (seconds < 60) clock.style.color = "#ff3445";
    },
    finishGame
  );

  anomalyManager.start();
  timer.start();
  playAmbient();
  game.renderer.domElement.requestPointerLock?.();
}

function formatShiftTime(seconds) {
  const total = Math.ceil(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function interact() {
  if (!running || !game) return;

  const target = game.update(0);
  if (!target) {
    showMessage("ЗДЕСЬ НЕЧЕГО ПРОВЕРЯТЬ.", 1500);
    return;
  }

  const name = target.name;
  playClick();

  if (name === "printer") {
    showMessage(printer.print());
    return;
  }

  if (anomalyManager.active) {
    anomalyManager.report();
    changeSanity(4);
  } else {
    showMessage("ОСМОТР ЗАВЕРШЁН. ИЗМЕНЕНИЙ НЕ ЗАМЕЧЕНО.", 2000);
    changeSanity(-1);
  }
}

let previous = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  if (!game) return;

  const delta = Math.min((now - previous) / 1000, 0.05);
  previous = now;

  if (running) {
    const target = game.update(delta);

    if (target) {
      prompt.textContent = `[E] ПРОВЕРИТЬ: ${target.name.toUpperCase()}`;
    } else {
      prompt.textContent = "R — СООБЩИТЬ ОБ АНОМАЛИИ";
    }

    anomalyManager.update();

    flickerTime += delta;
    if (anomalyManager.active?.id === "light") {
      game.lamp.intensity = Math.random() > 0.5 ? 28 : 1;
    } else {
      game.lamp.intensity = 28;
    }

    // Постепенно снижаем состояние во время активной аномалии.
    if (anomalyManager.active && Math.random() < delta * 0.1) {
      changeSanity(-1);
    }
  }

  game.render();
}

document.addEventListener("keydown", event => {
  if (!running) return;

  if (event.code === "KeyE") interact();

  if (event.code === "KeyR") {
    anomalyManager.report();
    if (!anomalyManager.active) changeSanity(-8);
    else changeSanity(4);
  }

  if (event.code === "Escape") {
    showMessage("НЕ ПОКИДАЙ РАБОЧЕЕ МЕСТО.", 2500);
  }
});

$("#start-button").addEventListener("click", beginGame);
$("#restart-button").addEventListener("click", () => window.location.reload());

requestAnimationFrame(frame);