
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createScene() {
  // ─────────────────────────────────────────────
  // ОСНОВА СЦЕНЫ
  // ─────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b13);
  scene.fog = new THREE.FogExp2(0x080b13, 0.035);

  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  const PLAYER_HEIGHT = 1.65;
  camera.position.set(0, PLAYER_HEIGHT, 5);
  camera.rotation.order = "YXZ";

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  document.querySelector("#game").prepend(renderer.domElement);

  // ─────────────────────────────────────────────
  // МАТЕРИАЛЫ
  // ─────────────────────────────────────────────

  const materials = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x252b36,
      roughness: 0.72
    }),

    wall: new THREE.MeshStandardMaterial({
      color: 0x343b49,
      roughness: 0.92
    }),

    darkWall: new THREE.MeshStandardMaterial({
      color: 0x171d29,
      roughness: 0.85
    }),

    ceiling: new THREE.MeshStandardMaterial({
      color: 0x252c39,
      roughness: 0.95
    }),

    desk: new THREE.MeshStandardMaterial({
      color: 0x40372f,
      roughness: 0.65
    }),

    metal: new THREE.MeshStandardMaterial({
      color: 0x697487,
      metalness: 0.55,
      roughness: 0.4
    }),

    screen: new THREE.MeshStandardMaterial({
      color: 0x101c2d,
      emissive: 0x142a50,
      emissiveIntensity: 1.3,
      roughness: 0.25
    }),

    glass: new THREE.MeshStandardMaterial({
      color: 0x263b58,
      emissive: 0x0b1d39,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      side: THREE.DoubleSide
    }),

    white: new THREE.MeshStandardMaterial({
      color: 0xb7c4d9,
      roughness: 0.55
    }),

    red: new THREE.MeshStandardMaterial({
      color: 0x9e2738,
      emissive: 0x4a0712,
      emissiveIntensity: 1.4
    }),

    lamp: new THREE.MeshStandardMaterial({
      color: 0xc8dcff,
      emissive: 0x9bc5ff,
      emissiveIntensity: 2.2
    }),

    black: new THREE.MeshStandardMaterial({
      color: 0x080a10,
      roughness: 0.6
    })
  };

  // ─────────────────────────────────────────────
  // СВЕТ
  // ─────────────────────────────────────────────

  scene.add(new THREE.HemisphereLight(0x9fbfff, 0x15131b, 1.0));

  const ambient = new THREE.AmbientLight(0x8297c4, 0.3);
  scene.add(ambient);

  const lamp = new THREE.PointLight(0xa8caff, 28, 19, 1.7);
  lamp.position.set(0, 2.8, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  scene.add(lamp);

  const redLight = new THREE.PointLight(0xff263e, 3, 7);
  redLight.position.set(-4, 2.3, -5);
  scene.add(redLight);

  const blueLight = new THREE.PointLight(0x315cff, 4, 10);
  blueLight.position.set(4, 2.5, -6);
  scene.add(blueLight);

  // ─────────────────────────────────────────────
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ─────────────────────────────────────────────

  const interactables = [];
  const animatedObjects = [];

  function box(
    name,
    x,
    y,
    z,
    width,
    height,
    depth,
    material,
    options = {}
  ) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;

    if (options.rotationY) {
      mesh.rotation.y = options.rotationY;
    }

    if (options.rotationX) {
      mesh.rotation.x = options.rotationX;
    }

    scene.add(mesh);

    if (options.interactable) {
      interactables.push(mesh);
    }

    if (options.animate) {
      animatedObjects.push({
        mesh,
        baseY: y,
        speed: options.speed ?? 1,
        amplitude: options.amplitude ?? 0.05,
        phase: Math.random() * Math.PI * 2
      });
    }

    return mesh;
  }

  function addDesk(x, z, index) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);

    function part(name, px, py, pz, w, h, d, mat) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        mat
      );

      mesh.name = name;
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      return mesh;
    }

    // Столешница и ножки
    part("desk", 0, 0.78, 0, 1.9, 0.12, 1.0, materials.desk);

    for (const px of [-0.78, 0.78]) {
      for (const pz of [-0.36, 0.36]) {
        part("desk-leg", px, 0.38, pz, 0.08, 0.76, 0.08, materials.metal);
      }
    }

    // Монитор
    part("monitor", 0, 1.25, -0.25, 0.92, 0.57, 0.09, materials.black);

    const screen = part(
      `monitor-screen-${index}`,
      0,
      1.27,
      -0.195,
      0.82,
      0.45,
      0.015,
      materials.screen
    );

    screen.userData.baseMaterial = materials.screen;

    part("monitor-stand", 0, 0.98, -0.24, 0.08, 0.18, 0.08, materials.metal);
    part("keyboard", 0, 0.86, 0.18, 0.65, 0.035, 0.23, materials.black);

    // Кресло
    part("chair-seat", 0, 0.48, 0.88, 0.58, 0.13, 0.58, materials.black);
    part("chair-back", 0, 0.92, 1.12, 0.58, 0.78, 0.12, materials.black);
    part("chair-post", 0, 0.24, 0.88, 0.08, 0.42, 0.08, materials.metal);

    for (const px of [-0.23, 0.23]) {
      part("chair-foot", px, 0.08, 0.88, 0.42, 0.05, 0.06, materials.metal);
    }

    // Бумаги на столе
    part("paper-stack", -0.57, 0.86, 0.17, 0.3, 0.035, 0.38, materials.white);

    const computer = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.32, 0.32),
      materials.metal
    );

    computer.position.set(0.76, 0.98, -0.22);
    computer.name = `computer-${index}`;
    computer.castShadow = true;
    group.add(computer);

    return group;
  }

  // ─────────────────────────────────────────────
  // ПОМЕЩЕНИЕ
  // ─────────────────────────────────────────────

  box("floor", 0, -0.15, -3, 16, 0.3, 22, materials.floor);
  box("ceiling", 0, 3.4, -3, 16, 0.25, 22, materials.ceiling);

  // Боковые стены
  box("left-wall", -8, 1.6, -3, 0.25, 3.2, 22, materials.wall);
  box("right-wall", 8, 1.6, -3, 0.25, 3.2, 22, materials.wall);

  // Задняя стена
  box("back-wall", 0, 1.6, -14, 16, 3.2, 0.25, materials.wall);

  // Передняя стена с проходом
  box("front-wall-left", -5.5, 1.6, 8, 5, 3.2, 0.25, materials.wall);
  box("front-wall-right", 5.5, 1.6, 8, 5, 3.2, 0.25, materials.wall);
  box("front-wall-top", 0, 2.7, 8, 6, 1.0, 0.25, materials.wall);

  // Декоративные панели
  for (let i = 0; i < 8; i++) {
    const z = 6 - i * 2.6;

    box("wall-trim-left", -7.82, 1.4, z, 0.035, 2.5, 0.025, materials.metal);
    box("wall-trim-right", 7.82, 1.4, z, 0.035, 2.5, 0.025, materials.metal);
  }

  // Окна на задней стене
  for (let i = 0; i < 4; i++) {
    const x = -5.5 + i * 3.65;

    box("window", x, 2.0, -13.82, 2.7, 1.65, 0.05, materials.glass, {
      interactable: true
    });

    box("window-frame-top", x, 2.84, -13.76, 2.8, 0.06, 0.09, materials.metal);
    box("window-frame-bottom", x, 1.16, -13.76, 2.8, 0.06, 0.09, materials.metal);
    box("window-frame-left", x - 1.38, 2.0, -13.76, 0.06, 1.7, 0.09, materials.metal);
    box("window-frame-right", x + 1.38, 2.0, -13.76, 0.06, 1.7, 0.09, materials.metal);
    box("window-divider", x, 2.0, -13.74, 0.04, 1.65, 0.1, materials.metal);
  }

  // ─────────────────────────────────────────────
  // ДВЕРЬ
  // ─────────────────────────────────────────────

  box("door-frame-left", -1.55, 1.45, -13.65, 0.15, 2.9, 0.2, materials.metal);
  box("door-frame-right", 1.55, 1.45, -13.65, 0.15, 2.9, 0.2, materials.metal);
  box("door-frame-top", 0, 2.9, -13.65, 3.2, 0.15, 0.2, materials.metal);

  box("door", 0, 1.4, -13.55, 2.9, 2.75, 0.12, materials.darkWall, {
    interactable: true
  });

  box("door-handle", 1.0, 1.3, -13.45, 0.07, 0.22, 0.07, materials.lamp);

  // ─────────────────────────────────────────────
  // РАБОЧИЕ МЕСТА
  // ─────────────────────────────────────────────

  addDesk(-4.3, 3.2, 1);
  addDesk(0, 3.2, 2);
  addDesk(4.3, 3.2, 3);

  addDesk(-4.3, -2.0, 4);
  addDesk(0, -2.0, 5);
  addDesk(4.3, -2.0, 6);

  addDesk(-4.3, -7.2, 7);
  addDesk(0, -7.2, 8);
  addDesk(4.3, -7.2, 9);

  // ─────────────────────────────────────────────
  // ПРИНТЕР
  // ─────────────────────────────────────────────

  box("printer", -6.1, 1.0, -5.2, 0.9, 0.65, 0.7, materials.white, {
    interactable: true
  });

  box("printer-top", -6.1, 1.34, -5.2, 0.94, 0.07, 0.73, materials.metal);
  box("printer-slot", -6.1, 1.05, -4.82, 0.55, 0.06, 0.025, materials.black);
  box("printer-light", -5.7, 1.12, -4.81, 0.06, 0.035, 0.025, materials.lamp);

  // ─────────────────────────────────────────────
  // СТОЙКА ОХРАНЫ
  // ─────────────────────────────────────────────

  box("security-desk", 0, 0.7, 6.4, 3.8, 1.1, 0.7, materials.desk);
  box("security-monitor", 0, 1.55, 6.25, 1.2, 0.75, 0.12, materials.black);
  box("security-screen", 0, 1.55, 6.17, 1.05, 0.6, 0.025, materials.screen);

  // ─────────────────────────────────────────────
  // ПОТОЛОЧНЫЕ ЛАМПЫ
  // ─────────────────────────────────────────────

  const ceilingLights = [];

  for (let i = 0; i < 5; i++) {
    const z = 5 - i * 4;

    box("ceiling-light", 0, 3.23, z, 2.3, 0.04, 0.5, materials.lamp);

    const light = new THREE.PointLight(0xa6c7ff, 8, 8, 2);
    light.position.set(0, 3.0, z);
    scene.add(light);
    ceilingLights.push(light);
  }

  // Красная аварийная лампа
  box("alarm-light", -7.65, 2.8, 7.3, 0.12, 0.12, 0.12, materials.red);

  const alarmLight = new THREE.PointLight(0xff263e, 0.8, 5);
  alarmLight.position.set(-7.2, 2.7, 7.0);
  scene.add(alarmLight);

  // ─────────────────────────────────────────────
  // КАМЕРА И УПРАВЛЕНИЕ
  // ─────────────────────────────────────────────

  const keys = new Set();
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);

  let yaw = 0;
  let pitch = 0;
  let targetObject = null;
  let elapsed = 0;

  const player = {
    speed: 3.2,
    radius: 0.35
  };

  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();

  let pointerLocked = false;

  function onKeyDown(event) {
    if (
      ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)
    ) {
      keys.add(event.code);
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    if (!pointerLocked) return;

    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;

    pitch = THREE.MathUtils.clamp(
      pitch,
      -Math.PI / 2.2,
      Math.PI / 2.2
    );

    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }

  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === renderer.domElement;
  }

  function onCanvasClick() {
    const startScreen = document.querySelector("#start-screen");

    if (
      startScreen?.classList.contains("hidden") &&
      !document.querySelector("#pause-screen")?.classList.contains("hidden")
    ) {
      return;
    }

    if (startScreen?.classList.contains("hidden")) {
      renderer.domElement.requestPointerLock?.();
    }
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  renderer.domElement.addEventListener("click", onCanvasClick);

  // ─────────────────────────────────────────────
  // СТОЛКНОВЕНИЯ
  // ─────────────────────────────────────────────

  const colliders = [
    { x: -8, z: -3, w: 0.5, d: 22 },
    { x: 8, z: -3, w: 0.5, d: 22 },
    { x: 0, z: -14, w: 16, d: 0.5 },
    { x: -5.5, z: 8, w: 5, d: 0.5 },
    { x: 5.5, z: 8, w: 5, d: 0.5 }
  ];

  function collides(x, z) {
    const r = player.radius;

    // Границы помещения
    if (x < -7.5 || x > 7.5 || z < -13.3 || z > 7.5) {
      return true;
    }

    // Стойка охраны
    if (
      Math.abs(x) < 2.15 &&
      Math.abs(z - 6.4) < 0.65 + r
    ) {
      return true;
    }

    // Столы, кресла и оборудование
    const deskPositions = [
      [-4.3, 3.2], [0, 3.2], [4.3, 3.2],
      [-4.3, -2.0], [0, -2.0], [4.3, -2.0],
      [-4.3, -7.2], [0, -7.2], [4.3, -7.2]
    ];

    for (const [dx, dz] of deskPositions) {
      if (
        Math.abs(x - dx) < 1.05 + r &&
        Math.abs(z - dz) < 0.9 + r
      ) {
        return true;
      }
    }

    return false;
  }

  // ─────────────────────────────────────────────
  // ОБНОВЛЕНИЕ
  // ─────────────────────────────────────────────

  function update(delta = 0) {
    elapsed += delta;

    // Движение по направлению взгляда
    direction.set(
      -Math.sin(yaw),
      0,
      -Math.cos(yaw)
    );

    const right = new THREE.Vector3(
      Math.cos(yaw),
      0,
      -Math.sin(yaw)
    );

    velocity.set(0, 0, 0);

    if (keys.has("KeyW")) velocity.add(direction);
    if (keys.has("KeyS")) velocity.sub(direction);
    if (keys.has("KeyD")) velocity.add(right);
    if (keys.has("KeyA")) velocity.sub(right);

    if (velocity.lengthSq() > 0) {
      velocity.normalize();

      const speed = player.speed *
        (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.5 : 1);

      const nextX = camera.position.x + velocity.x * speed * delta;
      const nextZ = camera.position.z + velocity.z * speed * delta;

      if (!collides(nextX, camera.position.z)) {
        camera.position.x = nextX;
      }

      if (!collides(camera.position.x, nextZ)) {
        camera.position.z = nextZ;
      }
    }

    // Подсветка предмета в центре экрана
    raycaster.setFromCamera(center, camera);

    const hits = raycaster.intersectObjects(interactables, false);
    targetObject = null;

    if (hits.length && hits[0].distance < 3.2) {
      targetObject = hits[0].object;
    }

    // Анимация плавающих объектов
    for (const item of animatedObjects) {
      item.mesh.position.y =
        item.baseY +
        Math.sin(elapsed * item.speed + item.phase) * item.amplitude;
    }

    // Лёгкое мерцание аварийной лампы
    alarmLight.intensity = 0.6 + (Math.sin(elapsed * 4) + 1) * 0.35;

    return targetObject;
  }

  function render() {
    renderer.render(scene, camera);
  }

  // ─────────────────────────────────────────────
  // ИЗМЕНЕНИЕ РАЗМЕРА ОКНА
  // ─────────────────────────────────────────────

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  window.addEventListener("resize", onResize);

  // ─────────────────────────────────────────────
  // ВОЗВРАЩАЕМ ОБЪЕКТЫ ДЛЯ game.js
  // ─────────────────────────────────────────────

  return {
    scene,
    camera,
    renderer,
    update,
    render,
    box,
    lamp,
    materials,
    keys,
    interactables,
    ceilingLights,
    alarmLight
  };
}
