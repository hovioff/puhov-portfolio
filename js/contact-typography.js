import { polishTypography } from './typography.js?v=20261122-02';

const root = document.querySelector('.contact-page');
if (root) {
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      observer.disconnect();
      polishTypography(root);
      observer.observe(root, { childList: true, characterData: true, subtree: true });
    });
  });
  polishTypography(root);
  observer.observe(root, { childList: true, characterData: true, subtree: true });
}
