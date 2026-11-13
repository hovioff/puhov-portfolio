import {getPortfolio,escapeHTML} from './data.js';
const {projects}=await getPortfolio();
const params=new URLSearchParams(location.search);
const project=projects.find(item=>item.id===params.get('id'));
if(!project){location.replace('index.html');throw new Error('Project not found');}
document.title=`${project.title} — Пухов Кирилл`;
document.querySelector('#projectTitle').textContent=project.title;
document.querySelector('#projectDescription').textContent=project.description||'';
document.querySelector('#projectDate').textContent=project.date||'—';
document.querySelector('#projectDuration').textContent=project.duration||'—';
const gallery=document.querySelector('#gallery');
const slides=project.slides||[];
gallery.innerHTML=slides.map((slide,i)=>`<button class="gallery-item" type="button" data-index="${i}" aria-label="Открыть изображение ${i+1}"><img src="${escapeHTML(slide.src)}" alt="${escapeHTML(slide.alt||project.title)}" loading="${i<2?'eager':'lazy'}"></button>`).join('');
const viewer=document.querySelector('#viewer'),image=document.querySelector('#viewerImage'),counter=document.querySelector('#viewerCount'),frame=document.querySelector('#viewerFrame');
let index=0,scale=1,panX=0,panY=0,returnFocus=null;
function applyZoom(){image.style.setProperty('--zoom',scale);image.style.setProperty('--x',`${panX}px`);image.style.setProperty('--y',`${panY}px`);image.classList.toggle('zoomed',scale>1.01);}
function resetZoom(){scale=1;panX=0;panY=0;applyZoom();}
function show(n){index=(n+slides.length)%slides.length;image.src=slides[index].src;image.alt=slides[index].alt||project.title;counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;resetZoom();}
function open(n){returnFocus=document.activeElement;viewer.classList.remove('closing');show(n);viewer.classList.add('open');viewer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';document.querySelector('#viewerClose').focus({preventScroll:true});}
function close(){if(!viewer.classList.contains('open'))return;viewer.classList.remove('open');viewer.classList.add('closing');viewer.setAttribute('aria-hidden','true');document.body.style.overflow='';resetZoom();setTimeout(()=>viewer.classList.remove('closing'),220);returnFocus?.focus?.({preventScroll:true});returnFocus=null;}
gallery.addEventListener('click',event=>{const item=event.target.closest('[data-index]');if(item)open(Number(item.dataset.index));});
document.querySelector('#viewerClose').addEventListener('click',close);
frame.addEventListener('click',event=>{if(scale>1.01)return;const r=frame.getBoundingClientRect(),x=event.clientX-r.left;if(x<r.width*.24)show(index-1);else if(x>r.width*.76)show(index+1);});
document.addEventListener('keydown',event=>{if(viewer.classList.contains('open')){if(event.key==='Escape')close();else if(event.key==='ArrowLeft')show(index-1);else if(event.key==='ArrowRight')show(index+1);}});
let startX=0,startY=0,startPanX=0,startPanY=0,moved=false,pinchDistance=0,pinchScale=1,pointers=new Map();
const distance=()=>{const pts=[...pointers.values()];return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);};
function clampPan(){const maxX=Math.max(0,(image.clientWidth*scale-frame.clientWidth)/2),maxY=Math.max(0,(image.clientHeight*scale-frame.clientHeight)/2);panX=Math.max(-maxX,Math.min(maxX,panX));panY=Math.max(-maxY,Math.min(maxY,panY));}
frame.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;moved=false;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});frame.setPointerCapture(event.pointerId);if(pointers.size===1){startX=event.clientX;startY=event.clientY;startPanX=panX;startPanY=panY;}else if(pointers.size===2){pinchDistance=distance();pinchScale=scale;moved=true;}});
frame.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2&&pinchDistance){scale=Math.max(1,Math.min(4,pinchScale*distance()/pinchDistance));if(scale===1){panX=0;panY=0;}else clampPan();applyZoom();moved=true;}else if(pointers.size===1&&scale>1.01){panX=startPanX+event.clientX-startX;panY=startPanY+event.clientY-startY;clampPan();applyZoom();moved=true;}else if(Math.abs(event.clientX-startX)>8||Math.abs(event.clientY-startY)>8)moved=true;});
frame.addEventListener('pointerup',event=>{const start=[startX,startY],dx=event.clientX-start[0],dy=event.clientY-start[1];pointers.delete(event.pointerId);if(pointers.size===0){if(!moved&&scale<=1.01&&Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy))show(index+(dx<0?1:-1));pinchDistance=0;}else if(pointers.size===1){const point=[...pointers.values()][0];startX=point.x;startY=point.y;startPanX=panX;startPanY=panY;}});
let backStart=null;
const shell=document.querySelector('#projectShell');
shell.addEventListener('touchstart',event=>{if(event.touches.length!==1||event.target.closest('#gallery,button,a')){backStart=null;return;}const t=event.touches[0];backStart={x:t.clientX,y:t.clientY};},{passive:true});
shell.addEventListener('touchend',event=>{if(!backStart)return;const t=event.changedTouches[0],dx=t.clientX-backStart.x,dy=t.clientY-backStart.y;backStart=null;if(dx>78&&Math.abs(dx)>Math.abs(dy)*1.25)location.href='index.html';},{passive:true});
