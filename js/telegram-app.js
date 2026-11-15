(() => {
  const params = new URLSearchParams(location.search);
  const inTelegram = params.has('tgWebAppVersion') || /Telegram/i.test(navigator.userAgent);
  if (!inTelegram) return;

  const boot = () => {
    const app = window.Telegram?.WebApp;
    if (!app) return;
    document.body?.classList.add('tg-mini-app');
    app.ready();
    app.expand();
    app.setHeaderColor?.('#f5f5f7');
    app.setBackgroundColor?.('#f5f5f7');
    app.setBottomBarColor?.('#f5f5f7');

    const feedback = app.HapticFeedback;
    const hapticsAvailable = Boolean(feedback && typeof feedback.impactOccurred === 'function' && (!app.isVersionAtLeast || app.isVersionAtLeast('6.1')));
    window.portfolioHaptic = kind => {
      if (!hapticsAvailable) return false;
      try {
        if (kind === 'selection') feedback.selectionChanged();
        else if (kind === 'success' || kind === 'warning' || kind === 'error') feedback.notificationOccurred(kind);
        else feedback.impactOccurred(kind === 'medium' ? 'medium' : 'light');
        return true;
      } catch { return false; }
    };
    document.addEventListener('click', event => {
      if (event.detail === 0) return;
      const control = event.target.closest('button,a,[role="button"]');
      if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
      if (control.matches('.segment,.category-chip,[data-slide-to]')) {
        if (control.matches('.segment.is-active,.category-chip[aria-pressed="true"],[data-slide-to].is-active')) return;
        window.portfolioHaptic('selection');
      } else if (control.matches('.gallery-item,.article-image-open,.case-slide,.viewer-close,.order-fab,.telegram-button')) {
        window.portfolioHaptic('light');
      }
    }, {capture:true,passive:true});

    if ((document.body.classList.contains('project-page') || document.body.classList.contains('contact-page')) && app.BackButton) {
      app.BackButton.show();
      app.BackButton.onClick(() => {
        const close = document.querySelector('#viewerClose');
        if (document.querySelector('#viewer.open')) close?.click();
        else location.href = 'index.html';
      });
    } else app.BackButton?.hide();
  };

  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js?65';
  script.async = true;
  script.onload = boot;
  document.head.append(script);
})();
