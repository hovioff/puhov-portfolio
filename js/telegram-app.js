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
    window.portfolioHaptic = kind => {
      try {
        if (kind === 'selection') feedback?.selectionChanged();
        else feedback?.impactOccurred('light');
      } catch {}
    };

    document.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      const control = event.target.closest('button,a,[role="button"]');
      if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
      if (control.matches('.segment,.category-chip')) {
        if (control.matches('.segment[aria-pressed="true"],.category-chip[aria-pressed="true"],[data-slide-to].is-active')) return;
        window.portfolioHaptic('selection');
      } else if (!control.matches('.case-slide,.viewer-arrow')) window.portfolioHaptic('light');
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
