
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08090d);
  scene.fog = new THREE.FogExp2(0x08090d, 0.055);

  const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.set(0, 1.65, 3.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.querySelector("#game").prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8490a7, 0x17100d, 1.4));

  const lamp = new THREE.PointLight(0xffd7a1, 28, 13);
  lamp.position.set(0, 3.1, 0);
  lamp.castShadow = true;
  scene.add(lamp);

  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0x42434a, roughness: 0.95 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x28272a, roughness: 0.9 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x25262d }),
    wood: new THREE.MeshStandardMaterial({ color: 0x493326, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x454952, metalness: 0.45 }),
    black: new THREE.MeshStandardMaterial({ color: 0x101116, roughness: 0.5 }),
    white: new THREE.MeshStandardMaterial({ color: 0xb5b0a1 }),
    red: new THREE.MeshStandardMaterial({ color: 0x751b25, emissive: 0x260208 })
  };

  function box(name, x, y, z, sx, sy, sz, material, interactable = false) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz), material
    );
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.interactable = interactable;
    scene.add(mesh);
    return mesh;
  }

  box("floor", 0, -0.12, 0, 10, 0.2, 10, materials.floor);
  box("ceiling", 0, 3.5, 0, 10, 0.2, 10, materials.ceiling);
  box("back-wall", 0, 1.7, -5, 10, 3.5, 0.2, materials.wall);
  box("left-wall", -5, 1.7, 0, 0.2, 3.5, 10, materials.wall);
  box("right-wall", 5, 1.7, 0, 0.2, 3.5, 10, materials.wall);
  box("front-left", -3.5, 1.7, 5, 3, 3.5, 0.2, materials.wall);
  box("front-right", 3.5, 1.7, 5, 3, 3.5, 0.2, materials.wall);

  // Стол и монитор
  box("desk", 0, 0.9, -1.1, 2.5, 0.16, 1.1, materials.wood);
  box("desk-leg-a", -1, 0.42, -1.1, 0.12, 0.8, 0.12, materials.metal);
  box("desk-leg-b", 1, 0.42, -1.1, 0.12, 0.8, 0.12, materials.metal);
  box("monitor", 0, 1.45, -1.35, 0.8, 0.55, 0.12, materials.black, true);
  box("monitor-screen", 0, 1.46, -1.275, 0.68, 0.39, 0.015, materials.red);

  // Стул
  box("chair-seat", 0, 0.55, 0.1, 0.75, 0.12, 0.7, materials.metal, true);
  box("chair-back", 0, 1.0, 0.4, 0.75, 0.8, 0.12, materials.metal, true);
  box("chair-leg", 0, 0.25, 0.1, 0.12, 0.5, 0.12, materials.metal);

  // Шкаф
  box("cabinet", -3.7, 1.0, -3.8, 1.1, 2, 0.7, materials.metal, true);
  box("cabinet-handle", -3.35, 1, -3.4, 0.05, 0.2, 0.05, materials.white);

  // Принтер и телефон
  box("printer", 1.0, 1.1, -1.15, 0.48, 0.35, 0.4, materials.white, true);
  box("phone", -0.85, 1.05, -1.05, 0.25, 0.1, 0.18, materials.black, true);

  // Окно на дальней стене
  box("window", 2.8, 2.0, -4.88, 1.5, 1.2, 0.04, materials.black, true);
  box("window-glass", 2.8, 2.0, -4.84, 1.3, 1.0, 0.02,
    new THREE.MeshStandardMaterial({
      color: 0x17253a, emissive: 0x101d36, emissiveIntensity: 0.7
    }));

  // Дверь
  box("door", -1.8, 1.1, -4.86, 1.2, 2.2, 0.12, materials.wood, true);
  box("door-handle", -1.35, 1.1, -4.77, 0.08, 0.08, 0.08, materials.white);

  // Часы
  const clock = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 32),
    new THREE.MeshStandardMaterial({ color: 0xddd4bc })
  );
  clock.name = "clock";
  clock.position.set(0, 2.5, -4.85);
  scene.add(clock);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(0, 0);

  let yaw = 0;
  let pitch = 0;
  const keys = new Set();
  let locked = false;

  document.addEventListener("keydown", e => {
    keys.add(e.code);
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", e => keys.delete(e.code));

  document.addEventListener("mousemove", e => {
    if (!locked) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-1.3, Math.min(1.3, pitch));
  });

  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === renderer.domElement;
  });

  renderer.domElement.addEventListener("click", () => {
    if (!locked) renderer.domElement.requestPointerLock();
  });

  function update(delta) {
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const movement = new THREE.Vector3();

    if (keys.has("KeyW")) movement.add(forward);
    if (keys.has("KeyS")) movement.sub(forward);
    if (keys.has("KeyD")) movement.add(right);
    if (keys.has("KeyA")) movement.sub(right);

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(delta * 2.5);
      camera.position.add(movement);
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -4.6, 4.6);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -4.6, 4.6);
    camera.position.y = 1.65;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, false);
    const target = hits.find(hit => hit.object.userData.interactable);

    return target ? target.object : null;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", onResize);

  return { scene, camera, renderer, update, render, box, lamp, materials };
}