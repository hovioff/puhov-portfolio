(() => {
  const RETURN_TO_CATALOG_KEY = 'puhov-portfolio:return-to-catalog';
  let returningFromProject = false;
  try {
    returningFromProject = sessionStorage.getItem(RETURN_TO_CATALOG_KEY) === '1';
    if (returningFromProject) sessionStorage.removeItem(RETURN_TO_CATALOG_KEY);
  } catch {}
  if (returningFromProject) return;

  const startedAt = performance.now();
  const loader = document.createElement('div');
  loader.className = 'site-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Загрузка сайта');
  loader.innerHTML = '<video class="site-loader-logo" autoplay muted playsinline preload="auto" aria-hidden="true"><source src="assets/Эпизод 01_5.webm" type="video/webm"></video>';
  document.body.prepend(loader);

  let catalogReady = false;
  let pageLoaded = document.readyState === 'complete';
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    loader.classList.add('is-done');
    setTimeout(() => loader.remove(), 520);
  };
  const finishWhenReady = () => {
    if (finished || !catalogReady || !pageLoaded) return;
    const delay = Math.max(0, 1400 - (performance.now() - startedAt));
    setTimeout(finish, delay);
  };
  window.addEventListener('portfolio:catalog-ready', () => { catalogReady = true; finishWhenReady(); }, { once: true });
  window.addEventListener('load', () => { pageLoaded = true; finishWhenReady(); }, { once: true });
  setTimeout(finish, 3500);
})();

