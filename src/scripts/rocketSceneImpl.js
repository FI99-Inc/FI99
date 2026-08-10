// The real work behind rocketScene.js's lazy import: a transparent WebGL
// canvas holding the rocket model, rendered as wireframe (see the
// EdgesGeometry pass below) and faint and diagonal behind the hero. The
// cursor swings it around like a clock hand and pulls it toward itself a
// little; scrolling past the hero spins it through several full turns, so
// the back of the model actually comes around into view instead of a flat
// clock-hand rotation.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MODEL_URL = '/models/rocket.glb';

// BASE_YAW gives the rocket a 3/4 view instead of being seen flat down its
// own roll axis (the camera itself has no orbital angle). The scroll tumble
// is added to it, never replaces it. This is the rocket's ONLY rotation —
// the clock-hand cursor response lives on the camera instead (REST_ROLL /
// the pointermove handler below), deliberately never touching the rocket's
// own Z or X. Euler angles are not commutative: an earlier version rolled
// the rocket itself for the diagonal composition, and adding that Z roll on
// top of the Y yaw didn't read as "the same yawed view, tilted" — it rotated
// around the model's own already-yawed local axis, which for this geometry
// turned the recognizable rocket into an unrecognizable clump (looked like a
// claw). Keeping every non-yaw rotation on the camera sidesteps that
// entirely: camera roll and object yaw are different transforms, so they
// never compose with each other the way two object-local rotations do.
const BASE_YAW = THREE.MathUtils.degToRad(28);
const REST_ROLL = THREE.MathUtils.degToRad(-22);
// Mobile gets no Dutch tilt at all, unlike desktop's -22°. Desktop's lean
// works because the rocket has a wide box to lean across; mobile has almost
// none (see the layout() comment below), so any tilt on the stretched,
// edge-hugging mobile shape reads as a diagonal scratch through the letters
// instead of a deliberate lean. Dead straight is what makes it read as a
// parallel accent running alongside FI99's own vertical strokes.
const MOBILE_REST_ROLL = 0;

// Full turns over the mark's own scroll transit — several, not a fraction of
// one, so this reads as tumbling rather than a clock hand.
const SPIN_TURNS = 2.5;

const MOBILE_QUERY = '(width < 40rem)';

export async function start(mount) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 7);
  camera.rotation.z = REST_ROLL;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  const root = new THREE.Group();
  scene.add(root);

  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    // Wireframe, not the flat-shaded solid: a schematic line model reads as
    // technical/blueprint, which fits the mono/CRT vocabulary the rest of the
    // page already speaks, and it's honest about being a decoration rather
    // than a rendered product shot. `wireframe: true` on the loaded material
    // would draw every triangle's edges — including the dense diagonal mesh
    // across every curved surface the smoothing pass in the export pipeline
    // produced — which reads as visual noise, not line art. EdgesGeometry
    // with an angle threshold keeps only edges where adjacent faces actually
    // bend (hull seams, fin edges, the nose cone's ring), so smoothly curved
    // stretches of hull go quiet instead of filling in with triangulation.
    // No lights are needed anywhere in this scene any more: LineBasicMaterial
    // is unlit, so the directional/ambient rig the solid material used to
    // need is gone with it.
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh) return;
      const edges = new THREE.EdgesGeometry(obj.geometry, 15);
      const lines = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xf2efe9 })
      );
      lines.position.copy(obj.position);
      lines.rotation.copy(obj.rotation);
      lines.scale.copy(obj.scale);
      obj.parent.add(lines);
      obj.parent.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    root.add(gltf.scene);
  } catch {
    // Offline, blocked request, whatever — this is decoration, not content,
    // so a failed load just means no rocket rather than a broken page.
    renderer.dispose();
    mount.removeChild(renderer.domElement);
    return () => {};
  }

  // Big and off-centre on purpose — "not a centerpiece": something large
  // drifting through the background reads as atmosphere, a small object
  // dead-centre reads as the thing you're supposed to look at.
  //
  // Mobile gets its own numbers, not just a scaled-down desktop pose, and
  // not a uniform scale either. The stacked FI/99 lockup runs left-aligned
  // and close to full viewport width there (see .hero-mark's mobile rules
  // in global.css) — only ~16px of margin on either side — so there is
  // barely any horizontal room to sit "beside" it. There is, however, a lot
  // of unused *vertical* room in the hero above the tagline. Stretching the
  // rocket — narrow on X/Z, elongated on Y — trades the width it doesn't
  // have for the height it does, so it reads as a tall accent running down
  // the right edge instead of a diagonal streak forced through the letters.
  // (Y stretches cleanly because BASE_YAW only rotates around Y — X/Z are
  // what a yaw rotation mixes together, Y is untouched by it.)
  let mobile = null;
  let baseX = 0;
  let baseY = 0;
  function layout() {
    const isMobile = window.matchMedia(MOBILE_QUERY).matches;
    if (isMobile === mobile) return;
    mobile = isMobile;
    if (mobile) {
      root.scale.set(0.4, 1.35, 0.4);
      baseX = 0.95;
      baseY = 0.65;
      camera.rotation.z = MOBILE_REST_ROLL;
    } else {
      root.scale.setScalar(2.2);
      baseX = 0.9;
      baseY = -0.3;
      camera.rotation.z = REST_ROLL;
    }
  }

  // Clock-hand cursor response: rather than tracking the rocket's exact
  // (constantly-changing, since the camera itself rolls) screen position,
  // this pivots around the mount's centre — close enough to where the
  // rocket actually sits to read as "it turns to follow the cursor" without
  // the circular dependency of re-projecting a point through a camera whose
  // own rotation is what we're computing.
  let pivotX = 0;
  let pivotY = 0;
  function updatePivot() {
    const rect = mount.getBoundingClientRect();
    pivotX = rect.left + rect.width / 2;
    pivotY = rect.top + rect.height / 2;
  }

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let rollTarget = REST_ROLL;
  let rollCurrent = REST_ROLL;

  // A second, slower-eased layer on top of the clock hand: the rocket also
  // drifts a little toward the cursor, like it's tethered to the pivot
  // rather than just spinning in place. Rotation alone reads as a dial;
  // rotation plus a lagging translation reads as something the cursor is
  // actually pulling on. Deliberately small (DRIFT_MAX) and deliberately
  // slower than the roll (see the two `k` constants in render()) — the
  // drift should trail the turn, not race it.
  const DRIFT_MAX = 0.55;
  let driftTargetX = 0;
  let driftTargetY = 0;
  let driftCurrentX = 0;
  let driftCurrentY = 0;

  const onPointerMove = (event) => {
    const dx = event.clientX - pivotX;
    const dy = event.clientY - pivotY;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return; // right at the pivot: angle is undefined, keep the last one
    // Screen Y grows downward while the rotation math below assumes Y-up
    // (matching the rocket's own local +Y "nose" axis), hence the negation.
    rollTarget = Math.atan2(-dx, -dy);
    // Normalized against the viewport diagonal rather than a fixed pixel
    // radius, so the drift's reach feels the same on a phone-wide browser
    // window as it does on an ultrawide.
    const reach = Math.hypot(window.innerWidth, window.innerHeight) / 2;
    const pull = Math.min(dist / reach, 1) * DRIFT_MAX;
    driftTargetX = (dx / dist) * pull;
    driftTargetY = -(dy / dist) * pull;
  };
  if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });

  let spinProgress = 0;
  // Triggered off .hero-mark, not .hero: the mark sits in the upper part of
  // a much taller hero (tagline and scroll cue fill the rest), so tying this
  // to the whole section spreads the turns across a range where the rocket
  // has already scrolled out of view for most of it. Ending when the mark
  // itself clears the viewport keeps the full spin inside the window it's
  // actually visible.
  const triggerEl = mount.closest('.hero')?.querySelector('.hero-mark');
  const scrollTrigger = triggerEl
    ? ScrollTrigger.create({
        trigger: triggerEl,
        start: 'top top',
        // The rocket is scaled and offset beyond the mark's own box (see
        // above — bigger, off-centre, not a centerpiece), so it scrolls out
        // the top of the viewport well before the mark's bottom edge would.
        // 'center top' approximates where it actually exits, so the full
        // spin lands inside the window it's visible rather than mostly
        // completing after it's already gone.
        end: 'center top',
        scrub: 0.6,
        onUpdate: (self) => {
          spinProgress = self.progress;
        },
      })
    : null;

  function resize() {
    const rect = mount.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
    updatePivot();
  }
  resize();
  window.addEventListener('resize', resize);

  // Shortest angular path, so crossing the ±180° seam eases through it
  // instead of spinning the long way around.
  function angleDelta(target, current) {
    let d = (target - current) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function render(time, deltaTime) {
    if (finePointer) {
      // Roll eases fast (the hand should feel responsive); drift eases
      // noticeably slower, so the translation visibly trails the turn
      // instead of arriving with it.
      const kRoll = 1 - Math.exp(-deltaTime / 90);
      const kDrift = 1 - Math.exp(-deltaTime / 280);
      rollCurrent += angleDelta(rollTarget, rollCurrent) * kRoll;
      camera.rotation.z = rollCurrent;
      driftCurrentX += (driftTargetX - driftCurrentX) * kDrift;
      driftCurrentY += (driftTargetY - driftCurrentY) * kDrift;
    }
    root.position.set(baseX + driftCurrentX, baseY + driftCurrentY, 0);
    root.rotation.y = BASE_YAW + spinProgress * Math.PI * 2 * SPIN_TURNS;

    renderer.render(scene, camera);
  }

  gsap.ticker.add(render);

  return function dispose() {
    gsap.ticker.remove(render);
    window.removeEventListener('resize', resize);
    if (finePointer) window.removeEventListener('pointermove', onPointerMove);
    scrollTrigger?.kill();
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((m) => m?.dispose());
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
