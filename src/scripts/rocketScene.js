// Loads the real WebGL scene lazily, and only when there's somewhere to put
// it and motion is allowed. three.js plus its loader and the model itself
// are real weight (~150KB gz for the library, ~900KB for the GLB) — none of
// it should ever reach a visitor who will never see it move. The dynamic
// import is what lets Vite split that weight into its own chunk instead of
// bundling it into the script every page already pays for.
let dispose = null;

async function boot() {
  const mount = document.querySelector('[data-rocket-scene]');
  if (!mount || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { start } = await import('./rocketSceneImpl.js');
  // A fast client-side nav away can land before this resolves — don't mount
  // a scene behind a page nobody is looking at anymore.
  if (!document.body.contains(mount)) return;
  dispose = await start(mount);
}

function teardown() {
  dispose?.();
  dispose = null;
}

document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', teardown);
