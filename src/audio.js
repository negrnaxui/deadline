
import { loadSave } from "./save.js";

let context;
let master;

export function initAudio() {
  if (context) {
    if (context.state === "suspended") context.resume();
    return;
  }

  context = new AudioContext();
  master = context.createGain();
  master.gain.value = loadSave().volume;
  master.connect(context.destination);
}

export function setVolume(value) {
  if (master) master.gain.value = Math.max(0, Math.min(1, value));
}

function tone(frequency, duration, type = "sine", volume = 0.15) {
  if (!context || !master) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

export function playClick() {
  tone(750, 0.06, "square", 0.06);
}

export function playWarning() {
  tone(180, 0.35, "sawtooth", 0.12);
  setTimeout(() => tone(130, 0.5, "sawtooth", 0.12), 200);
}

export function playAmbient() {
  tone(48, 1.8, "sine", 0.04);
}

export function playReport() {
  tone(440, 0.12, "sine", 0.08);
  setTimeout(() => tone(330, 0.3, "sine", 0.07), 160);
}