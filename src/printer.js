
import { playClick } from "./audio.js";

export class Printer {
  constructor(scene) {
    this.scene = scene;
    this.busy = false;
    this.pages = 0;
  }

  print() {
    if (this.busy) return "ПРИНТЕР УЖЕ РАБОТАЕТ.";

    this.busy = true;
    this.pages++;
    playClick();

    setTimeout(() => {
      this.busy = false;
    }, 1800);

    return "ПРИНТЕР ВЫДАЛ ЛИСТ. НА НЁМ НИЧЕГО НЕТ.";
  }
}