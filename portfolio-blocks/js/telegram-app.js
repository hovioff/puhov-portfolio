(() => {
  const params = new URLSearchParams(location.search);
  const hasLaunchData = ['tgWebAppVersion','tgWebAppPlatform','tgWebAppData'].some(key => params.has(key)) || /tgWebAppData=/.test(location.hash);
  const inTelegram = Boolean(window.Telegram?.WebApp) || hasLaunchData || /Telegram/i.test(navigator.userAgent) || Boolean(window.TelegramWebviewProxy || window.TelegramWebviewProxyProto);
  const inlineBack = document.querySelector('#backButton,.contact-back');
  let toastTimer=0,lastToastMessage='',lastToastAt=0;
  window.portfolioError=(message='Что-то пошло не так. Перезагрузите страницу и попробуйте снова.')=>{
    const now=Date.now();if(message===lastToastMessage&&(now-lastToastAt<1200||document.querySelector('#appErrorToast.is-visible')))return;lastToastMessage=message;lastToastAt=now;
    let toast=document.querySelector('#appErrorToast');
    if(!toast){toast=document.createElement('aside');toast.id='appErrorToast';toast.className='app-error-toast';toast.setAttribute('role','alert');toast.setAttribute('aria-live','assertive');toast.innerHTML='<span class="app-error-mark" aria-hidden="true">!</span><span class="app-error-message"></span><button class="app-error-reload" type="button">Перезагрузить</button><button class="app-error-close" type="button" aria-label="Закрыть">×</button>';document.body?.append(toast);toast.querySelector('.app-error-reload').addEventListener('click',()=>location.reload());toast.querySelector('.app-error-close').addEventListener('click',()=>toast.classList.remove('is-visible'));}
    toast.querySelector('.app-error-message').textContent=message;toast.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),12000);
  };
  window.addEventListener('error',event=>{if(event.error)window.portfolioError('На странице произошла ошибка. Перезагрузите её, чтобы продолжить.');});
  window.addEventListener('unhandledrejection',()=>window.portfolioError('Не удалось завершить загрузку. Проверьте интернет и перезагрузите страницу.'));
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
        else { try { sessionStorage.setItem('puhov-portfolio:return-to-catalog','1'); } catch {} location.href = 'index.html'; }
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

