(() => {
  const KEY = 'puhov-site-loader-seen-v3';
  try { if (localStorage.getItem(KEY)) return; localStorage.setItem(KEY, '1'); } catch {}
  const loader = document.createElement('div');
  loader.className = 'site-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Загрузка сайта');
  loader.innerHTML = '<video class="site-loader-logo" autoplay muted playsinline preload="auto" aria-hidden="true"><source src="assets/Эпизод 01_5.webm" type="video/webm"></video>';
  document.body.prepend(loader);
  const finish = () => { loader.classList.add('is-done'); setTimeout(() => loader.remove(), 520); };
  window.addEventListener('load', () => setTimeout(finish, 2200), { once: true });
})();

