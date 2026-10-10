
export class ShiftTimer {
  constructor(durationSeconds = 600, onUpdate = () => {}, onEnd = () => {}) {
    this.duration = durationSeconds;
    this.remaining = durationSeconds;
    this.onUpdate = onUpdate;
    this.onEnd = onEnd;
    this.running = false;
    this.lastTime = 0;
    this.frame = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
  }

  tick = () => {
    if (!this.running) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.remaining = Math.max(0, this.remaining - delta);

    this.onUpdate(this.remaining);

    if (this.remaining <= 0) {
      this.running = false;
      this.onEnd();
      return;
    }

    this.frame = requestAnimationFrame(this.tick);
  };

  stop() {
    this.running = false;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
  }

  reset() {
    this.stop();
    this.remaining = this.duration;
  }

  format() {
    const total = Math.ceil(this.remaining);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}