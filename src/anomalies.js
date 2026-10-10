
import { getRandomCase } from "./cases.js";
import { playWarning } from "./audio.js";

export class AnomalyManager {
  constructor({ onMessage, onChange, onPenalty }) {
    this.onMessage = onMessage;
    this.onChange = onChange;
    this.onPenalty = onPenalty;
    this.active = null;
    this.seen = [];
    this.errors = 0;
    this.correct = 0;
    this.lastSpawn = 0;
  }

  start() {
    this.lastSpawn = performance.now();
    this.spawn();
  }

  spawn() {
    if (this.active) return;

    const anomaly = getRandomCase(this.seen);
    if (!anomaly) {
      this.seen = [];
      this.spawn();
      return;
    }

    this.active = anomaly;
    this.seen.push(anomaly.id);
    this.lastSpawn = performance.now();

    this.onChange(anomaly);
    this.onMessage(`АНОМАЛИЯ: ${anomaly.message}`);
    playWarning();
  }

  report() {
    if (!this.active) {
      this.errors++;
      this.onPenalty(8);
      this.onMessage("ОШИБКА: НИКАКОЙ АНОМАЛИИ НЕ ОБНАРУЖЕНО.");
      return false;
    }

    this.correct++;
    this.onMessage(`ОТЧЁТ ПРИНЯТ: ${this.active.title.toUpperCase()}.`);
    this.active = null;
    this.onChange(null);
    return true;
  }

  ignore() {
    if (!this.active) return;

    this.errors++;
    this.onPenalty(12);
    this.onMessage("АНОМАЛИЯ ПРОПУЩЕНА. ОФИС ЗАПОМНИТ ЭТО.");
    this.active = null;
    this.onChange(null);
  }

  update() {
    if (!this.active && performance.now() - this.lastSpawn > 18000) {
      this.spawn();
    }

    if (this.active && performance.now() - this.lastSpawn > 30000) {
      this.ignore();
    }
  }
}