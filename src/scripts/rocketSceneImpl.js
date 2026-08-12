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

// Higher than a filled model would need — a wireframe's lines cover a
// fraction of the pixels a solid silhouette would, so the same "faint" read
// takes more alpha per line to land. Lower than the 0.32 the old canvas-wide
// CSS opacity used, though, and not for taste: fading each line individually
// lets overlapping lines stack their alpha, where compositing the finished
// canvas once could not. Sampling the rocket's own column against the old
// rule, 0.28 per line lands within a few percent of its mean luminance.
const WIREFRAME_OPACITY = 0.28;

// ---- Procedural nose-cone detail ----
// EdgesGeometry(obj.geometry, 15) leaves the nose cone almost bare: its tip
// is one continuously curved surface, exported as many shallow-angle
// triangles, so almost none of them clear a 15° threshold the way the fin
// edges and hull seams do. Lowering the threshold globally to catch it would
// flood the mid-body cylinder — genuinely flat there — with triangulation
// noise instead. So a small hand-built ring-and-rib cage is layered on just
// for the nose, in the model's own local space so it inherits the same
// position/rotation/scale as the edges pass (see the traverse loop below).
// The numbers aren't eyeballed: decoding rocket.glb's own position buffer
// shows a constant ~0.096 body radius up to local y≈0.40, tapering to a
// point at y≈0.5999890, and an ogive r(t) = R0·sqrt(1-t²) profile fit those
// sampled cross-sections to within a few percent.
const NOSE_BASE_Y = 0.4;
const NOSE_TIP_Y = 0.599989;
const NOSE_BASE_RADIUS = 0.096;
const NOSE_RING_COUNT = 5;
const NOSE_RIB_COUNT = 8;
const NOSE_RIB_STEPS = 10;
// Raises the fitted ogive to a power > 1: at t=0 this is still exactly R0
// (matches the real body radius where the cage starts, so no seam against
// the still-fat hull just below it) and it still reaches exactly 0 at
// NOSE_TIP_Y (still converges at the mesh's own real apex, no extension
// poking out past it), but everywhere in between it narrows faster — the
// same trick as raising a camera gamma curve. A literal spike past the real
// tip was tried first and rejected: it read as a thin antenna welded onto a
// still-blunt cone rather than the cone itself looking sharper.
const NOSE_SHARPNESS = 1.35;

function noseRadius(y) {
  const t = THREE.MathUtils.clamp((y - NOSE_BASE_Y) / (NOSE_TIP_Y - NOSE_BASE_Y), 0, 1);
  return NOSE_BASE_RADIUS * Math.pow(Math.max(0, 1 - t * t), 0.5 * NOSE_SHARPNESS);
}

function buildNoseDetail() {
  const points = [];
  // Rings: circles of latitude climbing toward the tip.
  for (let i = 1; i <= NOSE_RING_COUNT; i++) {
    const y = NOSE_BASE_Y + ((NOSE_TIP_Y - NOSE_BASE_Y) * i) / (NOSE_RING_COUNT + 1);
    const r = noseRadius(y);
    const segs = 28;
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * Math.PI * 2;
      const a1 = ((s + 1) / segs) * Math.PI * 2;
      points.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
    }
  }
  // Ribs: lines of longitude from the cone's base up to the apex, built from
  // several short segments each so they hug the ogive curve instead of
  // cutting a straight chord across it.
  for (let i = 0; i < NOSE_RIB_COUNT; i++) {
    const angle = (i / NOSE_RIB_COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let s = 0; s < NOSE_RIB_STEPS; s++) {
      const y0 = NOSE_BASE_Y + ((NOSE_TIP_Y - NOSE_BASE_Y) * s) / NOSE_RIB_STEPS;
      const y1 = NOSE_BASE_Y + ((NOSE_TIP_Y - NOSE_BASE_Y) * (s + 1)) / NOSE_RIB_STEPS;
      const r0 = noseRadius(y0);
      const r1 = noseRadius(y1);
      points.push(cos * r0, y0, sin * r0, cos * r1, y1, sin * r1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xf2efe9,
      transparent: true,
      opacity: WIREFRAME_OPACITY,
    })
  );
}

// ---- Mobile-only motion ----
// A phone gets none of the three live layers desktop drives off the cursor
// (clock-hand roll, lagging drift, spark trail) — all three sit behind
// `finePointer`. And the trail could not work on a phone even with the gate
// removed: it spawns off the tail's *world* movement, but the tail sits on
// local Y, the one axis the mobile pose never moves it along. A Y rotation
// leaves points on the Y axis exactly where they are, and without a cursor
// there is no drift either, so that position is constant. Mobile needs its
// own driver, not a relaxed gate.
//
// Scroll velocity is that driver, and it is the one rich input a phone has
// that a desktop mostly does not. smoothscroll.js deliberately leaves touch
// momentum to the platform (`syncTouch: false`), so a flick hands us a
// velocity that decays on its own over a second or more — the rocket burns
// hard off the gesture and then settles, which is the phone answering the
// hand rather than ignoring it.
const MOBILE_BURN_SPEED = 2200; // px/s of scroll that reads as full throttle
const MOBILE_IDLE_RATE = 24; // sparks/sec at rest — the engine is never out
const MOBILE_BURN_RATE = 320; // sparks/sec at full throttle
const MOBILE_PLUME_SPREAD = 0.85; // radians of exhaust cone at full throttle
const MOBILE_SPARK_SIZE = 0.075; // world units, before the throttle grows it
const DESKTOP_SPARK_SIZE = 0.05; // the desktop pose is ~5x larger, so smaller
// Thrust should visibly do something, so a hard burn also lifts the rocket a
// little. Small: this is still background, and the lockup is what the eye is
// supposed to land on.
const MOBILE_CLIMB = 0.16;
// At rest all of the above goes quiet and the rocket would be a still image
// again, so a slow sway and bob keep it breathing underneath. The sway lives
// on the camera for exactly the reason REST_ROLL does — see BASE_YAW's
// comment on why rolling the rocket's own already-yawed axis wrecks it.
const MOBILE_SWAY = THREE.MathUtils.degToRad(1.6);
const MOBILE_SWAY_RATE = 0.34;
const MOBILE_BOB = 0.055;
const MOBILE_BOB_RATE = 0.47;

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
        // Faintness lives on the material, not on the canvas. A CSS opacity
        // on .hero-rocket-scene used to do this, but it is the same blunt
        // instrument the grayscale filter was (see global.css): it fades
        // *everything* drawn into the canvas uniformly, which caps the
        // exhaust at 32% alpha and leaves hot magenta reading as muddy
        // maroon. Dimming the wireframe here instead leaves the sparks free
        // to burn at full strength — they are the one part of this scene
        // that is meant to be vivid.
        new THREE.LineBasicMaterial({
          color: 0xf2efe9,
          transparent: true,
          opacity: WIREFRAME_OPACITY,
        })
      );
      lines.position.copy(obj.position);
      lines.rotation.copy(obj.rotation);
      lines.scale.copy(obj.scale);
      obj.parent.add(lines);

      const noseDetail = buildNoseDetail();
      noseDetail.position.copy(obj.position);
      noseDetail.rotation.copy(obj.rotation);
      noseDetail.scale.copy(obj.scale);
      obj.parent.add(noseDetail);

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
      // Chunkier points than the desktop trail: the mobile rocket is drawn
      // much smaller, so sparks sized for the desktop pose land near a single
      // pixel here and the plume reads as grain instead of fire. render()
      // grows this further with the throttle.
      particles.material.size = MOBILE_SPARK_SIZE;
    } else {
      root.scale.setScalar(2.2);
      baseX = 0.9;
      baseY = -0.3;
      camera.rotation.z = REST_ROLL;
      particles.material.size = DESKTOP_SPARK_SIZE;
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

  // Fine-pointer devices get the mount promoted out of .hero entirely —
  // reparented to <body> and switched from absolute (confined to the
  // hero's own box, scrolling away with it) to fixed (pinned to the
  // viewport, immune to scroll). That's what lets the chase reach past the
  // top of the hero into the header, and keep answering the cursor after
  // the hero has scrolled out of view rather than disappearing with it.
  // Mobile stays exactly as it was: still absolute, still confined, both
  // for the battery reasons the mobile engine's own comments already give,
  // and because it has no cursor to chase past the hero's box anyway.
  if (finePointer) {
    document.body.appendChild(mount);
    mount.classList.add('hero-rocket-scene--roam');
  }

  let rollTarget = REST_ROLL;
  let rollCurrent = REST_ROLL;

  // A second, slower-eased layer on top of the clock hand: the rocket also
  // drifts toward the cursor, like it's tethered to the pivot rather than
  // just spinning in place. Rotation alone reads as a dial; rotation plus a
  // lagging translation reads as something the cursor is actually pulling
  // on. Deliberately slower than the roll (see the two `k` constants in
  // render()) so the drift trails the turn, not races it.
  //
  // The target used to come from a hand-rolled FOV projection that
  // deliberately ignored the camera's live roll "for simplicity." That was
  // the actual bug behind the nose visibly not pointing at the cursor: roll
  // is *largest* exactly when the cursor is far from centre, i.e. most of
  // the time, so an unrolled projection was wrong precisely when it mattered
  // most. The fix (in render(), not here) casts a real ray through the
  // camera's current transform — via THREE.Raycaster, which correctly
  // accounts for roll because it reads the camera's actual matrixWorld —
  // and intersects it with the z=0 plane the rocket sits on. This function
  // now only stores where on the mount the cursor last was; the projection
  // itself has to happen every frame in render(), not once per pointer
  // event, because the camera's roll keeps easing toward rollTarget for
  // several frames after the cursor stops moving, and the correct drift
  // target keeps shifting right along with it.
  //
  // The result is clamped against baseX/baseY, not just scaled down by a
  // flat constant: the drift and the rest pose's own off-centre offset
  // (baseX/baseY — see layout(), "big and off-centre on purpose") add
  // together into the rocket's final position, and baseX alone already
  // spends a real fraction of the frustum's width. A flat cap sized for the
  // drift in isolation went straight past the remaining margin the moment
  // the cursor reached a corner — verified by screenshot, the rocket flew
  // fully off-frame and invisible at the browser's top-right corner.
  // FRAME_MARGIN is how much of the frustum's own half-extent counts as
  // "safe" for the *sum* of rest offset and drift, leaving headroom for the
  // model's own size beyond that single anchor point.
  const FRAME_MARGIN = 0.55;
  let lastNdcX = 0;
  let lastNdcY = 0;
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

    const rect = mount.getBoundingClientRect();
    lastNdcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    lastNdcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };
  if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Small brand-coloured points spawned from the tail (the end opposite the
  // nose — local -Y, mirroring the "+Y nose axis" the pointer math above is
  // built around). One buffer, two very different emitters feeding it: on
  // desktop a sparkle trail shed whenever the rocket's rendered position
  // moves, so a fast cursor sweep leaves a proper trail rather than a static
  // glow sitting under it; on a phone a scroll-driven engine plume, since
  // there is no cursor to shed anything (see the mobile constants at the top
  // of the file).
  //
  // Sized for the mobile plume, which is the heavier of the two consumers:
  // MOBILE_BURN_RATE across the longest lifetime is ~230 alive at full
  // throttle, and the buffer wants headroom past that so a sustained burn
  // recycles sparks that have already faded out rather than visibly erasing
  // live ones at the head of the ring.
  const PARTICLE_COUNT = 420;
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
  // A bare THREE.Points draws every particle as a hard square, which at the
  // sizes the exhaust needs reads as blocky pixels rather than embers. A
  // generated radial falloff (no network request, no asset to ship) turns
  // each one into a soft dot that stacks into a glow under additive
  // blending — white here because vertexColors multiplies the brand colour
  // in per particle.
  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.width = sparkCanvas.height = 64;
  const sparkCtx = sparkCanvas.getContext('2d');
  const sparkGradient = sparkCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  sparkGradient.addColorStop(0, 'rgba(255,255,255,1)');
  sparkGradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  sparkGradient.addColorStop(1, 'rgba(255,255,255,0)');
  sparkCtx.fillStyle = sparkGradient;
  sparkCtx.fillRect(0, 0, 64, 64);
  const sparkTexture = new THREE.CanvasTexture(sparkCanvas);

  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: DESKTOP_SPARK_SIZE,
      map: sparkTexture,
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

  // Both emitters share one ring buffer, so a spark is a spark whichever
  // input produced it — only the direction, speed and lifetime differ.
  function emit(x, y, z, vx, vy, life) {
    const i = particleCursor;
    particleCursor = (particleCursor + 1) % PARTICLE_COUNT;
    particleVelX[i] = vx;
    particleVelY[i] = vy;
    particleMaxLife[i] = life;
    particleLife[i] = life;
    const idx = i * 3;
    particlePositions[idx] = x;
    particlePositions[idx + 1] = y;
    particlePositions[idx + 2] = z + (Math.random() - 0.5) * 0.2;
    const c = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
    particleBaseColor[idx] = c[0];
    particleBaseColor[idx + 1] = c[1];
    particleBaseColor[idx + 2] = c[2];
  }

  // Desktop: an even puff in every direction, because what spawns it is the
  // rocket being dragged sideways by a cursor rather than anything firing.
  function spawnSpark(x, y, z) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.25 + Math.random() * 0.5;
    emit(
      x,
      y,
      z,
      Math.cos(angle) * speed,
      // Slight downward bias — falling sparks, not an even puff in all
      // directions.
      Math.sin(angle) * speed - 0.15,
      0.35 + Math.random() * 0.35
    );
  }

  // Mobile: a cone pointing straight down instead, because this one *is* an
  // engine. The cone widens and the sparks leave faster the harder the burn,
  // so throttle reads as shape and not just as count — a hard flick throws a
  // broad fast plume, an idle tick drops a couple of embers straight down.
  function spawnExhaust(x, y, z, burn) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * MOBILE_PLUME_SPREAD * (0.45 + burn);
    const speed = (0.6 + Math.random() * 0.7) * (0.5 + burn * 2.2);
    emit(
      x + (Math.random() - 0.5) * 0.07,
      y,
      z,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0.32 + Math.random() * 0.4
    );
  }

  const TAIL_LOCAL = new THREE.Vector3(0, -1, 0);
  const tailWorld = new THREE.Vector3();
  const prevTailWorld = new THREE.Vector3();
  let tailTracked = false;

  // The nose, symmetric with TAIL_LOCAL on the model's centred/normalised
  // export (height 2, origin at centre — the tail sits at local Y -1, the
  // nose at +1). Both sit exactly on root's local Y axis, which is exactly
  // why root.rotation.y (the scroll tumble) never has to be un-done to find
  // either point: a yaw rotation cannot move a point that lies on the axis
  // it's rotating around. So the nose's offset from root.position is just
  // `root.scale.y` in world units, constant regardless of spin — used below
  // to solve backward from "where the nose should end up on screen" to
  // "where root.position needs to be."
  const NOSE_LOCAL = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const noseTarget = new THREE.Vector3();

  // Mobile throttle state. Read off raw window.scrollY rather than a Lenis or
  // ScrollTrigger velocity: getVelocity() is a per-instance method on a
  // trigger that goes inactive the moment its own range is passed, and the
  // burn should keep answering the scroll for as long as any of the rocket is
  // still on screen. scrollY is also what carries the platform's native touch
  // momentum, which is the whole point.
  let burnCurrent = 0;
  let lastScrollY = window.scrollY;
  let emitAccumulator = 0;

  // spinProgress used to be a GSAP ScrollTrigger's 0-1 `progress`, driven off
  // .hero-mark's own scroll transit and hard-clamped at 1 the instant the
  // trigger's range ended. That clamp was invisible for as long as the
  // rocket itself vanished with the hero past that point — but it no longer
  // does (fine-pointer devices keep chasing the cursor for the rest of the
  // page, see the reparenting above), so the freeze became a visible bug:
  // the tumble simply stopped a little way into the page and never moved
  // again no matter how much further down you scrolled. Replaced with a
  // plain, uncapped scrollY→turns mapping, computed fresh every frame:
  // spinProgressTarget keeps climbing for as long as scrollY does, with
  // nothing to hit a ceiling on. Floored at 0, not clamped above.
  //
  // Rate and starting point still come from .hero-mark's own box — the
  // *speed* of the tumble during its dramatic opening stretch through the
  // hero is unchanged, it just no longer stops being asked to continue once
  // that stretch is behind you. A page-wide lookup rather than
  // mount.closest('.hero')...: correct on both layouts, but load-bearing on
  // a fine pointer specifically, where the mount above has just been
  // reparented to <body> and closest('.hero') would silently return null —
  // no trigger, no spin, no error either, the kind of bug that only shows up
  // as "huh, it doesn't spin any more."
  const triggerEl = document.querySelector('.hero-mark');
  let spinRangeTop = 0;
  let spinRangeSpan = 1;
  function updateSpinRange() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    spinRangeTop = rect.top + window.scrollY;
    // Half the mark's own height, matching the old trigger's 'top top' →
    // 'center top' span exactly — see the render()-side comment on why that
    // range was chosen (the rocket exits the viewport well before the
    // mark's bottom edge would).
    spinRangeSpan = Math.max(1, rect.height / 2);
  }
  let spinProgressTarget = 0;
  let spinProgressCurrent = 0;

  function resize() {
    const rect = mount.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
    updatePivot();
    updateSpinRange();
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
    const dt = deltaTime / 1000;
    // A touch device that is also under the mobile breakpoint. Written as
    // "mobile and not finePointer" rather than just "mobile" so a narrow
    // window on a desktop keeps the cursor behaviour it can actually drive,
    // instead of falling back to a scroll-only rocket the moment it is
    // resized past 40rem.
    const touchOnly = mobile && !finePointer;

    if (finePointer) {
      // Roll eases fast (the hand should feel responsive); drift eases
      // noticeably slower, so the translation visibly trails the turn
      // instead of arriving with it.
      const kRoll = 1 - Math.exp(-deltaTime / 90);
      const kDrift = 1 - Math.exp(-deltaTime / 280);
      rollCurrent += angleDelta(rollTarget, rollCurrent) * kRoll;
      camera.rotation.z = rollCurrent;
      // The camera's matrixWorld has to reflect *this* frame's roll before
      // the raycast below reads it — Three.js only refreshes it inside
      // renderer.render(), which happens at the end of this function, well
      // after this point.
      camera.updateMatrixWorld(true);

      // Where the cursor is actually pointing, in world space, on the z=0
      // plane the rocket sits on — a real ray through the camera's current
      // (rolled) transform, not a hand-rolled FOV formula. This is what
      // fixed the nose not pointing at the cursor: setFromCamera reads
      // camera.matrixWorld, so it's correct at any roll angle, where the
      // old projection was only ever correct at roll = 0.
      raycaster.setFromCamera({ x: lastNdcX, y: lastNdcY }, camera);
      const t = -raycaster.ray.origin.z / raycaster.ray.direction.z;
      noseTarget.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, t);

      // Solve backward from "the nose should end up at noseTarget" to
      // "root.position should be this" — see NOSE_LOCAL's comment for why
      // its offset from root.position is just root.scale.y, independent of
      // yaw/spin.
      const noseOffsetY = root.scale.y * NOSE_LOCAL.y;
      const rawTargetX = noseTarget.x - baseX;
      const rawTargetY = noseTarget.y - noseOffsetY - baseY;

      const halfHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const halfWidth = halfHeight * camera.aspect;
      const safeHalfWidth = halfWidth * FRAME_MARGIN;
      const safeHalfHeight = halfHeight * FRAME_MARGIN;
      driftTargetX = THREE.MathUtils.clamp(rawTargetX, -safeHalfWidth - baseX, safeHalfWidth - baseX);
      driftTargetY = THREE.MathUtils.clamp(rawTargetY, -safeHalfHeight - baseY, safeHalfHeight - baseY);

      driftCurrentX += (driftTargetX - driftCurrentX) * kDrift;
      driftCurrentY += (driftTargetY - driftCurrentY) * kDrift;
    }
    let swayY = 0;
    if (touchOnly) {
      const scrollY = window.scrollY;
      // Guard the divisor: gsap can hand out a 0ms delta on the first frame
      // after a tab regains focus, which would otherwise read as infinite
      // scroll speed and fire the throttle wide open for one frame.
      const speed = Math.abs(scrollY - lastScrollY) / Math.max(dt, 1 / 240);
      lastScrollY = scrollY;
      const burnTarget = Math.min(speed / MOBILE_BURN_SPEED, 1);
      // Asymmetric easing: the engine catches almost immediately but takes
      // its time going out, so the plume trails the flick the way momentum
      // itself does instead of snapping off with the finger.
      const kBurn = 1 - Math.exp(-deltaTime / (burnTarget > burnCurrent ? 60 : 300));
      burnCurrent += (burnTarget - burnCurrent) * kBurn;

      particles.material.size = MOBILE_SPARK_SIZE * (1 + burnCurrent * 0.4);
      camera.rotation.z = MOBILE_REST_ROLL + Math.sin(time * MOBILE_SWAY_RATE) * MOBILE_SWAY;
      swayY = Math.sin(time * MOBILE_BOB_RATE) * MOBILE_BOB + burnCurrent * MOBILE_CLIMB;
    }

    root.position.set(baseX + driftCurrentX, baseY + driftCurrentY + swayY, 0);

    spinProgressTarget = Math.max(0, (window.scrollY - spinRangeTop) / spinRangeSpan);
    // Same "catch up" lag as the cursor drift, and for the same reason:
    // instant would be rigid, and it doesn't have to be — nothing about the
    // rotation being scroll-driven means it has to snap to scroll position
    // exactly.
    const kSpin = 1 - Math.exp(-deltaTime / 260);
    spinProgressCurrent += (spinProgressTarget - spinProgressCurrent) * kSpin;
    root.rotation.y = BASE_YAW + spinProgressCurrent * Math.PI * 2 * SPIN_TURNS;

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
    } else if (touchOnly && (!triggerEl || spinProgressCurrent < 1)) {
      // Stops once the mark has fully cleared the viewport — past that the
      // rocket is gone and the whole plume would be spawning off-screen, on
      // the one class of device where wasted frames cost battery.
      root.updateMatrixWorld(true);
      tailWorld.copy(TAIL_LOCAL).applyMatrix4(root.matrixWorld);
      // Fractional rate carried across frames, so a low idle trickle stays
      // an even drip instead of rounding to zero every frame and never
      // emitting at all.
      emitAccumulator += (MOBILE_IDLE_RATE + burnCurrent * (MOBILE_BURN_RATE - MOBILE_IDLE_RATE)) * dt;
      // Capped so one long frame (a backgrounded tab coming back, and
      // smoothscroll.js turns off gsap's own lag smoothing) cannot dump a
      // whole buffer's worth of sparks at once. The leftover is dropped
      // rather than carried: keeping it would just move the burst to the
      // next few frames instead of preventing it.
      const count = Math.min(Math.floor(emitAccumulator), 14);
      emitAccumulator = Math.min(emitAccumulator - count, 1);
      for (let i = 0; i < count; i++) {
        spawnExhaust(tailWorld.x, tailWorld.y, tailWorld.z, burnCurrent);
      }
    }

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
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((m) => m?.dispose());
    });
    sparkTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
