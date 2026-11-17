(() => {
  const stage = document.querySelector('#startStage');
  const scene = document.querySelector('#wordmarkScene');
  if (!stage || !scene) return;
  let startX = 0, startY = 0, lastTouch = 0, resetTimer = 0;
  const setMotion = (x, y, spread = 0) => {
    stage.style.setProperty('--tilt-x', `${Math.max(-7, Math.min(7, y * -0.018))}deg`);
    stage.style.setProperty('--tilt-y', `${Math.max(-8, Math.min(8, x * 0.018))}deg`);
    stage.style.setProperty('--touch-x', `${Math.max(-18, Math.min(18, x * .035))}px`);
    stage.style.setProperty('--touch-y', `${Math.max(-12, Math.min(12, y * .025))}px`);
    stage.style.setProperty('--spread', `${Math.max(-1, Math.min(1, spread))}`);
    stage.classList.add('is-interacting');
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { stage.classList.remove('is-interacting'); stage.style.setProperty('--tilt-x','0deg'); stage.style.setProperty('--tilt-y','0deg'); stage.style.setProperty('--touch-x','0px'); stage.style.setProperty('--touch-y','0px'); stage.style.setProperty('--spread','0'); }, 900);
  };
  scene.addEventListener('pointermove', event => { if (event.pointerType === 'touch') return; const r = scene.getBoundingClientRect(); setMotion(event.clientX-r.left-r.width/2, event.clientY-r.top-r.height/2); });
  scene.addEventListener('pointerleave', () => setMotion(0, 0));
  scene.addEventListener('touchstart', event => { const t = event.touches[0]; startX = t.clientX; startY = t.clientY; lastTouch = Date.now(); }, {passive:true});
  scene.addEventListener('touchmove', event => { const t = event.touches[0]; setMotion(t.clientX-startX, t.clientY-startY, (t.clientX-startX)/Math.max(1,scene.clientWidth)); }, {passive:true});
  scene.addEventListener('touchend', event => { const t = event.changedTouches[0], dx = t.clientX-startX, dy = t.clientY-startY; if (Math.abs(dx) > 42 || Math.abs(dy) > 42) { setMotion(dx,dy,dx/Math.max(1,scene.clientWidth)); window.portfolioHaptic?.('selection'); } });
  document.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') setMotion(-80,0,-.6); if (event.key === 'ArrowRight') setMotion(80,0,.6); });
})();
