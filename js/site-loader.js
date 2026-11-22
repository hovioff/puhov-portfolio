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
  loader.innerHTML = '<div class="site-loader-orbit" aria-hidden="true"><span></span><span></span><span></span></div><strong class="site-loader-label">Загрузка</strong>';
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

