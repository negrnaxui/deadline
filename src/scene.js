
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createScene() {
  const root = document.querySelector("#game");
  if (!root) throw new Error('Не найден элемент #game');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080b12");
  scene.fog = new THREE.FogExp2("#080b12", 0.023);

  const camera = new THREE.PerspectiveCamera(
    74,
    innerWidth / innerHeight,
    0.1,
    100
  );
  camera.rotation.order = "YXZ";
  camera.position.set(0, 1.65, 5.5);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  root.prepend(renderer.domElement);

  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: "#303641", roughness: 0.38, metalness: 0.15 }),
    wall: new THREE.MeshStandardMaterial({ color: "#343d4b", roughness: 0.9 }),
    wallDark: new THREE.MeshStandardMaterial({ color: "#151c29", roughness: 0.85 }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#242b38", roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: "#594638", roughness: 0.42 }),
    metal: new THREE.MeshStandardMaterial({ color: "#77869a", roughness: 0.3, metalness: 0.72 }),
    black: new THREE.MeshStandardMaterial({ color: "#10141d", roughness: 0.28, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: "#213c59", emissive: "#10213a", emissiveIntensity: 0.6, roughness: 0.18, metalness: 0.15 }),
    screen: new THREE.MeshStandardMaterial({ color: "#10213a", emissive: "#183c70", emissiveIntensity: 1.8, roughness: 0.25 }),
    paper: new THREE.MeshStandardMaterial({ color: "#c9d1dc", roughness: 0.88 }),
    red: new THREE.MeshStandardMaterial({ color: "#8c2639", emissive: "#4c0918", emissiveIntensity: 1.4 }),
    light: new THREE.MeshStandardMaterial({ color: "#d7e6ff", emissive: "#a9ceff", emissiveIntensity: 2.2 }),
    green: new THREE.MeshStandardMaterial({ color: "#53e7bc", emissive: "#14a979", emissiveIntensity: 2 })
  };

  scene.add(new THREE.HemisphereLight("#c1d6ff", "#211c25", 1.4));
  scene.add(new THREE.AmbientLight("#a1b8e8", 0.25));

  const mainLight = new THREE.PointLight("#b4d1ff", 38, 25, 1.7);
  mainLight.position.set(0, 2.8, -1);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  scene.add(mainLight);

  const redLight = new THREE.PointLight("#ff243d", 1.4, 9);
  redLight.position.set(-7, 2.5, 5.8);
  scene.add(redLight);

  const blueLight = new THREE.PointLight("#496bff", 4, 12);
  blueLight.position.set(5, 2.5, -7);
  scene.add(blueLight);

  const keys = new Set();
  const interactables = [];
  const anomalyTargets = [];
  const animatedLights = [];
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);

  let yaw = 0;
  let pitch = 0;
  let elapsed = 0;
  let pointerLocked = false;
  let currentTarget = null;
  let bobTime = 0;
  let cameraBob = 0;
  let disposed = false;

  const playerHeight = 1.65;
  const playerRadius = 0.32;
  const walkSpeed = 3.2;

  function material(color, roughness = 0.7, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function addBox(name, x, y, z, w, h, d, mat, options = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat
    );
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = true;
    mesh.userData.interactionName = options.interactionName || name;

    if (options.rotationY) mesh.rotation.y = options.rotationY;

    scene.add(mesh);

    if (options.interactable) {
      interactables.push(mesh);
    }

    if (options.anomalyTarget) {
      anomalyTargets.push(mesh);
      mesh.userData.originalPosition = mesh.position.clone();
      mesh.userData.originalRotation = mesh.rotation.clone();
      mesh.userData.originalScale = mesh.scale.clone();
      mesh.userData.originalMaterial = mesh.material;
    }

    return mesh;
  }

  function addCylinder(name, x, y, z, radiusTop, radiusBottom, height, mat) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 20),
      mat
    );
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addDesk(x, z, index) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);

    function part(name, px, py, pz, w, h, d, mat, opts = {}) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.name = name;
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.deskIndex = index;
      g.add(m);

      if (opts.interactable) {
        interactables.push(m);
        m.userData.interactionName = opts.label || name;
      }

      if (opts.anomalyTarget) {
        anomalyTargets.push(m);
        m.userData.originalPosition = m.position.clone();
        m.userData.originalRotation = m.rotation.clone();
        m.userData.originalScale = m.scale.clone();
        m.userData.originalMaterial = m.material;
      }
      return m;
    }

    // Столешница и металлический каркас.
    part("desk-edge", 0, 0.79, 0, 2.02, 0.09, 1.08, mats.metal);
    part("desk", 0, 0.85, 0, 1.98, 0.09, 1.04, mats.wood);

    for (const px of [-0.83, 0.83]) {
      for (const pz of [-0.4, 0.4]) {
        part("desk-leg", px, 0.41, pz, 0.065, 0.72, 0.065, mats.metal);
        part("desk-foot", px, 0.055, pz, 0.16, 0.045, 0.12, mats.black);
      }
    }

    // Монитор: корпус, рамка, экран и подставка.
    part("monitor-case", 0, 1.29, -0.27, 1.0, 0.65, 0.12, mats.black);

    const screen = part(
      `monitor-screen-${index}`,
      0, 1.31, -0.204, 0.89, 0.52, 0.012,
      mats.screen,
      { interactable: true, anomalyTarget: true, label: `Монитор ${index}` }
    );
    screen.userData.anomalyKind = "screen";

    part("monitor-bezel", 0, 1.0, -0.2, 0.96, 0.035, 0.025, mats.metal);
    part("monitor-neck", 0, 0.97, -0.27, 0.09, 0.2, 0.09, mats.metal);
    part("monitor-base", 0, 0.885, -0.27, 0.34, 0.025, 0.2, mats.metal);

    // Светодиод питания.
    part("monitor-led", 0.4, 1.01, -0.181, 0.025, 0.012, 0.012, mats.green);

    // Клавиатура и отдельные клавиши.
    part("keyboard-body", 0, 0.91, 0.2, 0.76, 0.055, 0.27, mats.black, {
      interactable: true,
      anomalyTarget: true,
      label: `Клавиатура ${index}`
    });

    const keyMat = material("#657084", 0.62);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 13; col++) {
        const key = new THREE.Mesh(
          new THREE.BoxGeometry(0.037, 0.012, 0.035),
          keyMat
        );
        key.position.set(-0.32 + col * 0.053, 0.945, 0.11 + row * 0.055);
        key.castShadow = true;
        g.add(key);
      }
    }

    // Мышь и коврик.
    part("mousepad", 0.56, 0.9, 0.21, 0.28, 0.018, 0.3, mats.black);
    const mouse = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      material("#a9b8cb", 0.3, 0.15)
    );
    mouse.name = "mouse";
    mouse.scale.set(0.8, 0.45, 1.2);
    mouse.position.set(0.56, 0.94, 0.2);
    mouse.castShadow = true;
    g.add(mouse);

    // Системный блок.
    part("pc-case", 0.78, 1.12, -0.23, 0.27, 0.48, 0.42, mats.wallDark);
    part("pc-front", 0.78, 1.12, -0.012, 0.23, 0.43, 0.018, mats.metal);
    part("pc-glass", 0.78, 1.12, -0.001, 0.17, 0.35, 0.01, mats.glass);

    for (let i = 0; i < 5; i++) {
      part("pc-vent", 0.78, 0.98 + i * 0.055, 0.009, 0.1, 0.012, 0.008, mats.black);
    }

    // Бумаги и папка.
    part("paper", -0.61, 0.91, 0.18, 0.28, 0.018, 0.36, mats.paper, {
      interactable: true,
      anomalyTarget: true,
      label: `Документы ${index}`
    });
    part("folder", -0.57, 0.94, -0.01, 0.3, 0.025, 0.19, mats.red);

    // Кружка.
    addCylinder(`mug-${index}`, x - 0.68, 1.0, z - 0.31, 0.075, 0.065, 0.15, mats.black);

    // Кресло с основанием, колёсами и подлокотниками.
    part("chair-seat", 0, 0.52, 0.94, 0.62, 0.15, 0.58, mats.black);
    part("chair-back", 0, 0.98, 1.18, 0.62, 0.78, 0.14, mats.black);
    part("chair-back-pad", 0, 1.0, 1.1, 0.49, 0.58, 0.025, mats.wallDark);

    for (const px of [-0.36, 0.36]) {
      part("chair-arm", px, 0.69, 0.91, 0.07, 0.055, 0.42, mats.metal);
      part("chair-arm-support", px, 0.61, 0.92, 0.045, 0.17, 0.045, mats.metal);
    }

    addCylinder("chair-post", x, 0.28, z + 0.94, 0.055, 0.07, 0.4, mats.metal);

    return g;
  }

  // Геометрия офиса.
  addBox("floor", 0, -0.15, -3, 16, 0.3, 22, mats.floor);
  addBox("ceiling", 0, 3.4, -3, 16, 0.25, 22, mats.ceiling);
  addBox("left-wall", -8, 1.6, -3, 0.25, 3.2, 22, mats.wall);
  addBox("right-wall", 8, 1.6, -3, 0.25, 3.2, 22, mats.wall);
  addBox("back-wall", 0, 1.6, -14, 16, 3.2, 0.25, mats.wall);
  addBox("front-wall-left", -5.5, 1.6, 8, 5, 3.2, 0.25, mats.wall);
  addBox("front-wall-right", 5.5, 1.6, 8, 5, 3.2, 0.25, mats.wall);
  addBox("front-wall-top", 0, 2.7, 8, 6, 1, 0.25, mats.wall);

  // Плинтусы и декоративные стеновые панели.
  addBox("baseboard-left", -7.82, 0.12, -3, 0.04, 0.2, 21.5, mats.metal);
  addBox("baseboard-right", 7.82, 0.12, -3, 0.04, 0.2, 21.5, mats.metal);

  for (let i = 0; i < 8; i++) {
    const z = 6 - i * 2.6;
    addBox("wall-panel-left", -7.82, 1.45, z, 0.035, 2.5, 0.025, mats.metal);
    addBox("wall-panel-right", 7.82, 1.45, z, 0.035, 2.5, 0.025, mats.metal);
  }

  // Окна с рамами и стеклом.
  for (let i = 0; i < 4; i++) {
    const x = -5.5 + i * 3.65;

    addBox(`window-${i + 1}`, x, 2, -13.82, 2.7, 1.65, 0.05, mats.glass, {
      interactable: true,
      anomalyTarget: true,
      label: `Окно ${i + 1}`
    });

    addBox("window-frame-top", x, 2.84, -13.76, 2.8, 0.06, 0.09, mats.metal);
    addBox("window-frame-bottom", x, 1.16, -13.76, 2.8, 0.06, 0.09, mats.metal);
    addBox("window-frame-left", x - 1.38, 2, -13.76, 0.06, 1.7, 0.09, mats.metal);
    addBox("window-frame-right", x + 1.38, 2, -13.76, 0.06, 1.7, 0.09, mats.metal);
    addBox("window-divider", x, 2, -13.74, 0.04, 1.65, 0.1, mats.metal);
  }

  // Дверь.
  addBox("door-frame-left", -1.55, 1.45, -13.65, 0.15, 2.9, 0.2, mats.metal);
  addBox("door-frame-right", 1.55, 1.45, -13.65, 0.15, 2.9, 0.2, mats.metal);
  addBox("door-frame-top", 0, 2.9, -13.65, 3.2, 0.15, 0.2, mats.metal);

  addBox("door", 0, 1.4, -13.55, 2.9, 2.75, 0.12, mats.wallDark, {
    interactable: true,
    anomalyTarget: true,
    label: "Дверь"
  });

  addBox("door-handle", 1, 1.3, -13.45, 0.07, 0.22, 0.07, mats.light);

  // Рабочие места.
  const deskPositions = [
    [-4.3, 3.2], [0, 3.2], [4.3, 3.2],
    [-4.3, -2], [0, -2], [4.3, -2],
    [-4.3, -7.2], [0, -7.2], [4.3, -7.2]
  ];

  deskPositions.forEach(([x, z], i) => addDesk(x, z, i + 1));

  // Принтер.
  addBox("printer", -6.1, 1, -5.2, 0.9, 0.65, 0.7, mats.paper, {
    interactable: true,
    label: "Принтер"
  });
  addBox("printer-top", -6.1, 1.34, -5.2, 0.94, 0.07, 0.73, mats.metal);
  addBox("printer-slot", -6.1, 1.05, -4.82, 0.55, 0.06, 0.025, mats.black);
  addBox("printer-light", -5.7, 1.12, -4.81, 0.06, 0.035, 0.025, mats.green);

  // Стойка охраны.
  addBox("security-desk", 0, 0.7, 6.4, 3.8, 1.1, 0.7, mats.wood);
  addBox("security-monitor", 0, 1.55, 6.25, 1.2, 0.75, 0.12, mats.black);
  addBox("security-screen", 0, 1.55, 6.17, 1.05, 0.6, 0.025, mats.screen, {
    interactable: true,
    anomalyTarget: true,
    label: "Экран охраны"
  });

  // Светильники.
  for (let i = 0; i < 5; i++) {
    const z = 5 - i * 4;
    addBox("ceiling-light", 0, 3.23, z, 2.3, 0.04, 0.5, mats.light, { castShadow: false });

    const light = new THREE.PointLight("#a6c7ff", 8, 8, 2);
    light.position.set(0, 3, z);
    scene.add(light);
    animatedLights.push(light);
  }

  addBox("alarm-light", -7.65, 2.8, 7.3, 0.12, 0.12, 0.12, mats.red);

  // Движение мышью и клавиатурой.
  function keyDown(event) {
    keys.add(event.code);
  }

  function keyUp(event) {
    keys.delete(event.code);
  }

  function mouseMove(event) {
    if (!pointerLocked) return;
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = THREE.MathUtils.clamp(pitch, -1.25, 1.25);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }

  function pointerLockChange() {
    pointerLocked = document.pointerLockElement === renderer.domElement;
  }

  function canvasClick() {
    if (document.querySelector("#start-screen:not(.hidden)")) return;
    if (document.querySelector("#pause-screen:not(.hidden)")) return;
    renderer.domElement.requestPointerLock?.();
  }

  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);
  document.addEventListener("mousemove", mouseMove);
  document.addEventListener("pointerlockchange", pointerLockChange);
  renderer.domElement.addEventListener("click", canvasClick);

  function collides(x, z) {
    const r = playerRadius;

    if (x < -7.45 || x > 7.45 || z < -13.35 || z > 7.4) return true;

    // Проход через переднюю стену.
    if (z > 7.45 && Math.abs(x) > 2.7) return true;

    // Стойка охраны.
    if (Math.abs(x) < 2.15 + r && Math.abs(z - 6.4) < 0.55 + r) return true;

    // Столы. Оставляем проходы между рядами.
    for (const [dx, dz] of deskPositions) {
      if (Math.abs(x - dx) < 0.95 + r && Math.abs(z - dz) < 0.72 + r) {
        return true;
      }
    }

    return false;
  }

  function update(delta = 0) {
    if (disposed) return null;

    delta = Math.min(Math.max(delta, 0), 0.05);
    elapsed += delta;

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const velocity = new THREE.Vector3();

    if (keys.has("KeyW")) velocity.add(forward);
    if (keys.has("KeyS")) velocity.sub(forward);
    if (keys.has("KeyD")) velocity.add(right);
    if (keys.has("KeyA")) velocity.sub(right);

    const moving = velocity.lengthSq() > 0;

    if (moving) {
      velocity.normalize();

      const speed = walkSpeed *
        (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.45 : 1);

      const nextX = camera.position.x + velocity.x * speed * delta;
      const nextZ = camera.position.z + velocity.z * speed * delta;

      if (!collides(nextX, camera.position.z)) camera.position.x = nextX;
      if (!collides(camera.position.x, nextZ)) camera.position.z = nextZ;

      bobTime += delta * 9 * (speed / walkSpeed);
      cameraBob = Math.sin(bobTime) * 0.035;
    } else {
      cameraBob *= Math.max(0, 1 - delta * 7);
    }

    camera.position.y = playerHeight + cameraBob;

    animatedLights.forEach((light, i) => {
      light.intensity = 7.7 + Math.sin(elapsed * 1.2 + i) * 0.25;
    });

    redLight.intensity = 1.2 + Math.sin(elapsed * 2.4) * 0.25;

    raycaster.setFromCamera(center, camera);
    const hits = raycaster.intersectObjects(interactables, false);
    currentTarget = hits.length && hits[0].distance < 3.2 ? hits[0].object : null;

    return currentTarget;
  }

  function fadeOutObject(object, duration = 350) {
    if (!object || object.userData.fading) return Promise.resolve();

    object.userData.fading = true;
    const materialsToFade = [];

    object.traverse(child => {
      if (!child.isMesh || !child.material) return;

      const originals = Array.isArray(child.material)
        ? child.material
        : [child.material];

      const clones = originals.map(original => {
        const clone = original.clone();
        clone.transparent = true;
        materialsToFade.push({
          material: clone,
          opacity: original.opacity ?? 1
        });
        return clone;
      });

      child.material = Array.isArray(child.material) ? clones : clones[0];
    });

    const start = performance.now();

    return new Promise(resolve => {
      function step(now) {
        const t = Math.min(1, (now - start) / duration);

        for (const item of materialsToFade) {
          item.material.opacity = item.opacity * (1 - t);
        }

        object.scale.setScalar(Math.max(0.001, 1 - t * 0.15));

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          object.visible = false;
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  function restoreObject(object) {
    if (!object) return;

    object.traverse(child => {
      if (!child.isMesh) return;
      if (child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial;
      }
    });

    if (object.userData.originalPosition) {
      object.position.copy(object.userData.originalPosition);
    }
    if (object.userData.originalRotation) {
      object.rotation.copy(object.userData.originalRotation);
    }
    if (object.userData.originalScale) {
      object.scale.copy(object.userData.originalScale);
    }

    object.visible = true;
    object.userData.fading = false;
  }

  function setAnomaly(object, kind = "displaced") {
    if (!object) return;

    object.userData.anomalyKind = kind;
    object.userData.isAnomaly = true;

    if (!object.userData.originalPosition) {
      object.userData.originalPosition = object.position.clone();
      object.userData.originalRotation = object.rotation.clone();
      object.userData.originalScale = object.scale.clone();
      object.userData.originalMaterial = object.material;
    }

    if (kind === "displaced") {
      object.position.x += 0.4;
      object.rotation.y += 0.35;
    } else if (kind === "screen") {
      object.material = new THREE.MeshStandardMaterial({
        color: "#23040b",
        emissive: "#ff1538",
        emissiveIntensity: 2.5,
        roughness: 0.25
      });
    } else if (kind === "enlarged") {
      object.scale.multiplyScalar(1.4);
    } else if (kind === "dark") {
      object.material = new THREE.MeshStandardMaterial({
        color: "#020306",
        roughness: 1
      });
    }
  }

  function clearAnomaly(object) {
    if (!object) return;

    object.position.copy(object.userData.originalPosition);
    object.rotation.copy(object.userData.originalRotation);
    object.scale.copy(object.userData.originalScale);
    object.material = object.userData.originalMaterial;
    object.userData.isAnomaly = false;
    object.userData.anomalyKind = null;
    object.userData.fading = false;
    object.visible = true;
  }

  function render() {
    if (!disposed) renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  }

  window.addEventListener("resize", onResize);

  function dispose() {
    disposed = true;
    document.removeEventListener("keydown", keyDown);
    document.removeEventListener("keyup", keyUp);
    document.removeEventListener("mousemove", mouseMove);
    document.removeEventListener("pointerlockchange", pointerLockChange);
    renderer.domElement.removeEventListener("click", canvasClick);
    window.removeEventListener("resize", onResize);
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    scene,
    camera,
    renderer,
    keys,
    mats,
    lamp: mainLight,
    interactables,
    anomalyTargets,
    update,
    render,
    fadeOutObject,
    restoreObject,
    setAnomaly,
    clearAnomaly,
    dispose,
    get target() {
      return currentTarget;
    }
  };
}
