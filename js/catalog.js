import {getPortfolio,escapeHTML,displayProjectImageCount} from './data.js?v=20261115-06';
const grid=document.querySelector('#workGrid');
const filters=document.querySelector('#filters');
const tabs=document.querySelector('#typeTabs');
const empty=document.querySelector('#emptyState');
let activeType='all';const activeCategories=new Set();let data;
const typeName=id=>data.types.find(type=>type.id===id)?.name||({products:'Карточки товаров',banners:'Экспресс-баннеры','vk-groups':'Группы ВК'}[id]||id);
const categoryName=id=>data.categories.find(category=>category.id===id)?.name||id;
const threeDSkeleton='<span class="carousel-loading-skeleton" aria-hidden="true"></span>';
const monthNames={января:0,январь:0,янв:0,февраля:1,февраль:1,фев:1,марта:2,март:2,мар:2,апреля:3,апрель:3,апр:3,мая:4,май:4,июня:5,июнь:5,июн:5,июля:6,июль:6,июл:6,августа:7,август:7,авг:7,сентября:8,сентябрь:8,сен:8,октября:9,октябрь:9,окт:9,ноября:10,ноябрь:10,ноя:10,декабря:11,декабрь:11,дек:11};
function dateValue(value=''){
  const raw=String(value).trim(),lower=raw.toLocaleLowerCase('ru');
  const numeric=raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D|$)/);
  if(numeric)return new Date(+numeric[3],+numeric[2]-1,+numeric[1]).getTime();
  const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(iso)return new Date(+iso[1],+iso[2]-1,+iso[3]).getTime();
  const dayMonth=lower.match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/);
  if(dayMonth&&monthNames[dayMonth[2]]!==undefined)return new Date(+dayMonth[3],monthNames[dayMonth[2]],+dayMonth[1]).getTime();
  const monthYear=lower.match(/([а-яё]+)\s+(\d{4})/);
  if(monthYear&&monthNames[monthYear[1]]!==undefined)return new Date(+monthYear[2],monthNames[monthYear[1]],1).getTime();
  const parsed=Date.parse(raw);if(Number.isFinite(parsed))return parsed;
  const year=raw.match(/(?:19|20)\d{2}/);return year?new Date(+year[0],0,1).getTime():0;
}
let sortedProjects=[];let projectsById=new Map();
const trackRuns=new WeakMap();const imageObservers=new WeakMap();const activeImageObservers=new Set();
function drawTypes(){
  tabs.innerHTML='<span class="segment-indicator" aria-hidden="true"></span>'+[{id:'all',name:'Общая лента'},...data.types].map(type=>`<button type="button" class="segment${type.id===activeType?' is-active':''}" data-type="${escapeHTML(type.id)}" aria-pressed="${String(type.id===activeType)}">${escapeHTML(type.name)}</button>`).join('');
  const indicator=tabs.querySelector('.segment-indicator');indicator?.classList.add('is-initializing');
  requestAnimationFrame(()=>{
    moveTypeIndicator(true);
    requestAnimationFrame(()=>indicator?.classList.remove('is-initializing'));
  });
}
function moveTypeIndicator(center=false){
  const active=tabs.querySelector('.segment.is-active'),indicator=tabs.querySelector('.segment-indicator');if(!active||!indicator)return;
  if(center)active.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  const tabsRect=tabs.getBoundingClientRect(),activeRect=active.getBoundingClientRect();
  const x=activeRect.left-tabsRect.left+tabs.scrollLeft-tabs.clientLeft;
  indicator.style.left=`${x}px`;
  indicator.style.width=`${activeRect.width}px`;
}
function drawFilters(){
  const available=activeType==='all'
    ? [...new Set(sortedProjects.map(project=>project.type).filter(Boolean))]
    : [...new Set(sortedProjects.filter(project=>project.type===activeType).map(project=>project.category).filter(Boolean))];
  for(const key of activeCategories)if(!available.includes(key))activeCategories.delete(key);
  filters.innerHTML=available.map(key=>`<button class="category-chip" type="button" data-filter="${escapeHTML(key)}" aria-pressed="${String(activeCategories.has(key))}">${escapeHTML(activeType==='all'?typeName(key):categoryName(key))}</button>`).join('');
  filters.setAttribute('aria-label',activeType==='all'?'Фильтры по типу работ':'Подкатегории');
  filters.hidden=!available.length;
}
function card(project,cardIndex=0){
  const slides=project.slides||[];
  const badge=activeType==='all'?`<span class="work-type-badge" data-work-type="${escapeHTML(project.type)}">${escapeHTML(typeName(project.type))}</span>`:'';
  const aspect=project.type==='banners'?'1280 / 920':'808 / 632';
  if(project.previewImage?.src)return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window catalog-static-window" style="--carousel-aspect:${aspect}"><span class="carousel-loading-skeleton" aria-hidden="true"></span><img class="catalog-static-preview" src="${escapeHTML(project.previewImage.src)}" alt="${escapeHTML(project.title)}" loading="lazy">${badge}</div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${displayProjectImageCount(project)}</b><img class="photo-count-icon" src="assets/photo-icon.png" alt="" aria-hidden="true" width="14" height="14" loading="eager" decoding="async"></span></div></a>`;
  const orderedSlides=slides.length>1?[slides[slides.length-1],...slides.slice(0,-1)]:slides;
  if(!slides.length)return `<a class="work-block" href="project.html?id=${encodeURIComponent(project.id)}"><div class="carousel-window catalog-static-window" style="--carousel-aspect:${aspect}"></div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${displayProjectImageCount(project)}</b></span></div></a>`;
  const group=(duplicate=false)=>`<div class="track-set${duplicate?' track-set-repeat':''}"${duplicate?' aria-hidden="true"':''}>${orderedSlides.map((slide,index)=>{const near=index%2===1,wide=project.type==='banners',drift=near?(wide?'-5px':'-2px'):(wide?'8px':'4.5px'),cycle=wide?(near?42+(index%3)*6:6+(index%3)*.6):(near?18+(index%3)*2:3.6+(index%3)*.45),loading=duplicate||index>2?'lazy':'eager',priority=!duplicate&&cardIndex===0&&index===0?'high':'auto';return`<div class="slide" style="--depth:${index+1};--reveal-order:${index+(duplicate?slides.length:0)};--depth-z:${near?'12px':'-7px'};--depth-yaw:${near?'-1.4deg':'1deg'};--depth-scale:${near?'1.012':'.994'};--shadow-y:${near?'4px':'1px'};--shadow-blur:${near?'9px':'4px'};--shadow-alpha:${near?'.15':'.08'};--float-duration:${cycle}s;--float-delay:0s;--drift-x:${drift};--drift-y:${near?'-0.8px':'0.7px'}"><img src="${escapeHTML(slide.src)}" alt="${duplicate?'':escapeHTML(slide.alt||project.title)}" loading="${loading}" fetchpriority="${priority}" decoding="async"></div>`;}).join('')}</div>`;
  return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window${project.type==='banners'?' is-banner-carousel':''}" style="--carousel-aspect:${aspect}">${threeDSkeleton}<div class="track${slides.length<2?' is-static':''}" data-carousel="${escapeHTML(project.id)}">${group()}</div>${badge}</div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${displayProjectImageCount(project)}</b><img class="photo-count-icon" src="assets/photo-icon.png" alt="" aria-hidden="true" width="14" height="14" loading="eager" decoding="async"></span></div></a>`;
}
const cardAngle=-Math.PI*8/180,pixelsPerSecond=34;
const revealedCarousels=new WeakSet();
function revealCarouselOnEntry(viewport){if(!viewport||revealedCarousels.has(viewport)||!viewport.classList.contains('carousel-ready'))return;revealedCarousels.add(viewport);viewport.classList.add('is-scroll-revealing');}
function watchCatalogImage(img){if(img.dataset.catalogImageWatched==='true')return;img.dataset.catalogImageWatched='true';img.classList.add('is-image-loading');const media=img.closest('.catalog-static-window'),finish=()=>{img.classList.remove('is-image-loading','is-image-error');img.classList.add('image-ready');if(media&&img.matches('.catalog-static-preview'))media.classList.add('carousel-ready');},fail=()=>{img.classList.remove('is-image-loading');img.classList.add('is-image-error');if(media&&img.matches('.catalog-static-preview'))media.classList.add('carousel-failed');};if(img.complete){img.naturalWidth?finish():fail();return;}let timer=setTimeout(fail,12000);img.addEventListener('load',()=>{clearTimeout(timer);finish();},{once:true});img.addEventListener('error',()=>{clearTimeout(timer);fail();},{once:true});}
async function prepareTrack(track,project){
  const run=(trackRuns.get(track)||0)+1;trackRuns.set(track,run);
  const ordered=project.slides.length>1?[project.slides.at(-1),...project.slides.slice(0,-1)]:project.slides;
  if(!ordered.length){track.closest('.carousel-window')?.classList.add('carousel-ready');return;}
  const viewport=track.parentElement,isBanner=project.type==='banners',overlap=isBanner?46:44,overscan=isBanner?54:18,viewportWidth=viewport.clientWidth,viewportHeight=viewport.clientHeight;
  // Every portfolio preview uses the agreed 808:632 canvas; object-fit:cover fills it without gaps.
  const h=viewportHeight+viewportWidth*Math.tan(Math.abs(cardAngle))+18;
  const widths=ordered.map((slide,index)=>{const image=track.querySelectorAll('.slide img')[index];const w=Number(slide.width)||image?.naturalWidth||808;const h0=Number(slide.height)||image?.naturalHeight||632;return h*(w/h0);});
  const advances=widths.map(width=>Math.max(1,width-overlap)),stepX=advances.map(advance=>advance*Math.cos(cardAngle)),stepY=advances.map(advance=>advance*Math.sin(cardAngle));
  const groupX=stepX.reduce((sum,step)=>sum+step,0),groupY=stepY.reduce((sum,step)=>sum+step,0);
  const base=track.querySelector('.track-set');
  const startX=project.slides.length>1?(isBanner?-12:35)-widths[0]*Math.cos(cardAngle):20;
  const copies=ordered.length>1?Math.max(1,Math.ceil(viewportWidth/Math.max(1,groupX))+1):0;
  while(track.querySelectorAll('.track-set').length<copies+1){const clone=base.cloneNode(true);clone.classList.add('track-set-repeat');clone.setAttribute('aria-hidden','true');clone.querySelectorAll('img').forEach(img=>{img.alt='';img.loading='lazy';img.fetchPriority='low';img.classList.remove('is-image-loading','is-image-error');delete img.dataset.catalogImageWatched;});track.append(clone);}
  while(track.querySelectorAll('.track-set').length>copies+1)track.lastElementChild?.remove();
  track.querySelectorAll('.track-set').forEach((set,setIndex)=>{
    let rise=0;set.querySelectorAll('.slide').forEach((node,index)=>{
      const width=widths[index],advance=advances[index];
      node.style.setProperty('--slide-width',`${width}px`);node.style.setProperty('--slide-height',`${h}px`);node.style.setProperty('--slide-advance',`${stepX[index]}px`);node.style.setProperty('--rise',`${rise}px`);rise+=stepY[index];
    });
    if(setIndex)set.style.setProperty('--set-rise',`${setIndex*groupY}px`);
  });
  // One full loop moves opposite to the repeated group's offset, exactly along the card's rotated edge.
  const travelY=-groupY,distance=Math.hypot(groupX,travelY);
  const baseY=-overscan/2+10+startX*Math.tan(cardAngle);
  track.style.setProperty('--card-angle','-8deg');track.style.setProperty('--travel-x',`${groupX}px`);track.style.setProperty('--travel-y',`${travelY}px`);track.style.setProperty('--base-y',`${baseY}px`);track.style.setProperty('--duration',`${distance/pixelsPerSecond}s`);track.style.left=`${startX}px`;
  imageObservers.get(track)?.disconnect();
  const imageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.loading='eager';imageObserver.unobserve(entry.target);}),{root:viewport,rootMargin:'180px 0px'});
  imageObservers.set(track,imageObserver);activeImageObservers.add(imageObserver);
  const allImages=[...track.querySelectorAll('.slide img')];allImages.forEach(img=>{watchCatalogImage(img);if(!img.complete||!img.naturalWidth)imageObserver.observe(img);});
  const baseImages=[...base.querySelectorAll('.slide img')],visibleCount=Math.min(baseImages.length,Math.max(3,Math.ceil(viewportWidth/Math.max(1,widths[0]*.75))+1));
  baseImages.forEach((img,index)=>{img.loading=index<visibleCount?'eager':'lazy';});
  const criticalImages=baseImages.slice(0,visibleCount);
  await Promise.all(criticalImages.map(img=>new Promise((resolve,reject)=>{if(img.complete){img.naturalWidth?resolve():reject(new Error('Изображение карусели недоступно'));return;}const timer=setTimeout(()=>reject(new Error('Таймаут загрузки видимых изображений')),8000);img.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});img.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Изображение карусели недоступно'));},{once:true});})));
  await Promise.all(criticalImages.map(img=>typeof img.decode==='function'?img.decode():Promise.resolve()));
  if(trackRuns.get(track)!==run||!track.isConnected)return;
  const window=track.closest('.carousel-window');window.classList.add('carousel-ready');revealCarouselOnEntry(window);
}
let trackObserver,visibilityObserver;const trackQueue=[];let preparingTracks=0;
function enqueueTrack(track,project){if(track.dataset.preparing==='true'||track.closest('.carousel-window')?.classList.contains('carousel-ready'))return;track.dataset.preparing='true';trackQueue.push({track,project});pumpTrackQueue();}
function pumpTrackQueue(){while(preparingTracks<2&&trackQueue.length){const {track,project}=trackQueue.shift();if(!track.isConnected){continue;}preparingTracks++;prepareTrack(track,project).catch(error=>{if(track.isConnected){console.warn('Карусель переключена на упрощённый показ:',error);track.classList.add('is-static');track.closest('.carousel-window')?.classList.add('carousel-failed');}}).finally(()=>{preparingTracks--;if(track.isConnected)delete track.dataset.preparing;pumpTrackQueue();});}}
function draw(){
  trackObserver?.disconnect();visibilityObserver?.disconnect();trackQueue.length=0;activeImageObservers.forEach(observer=>observer.disconnect());activeImageObservers.clear();
  const shown=sortedProjects.filter(project=>{
    if(activeType!=='all'&&project.type!==activeType)return false;
    if(!activeCategories.size)return true;
    return activeType==='all'?activeCategories.has(project.type):activeCategories.has(project.category);
  });
  grid.innerHTML=shown.map((project,index)=>card(project,index)).join('');grid.hidden=!shown.length;empty.hidden=!!shown.length;
  grid.querySelectorAll('.catalog-static-preview,.photo-count-icon,.track img').forEach(watchCatalogImage);
  const tracks=[...grid.querySelectorAll('[data-carousel]')];
  if('IntersectionObserver'in window){visibilityObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('is-carousel-in-view',entry.isIntersecting);if(entry.isIntersecting)revealCarouselOnEntry(entry.target);}),{rootMargin:'0px'});tracks.forEach(track=>visibilityObserver.observe(track.closest('.carousel-window')));}else tracks.forEach(track=>{track.closest('.carousel-window')?.classList.add('is-carousel-in-view');revealCarouselOnEntry(track.closest('.carousel-window'));});
  const startTrack=track=>{const project=projectsById.get(track.dataset.carousel);if(project&&track.isConnected)enqueueTrack(track,project);};
  if('IntersectionObserver'in window){trackObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){trackObserver.unobserve(entry.target);startTrack(entry.target);}}),{rootMargin:'480px 0px'});tracks.forEach(track=>trackObserver.observe(track));}else tracks.forEach(startTrack);
  empty.textContent='Проекты этого типа появятся здесь.';
}
function setCatalogLoading(loading){grid.classList.toggle('is-loading',loading);grid.setAttribute('aria-busy',String(loading));}
let filterFrame=0;
function redrawFiltered(){cancelAnimationFrame(filterFrame);filterFrame=requestAnimationFrame(()=>{drawFilters();draw();});}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button||button.dataset.type===activeType)return;activeType=button.dataset.type;activeCategories.clear();tabs.querySelectorAll('.segment').forEach(segment=>{const selected=segment===button;segment.classList.toggle('is-active',selected);segment.setAttribute('aria-pressed',String(selected));});moveTypeIndicator();redrawFiltered(false);});
tabs.addEventListener('scroll',()=>moveTypeIndicator(),{passive:true});
window.addEventListener('resize',()=>moveTypeIndicator(),{passive:true});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;const key=button.dataset.filter;if(activeCategories.has(key))activeCategories.delete(key);else activeCategories.add(key);redrawFiltered(true);});
setCatalogLoading(true);
try{data=await getPortfolio();}catch(error){console.error('Не удалось загрузить портфолио:',error);data={types:[],categories:[],projects:[]};}
sortedProjects=[...data.projects].sort((a,b)=>dateValue(b.date)-dateValue(a.date)||String(a.id).localeCompare(String(b.id)));projectsById=new Map(sortedProjects.map(project=>[project.id,project]));drawTypes();drawFilters();draw();setCatalogLoading(false);
if(!data.projects.length){empty.textContent='Не удалось загрузить проекты. Проверьте подключение и обновите страницу.';empty.hidden=false;grid.hidden=true;setCatalogLoading(false);}
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  grid.querySelectorAll('[data-carousel]').forEach(track=>{const project=projectsById.get(track.dataset.carousel),viewport=track.closest('.carousel-window');if(!project||!viewport?.classList.contains('is-carousel-in-view'))return;viewport.classList.remove('carousel-failed');enqueueTrack(track,project);});
},180);},{passive:true});
