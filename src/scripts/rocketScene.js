// Loads the real WebGL scene lazily, and only when there's somewhere to put
// it and motion is allowed. three.js plus its loader and the model itself
// are real weight (~150KB gz for the library, ~900KB for the GLB) — none of
// it should ever reach a visitor who will never see it move. The dynamic
// import is what lets Vite split that weight into its own chunk instead of
// bundling it into the script every page already pays for.
const STORAGE_KEY = 'fi99:rocket-mode';
const MODES = ['on', 'off', 'follows'];
const MODE_LABELS = {
  on: 'On',
  off: 'Off',
  follows: 'Follows',
};
const MODE_SHORT_LABELS = {
  on: 'ON',
  off: 'OFF',
  follows: 'FLW',
};

let dispose = null;
let activeMount = null;
let bootVersion = 0;
let starting = false;

function readMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'on';
  } catch {
    return 'on';
  }
}

function writeMode(mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked in privacy modes. The setting still works for
    // this page; it simply returns to ON on the next navigation or reload.
  }
}

function syncControls(mode) {
  document.querySelectorAll('[data-rocket-control]').forEach((control) => {
    const trigger = control.querySelector('[data-rocket-control-trigger]');
    const label = MODE_LABELS[mode];

    trigger.dataset.rocketMode = mode;
    trigger.setAttribute('aria-label', `Rocket: ${label}. Choose rocket mode.`);
    trigger.title = `Rocket: ${label}`;
    control.querySelector('[data-rocket-status]').textContent = label.toUpperCase();
    control.querySelector('[data-rocket-status-short]').textContent = MODE_SHORT_LABELS[mode];

    control.querySelectorAll('[data-rocket-choice]').forEach((choice) => {
      choice.setAttribute('aria-checked', String(choice.dataset.rocketChoice === mode));
    });
  });
}

function setMenuOpen(control, open) {
  const trigger = control.querySelector('[data-rocket-control-trigger]');
  const menu = control.querySelector('[data-rocket-menu]');
  trigger.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
}

function closeMenus(except = null) {
  document.querySelectorAll('[data-rocket-control]').forEach((control) => {
    if (control !== except) setMenuOpen(control, false);
  });
}

function restoreToHero(mount) {
  mount.classList.remove('hero-rocket-scene--roam');
  const hero = document.querySelector('.hero');
  if (hero && mount.parentElement !== hero) hero.prepend(mount);
}

function placeMount(mount, mode) {
  mount.hidden = mode === 'off';
  if (mode === 'follows') {
    if (mount.parentElement !== document.body) document.body.appendChild(mount);
    mount.classList.add('hero-rocket-scene--roam');
  } else {
    restoreToHero(mount);
  }
}

function stopRendering() {
  bootVersion += 1;
  dispose?.();
  dispose = null;
}

async function boot() {
  const mount = document.querySelector('[data-rocket-scene]');
  const mode = readMode();
  syncControls(mode);

  if (!mount) {
    activeMount = null;
    return;
  }

  activeMount = mount;
  if (mode === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mount.hidden = true;
    return;
  }
  if (dispose || starting) return;

  placeMount(mount, mode);
  const thisBoot = ++bootVersion;
  starting = true;
  try {
    const { start } = await import('./rocketSceneImpl.js');
    // A fast client-side nav or a switch to OFF can land before either the
    // bundle or the model resolves. Any scene that finishes late is disposed
    // immediately instead of being left behind on an obsolete mount.
    if (thisBoot !== bootVersion || !document.body.contains(mount)) return;
    const nextDispose = await start(mount);
    if (thisBoot !== bootVersion || readMode() === 'off' || !document.body.contains(mount)) {
      nextDispose();
      return;
    }
    dispose = nextDispose;
  } finally {
    starting = false;
    // OFF can cancel a model load and ON can be selected again before that
    // cancelled promise settles. Once it does, start the current request.
    if (
      thisBoot !== bootVersion &&
      !dispose &&
      activeMount &&
      document.body.contains(activeMount) &&
      readMode() !== 'off' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      queueMicrotask(boot);
    }
  }
}

function setMode(mode) {
  if (!MODES.includes(mode)) return;
  writeMode(mode);
  syncControls(mode);

  const mount = activeMount || document.querySelector('[data-rocket-scene]');
  if (!mount) return;
  activeMount = mount;

  if (mode === 'off') {
    stopRendering();
    restoreToHero(mount);
    mount.hidden = true;
    return;
  }

  mount.hidden = false;
  placeMount(mount, mode);
  if (!dispose && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) boot();
}

function teardown() {
  stopRendering();
  if (activeMount) restoreToHero(activeMount);
  activeMount = null;
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-rocket-control-trigger]');
  if (trigger) {
    const control = trigger.closest('[data-rocket-control]');
    const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
    closeMenus(control);
    setMenuOpen(control, willOpen);
    return;
  }

  const choice = event.target.closest('[data-rocket-choice]');
  if (choice) {
    const control = choice.closest('[data-rocket-control]');
    setMode(choice.dataset.rocketChoice);
    setMenuOpen(control, false);
    control.querySelector('[data-rocket-control-trigger]').focus();
    return;
  }

  closeMenus();
});

document.addEventListener('keydown', (event) => {
  const control = event.target.closest('[data-rocket-control]');
  if (!control) return;

  const menu = control.querySelector('[data-rocket-menu]');
  const choices = [...control.querySelectorAll('[data-rocket-choice]')];
  const trigger = control.querySelector('[data-rocket-control-trigger]');
  if (event.key === 'Escape' && !menu.hidden) {
    event.preventDefault();
    setMenuOpen(control, false);
    trigger.focus();
    return;
  }

  if (event.target === trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    closeMenus(control);
    setMenuOpen(control, true);
    choices[event.key === 'ArrowDown' ? 0 : choices.length - 1].focus();
    return;
  }

  if (!choices.includes(event.target) || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const current = choices.indexOf(event.target);
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? choices.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
  choices[next].focus();
});

document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', teardown);
