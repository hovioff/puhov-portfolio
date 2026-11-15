(() => {
  const params = new URLSearchParams(location.search);
  const hasLaunchData = ['tgWebAppVersion','tgWebAppPlatform','tgWebAppData'].some(key => params.has(key)) || /tgWebAppData=/.test(location.hash);
  const inTelegram = Boolean(window.Telegram?.WebApp) || hasLaunchData || /Telegram/i.test(navigator.userAgent) || Boolean(window.TelegramWebviewProxy || window.TelegramWebviewProxyProto);
  const inlineBack = document.querySelector('#backButton,.contact-back');
  if (!inTelegram) { if (inlineBack) inlineBack.hidden = false; return; }
  // Mark immediately; Telegram WebViews can expand after first paint and otherwise
  // briefly composite preserve-3d carousel layers in a different order.
  document.body?.classList.add('tg-mini-app');

  const boot = () => {
    const app = window.Telegram?.WebApp;
    if (!app) { if (inlineBack) inlineBack.hidden = false; document.body?.classList.remove('tg-mini-app'); return; }
    const feedback = app.HapticFeedback;
    const hapticsAvailable = Boolean(feedback && (!app.isVersionAtLeast || app.isVersionAtLeast('6.1')) && (typeof feedback.impactOccurred === 'function' || typeof feedback.selectionChanged === 'function' || typeof feedback.notificationOccurred === 'function'));
    let lastHapticAt = 0;
    window.portfolioHaptic = kind => {
      const now = Date.now();
      if (now - lastHapticAt < 45) return false;
      lastHapticAt = now;
      try {
        if (hapticsAvailable) {
          if ((kind === 'success' || kind === 'warning' || kind === 'error') && typeof feedback.notificationOccurred === 'function') feedback.notificationOccurred(kind);
          else if (kind === 'selection' && typeof feedback.selectionChanged === 'function') feedback.selectionChanged();
          else if (typeof feedback.impactOccurred === 'function') feedback.impactOccurred(kind === 'medium' ? 'medium' : 'light');
          else if (typeof feedback.selectionChanged === 'function') feedback.selectionChanged();
          return true;
        }
      } catch {}
      // Some Android WebViews expose vibration even when Telegram's haptic bridge is unavailable.
      try { return typeof navigator.vibrate === 'function' && navigator.vibrate(kind === 'medium' ? 16 : 10); } catch { return false; }
    };
    try { app.ready(); } catch {}
    try { app.disableVerticalSwipes?.(); } catch {}
    try { app.expand(); } catch {}
    for (const [method, color] of [['setHeaderColor','#f5f5f7'],['setBackgroundColor','#f5f5f7'],['setBottomBarColor','#f5f5f7']]) {
      try { app[method]?.(color); } catch {}
    }
    document.addEventListener('click', event => {
      if (event.detail === 0) return;
      const control = event.target.closest('button,a,[role="button"],input:not([type="hidden"]),select');
      if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
      const selection = control.matches('.segment,.category-chip,[data-slide-to],input[type="checkbox"],input[type="radio"],select');
      if (control.matches('.segment.is-active,[data-slide-to].is-active')) return;
      window.portfolioHaptic(selection ? 'selection' : 'light');
    }, {capture:true,passive:true});

    if ((document.body.classList.contains('project-page') || document.body.classList.contains('contact-page')) && app.BackButton) {
      if (inlineBack) inlineBack.hidden = true;
      app.BackButton.show();
      app.BackButton.onClick(() => {
        const close = document.querySelector('#viewerClose');
        if (document.querySelector('#viewer.open')) close?.click();
        else location.href = 'index.html';
      });
    } else { if (inlineBack) inlineBack.hidden = false; app.BackButton?.hide(); }
  };

  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js?65';
  script.async = true;
  script.onload = boot;
  script.onerror = () => { if (inlineBack) inlineBack.hidden = false; document.body?.classList.remove('tg-mini-app'); };
  document.head.append(script);
})();
