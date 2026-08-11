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
  //
  // baseX and the X/Z scale are a pair, and the pair is what has to stay
  // balanced: the rocket is anchored by its RIGHT edge to the right edge of
  // the viewport, so any width added on X/Z grows leftward, straight toward
  // the lockup. Widening without pushing baseX out to compensate walks the
  // model in under the 99 — where a 0.32-alpha bone wireframe sitting under
  // saturated neon strokes and their glow stops reading as a rocket at all
  // and just adds noise to the letters. Measured on a 390pt phone, the
  // lockup's glyphs end at x=281 and these numbers put the rocket at
  // x=302..362: clear of the letters, still hugging the edge.
  let mobile = null;
  let baseX = 0;
  let baseY = 0;
  function layout() {
    const isMobile = window.matchMedia(MOBILE_QUERY).matches;
    if (isMobile === mobile) return;
    mobile = isMobile;
    if (mobile) {
      root.scale.set(0.45, 1.5, 0.42);
      baseX = 0.98;
      baseY = 0.5;
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
  // drifts toward the cursor, like it's tethered to the pivot rather than
  // just spinning in place. Rotation alone reads as a dial; rotation plus a
  // lagging translation reads as something the cursor is actually pulling
  // on. Large enough that the nose gets genuinely close to the cursor
  // itself across most of the mount, not just a token nudge in its
  // direction — and still deliberately slower than the roll (see the two
  // `k` constants in render()) so the drift trails the turn, not races it.
  const DRIFT_MAX = 1.3;
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

  // Sparkle/flame trail: small brand-colored points spawned from the tail
  // (the end opposite the nose — local -Y, mirroring the "+Y nose axis" the
  // pointer math above is built around) whenever the rocket's actual
  // rendered position moves, so a fast cursor sweep leaves a proper trail
  // rather than a static glow sitting under it.
  const PARTICLE_COUNT = 160;
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleBaseColor = new Float32Array(PARTICLE_COUNT * 3);
  const particleColors = new Float32Array(PARTICLE_COUNT * 3);
  const particleLife = new Float32Array(PARTICLE_COUNT);
  const particleMaxLife = new Float32Array(PARTICLE_COUNT);
  const particleVelX = new Float32Array(PARTICLE_COUNT);
  const particleVelY = new Float32Array(PARTICLE_COUNT);
  let particleCursor = 0;
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  // World space, not a child of root: once emitted a spark drifts on its own
  // and stays behind as the rocket keeps moving, which is what makes it read
  // as a trail rather than glow glued to the model.
  scene.add(particles);

  // FI99's own three-stop brand ramp (--color-magenta/violet/volt in
  // global.css), not literal fire colours: the rocket itself is a
  // deliberately neutral bone-white wireframe to keep the schematic look, so
  // orange/yellow sparks would be the first saturated colour anywhere near
  // it — fighting the ramp used everywhere else on the page instead of
  // reading as part of the same system.
  const SPARK_COLORS = [
    [1, 0.122, 0.561],
    [0.545, 0.169, 1],
    [0.29, 0.145, 1],
  ];

  function spawnSpark(x, y, z) {
    const i = particleCursor;
    particleCursor = (particleCursor + 1) % PARTICLE_COUNT;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.25 + Math.random() * 0.5;
    particleVelX[i] = Math.cos(angle) * speed;
    // Slight downward bias — falling sparks, not an even puff in all
    // directions.
    particleVelY[i] = Math.sin(angle) * speed - 0.15;
    particleMaxLife[i] = 0.35 + Math.random() * 0.35;
    particleLife[i] = particleMaxLife[i];
    const idx = i * 3;
    particlePositions[idx] = x;
    particlePositions[idx + 1] = y;
    particlePositions[idx + 2] = z + (Math.random() - 0.5) * 0.2;
    const c = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
    particleBaseColor[idx] = c[0];
    particleBaseColor[idx + 1] = c[1];
    particleBaseColor[idx + 2] = c[2];
  }

  const TAIL_LOCAL = new THREE.Vector3(0, -1, 0);
  const tailWorld = new THREE.Vector3();
  const prevTailWorld = new THREE.Vector3();
  let tailTracked = false;

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
  // A plain window `resize` listener has a real race: if it fires once
  // before web fonts finish loading, the mount hasn't reached its final
  // size yet (the FI/99 lockup's own size depends on the display font
  // loading), so the camera's aspect gets locked to that stale, too-small
  // measurement for the rest of the session — the rocket then renders
  // visibly mis-proportioned, with real risk of parts of it landing outside
  // the frustum. A slow phone connection loading fonts over the network
  // (rather than an instant localhost dev server) makes this far more likely
  // to actually hit. ResizeObserver fires on every real size change of the
  // mount itself, for any reason — a font-load reflow included — so there's
  // no timing to get right.
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  resize();

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

    if (finePointer) {
      root.updateMatrixWorld(true);
      tailWorld.copy(TAIL_LOCAL).applyMatrix4(root.matrixWorld);
      if (tailTracked) {
        const moved = tailWorld.distanceTo(prevTailWorld);
        // A movement floor keeps the trail from spawning every frame at
        // rest — only actual travel (cursor-driven drift/roll, or the
        // scroll tumble) leaves sparks behind.
        if (moved > 0.003) {
          const count = Math.min(5, Math.ceil(moved * 60));
          for (let i = 0; i < count; i++) {
            const t = (i + 1) / count;
            spawnSpark(
              THREE.MathUtils.lerp(prevTailWorld.x, tailWorld.x, t),
              THREE.MathUtils.lerp(prevTailWorld.y, tailWorld.y, t),
              THREE.MathUtils.lerp(prevTailWorld.z, tailWorld.z, t)
            );
          }
        }
      }
      prevTailWorld.copy(tailWorld);
      tailTracked = true;
    }

    const dt = deltaTime / 1000;
    let anyAlive = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (particleLife[i] <= 0) continue;
      anyAlive = true;
      particleLife[i] -= dt;
      const idx = i * 3;
      if (particleLife[i] <= 0) {
        particleColors[idx] = particleColors[idx + 1] = particleColors[idx + 2] = 0;
        continue;
      }
      particlePositions[idx] += particleVelX[i] * dt;
      particlePositions[idx + 1] += particleVelY[i] * dt;
      // Squared fade (ease-out): sparks hold their brightness through most
      // of their life and only dim sharply at the very end, closer to how a
      // real spark reads than a linear fade would.
      const t = particleLife[i] / particleMaxLife[i];
      const brightness = t * t;
      particleColors[idx] = particleBaseColor[idx] * brightness;
      particleColors[idx + 1] = particleBaseColor[idx + 1] * brightness;
      particleColors[idx + 2] = particleBaseColor[idx + 2] * brightness;
    }
    if (anyAlive) {
      particleGeometry.attributes.position.needsUpdate = true;
      particleGeometry.attributes.color.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  gsap.ticker.add(render);

  return function dispose() {
    gsap.ticker.remove(render);
    resizeObserver.disconnect();
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
