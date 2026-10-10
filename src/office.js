
export function applyAnomaly(scene, anomaly) {
  const objects = scene.children;
  const find = name => objects.find(obj => obj.name === name);

  // Сначала возвращаем основные предметы в исходное состояние.
  const chair = find("chair-seat");
  const chairBack = find("chair-back");
  if (chair) chair.position.set(0, 0.55, 0.1);
  if (chairBack) chairBack.position.set(0, 1.0, 0.4);

  const door = find("door");
  if (door) door.rotation.y = 0;

  const monitorScreen = find("monitor-screen");
  if (monitorScreen) monitorScreen.material.color.set(0x751b25);

  const phone = find("phone");
  if (phone) phone.position.set(-0.85, 1.05, -1.05);

  const printer = find("printer");
  if (printer) printer.position.y = 1.1;

  const clock = find("clock");
  if (clock) clock.material.color.set(0xddd4bc);

  if (!anomaly) return;

  switch (anomaly.id) {
    case "chair":
      if (chair) chair.position.x = 1.25;
      if (chairBack) chairBack.position.x = 1.25;
      break;

    case "light":
      // Обработчик мерцания включён в game.js.
      break;

    case "paper":
      if (monitorScreen) monitorScreen.material.color.set(0xe6e2d4);
      break;

    case "shadow": {
      let shadow = find("anomaly-shadow");
      if (!shadow) {
        const geometry = new THREE.PlaneGeometry(1.3, 2.2);
        const material = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        shadow = new THREE.Mesh(geometry, material);
        shadow.name = "anomaly-shadow";
        shadow.position.set(-3.8, 1.2, -4.75);
        scene.add(shadow);
      }
      shadow.visible = true;
      break;
    }

    case "door":
      if (door) {
        door.position.x = -2.3;
        door.material.color.set(0x161217);
      }
      break;

    case "monitor":
      if (monitorScreen) monitorScreen.material.color.set(0x20ffab);
      break;

    case "phone":
      if (phone) phone.position.y = 1.35;
      break;

    case "plant":
      // В этой версии вместо растения меняется цвет экрана.
      if (monitorScreen) monitorScreen.material.color.set(0x5c8c42);
      break;

    case "clock":
      if (clock) clock.material.color.set(0x9d2634);
      break;

    case "printer":
      if (printer) printer.position.y = 1.3;
      break;

    case "cabinet":
      {
        const cabinet = find("cabinet");
        if (cabinet) cabinet.material.color.set(0x8b1828);
      }
      break;

    case "window":
      {
        const glass = find("window-glass");
        if (glass) glass.material.emissive.set(0x6b0000);
      }
      break;

    case "duplicate":
      if (chair) chair.position.x = -1.3;
      break;
  }
}

// Three.js доступен как глобальная ссылка через аргумент scene
// и импортируемый модуль в браузере.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";