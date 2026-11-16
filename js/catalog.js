import {getPortfolio,escapeHTML,displayProjectImageCount} from './data.js?v=20261116-07';
import {polishTypography} from './typography.js?v=20261115-01';
const grid=document.querySelector('#workGrid');
const filters=document.querySelector('#filters');
const tabs=document.querySelector('#typeTabs');
const empty=document.querySelector('#emptyState');
const searchInput=document.querySelector('#projectSearch');
const loadingMessage=document.querySelector('#catalogLoading');
const CATALOG_STATE_KEY='puhov-portfolio:catalog-state';
const RETURN_TO_CATALOG_KEY='puhov-portfolio:return-to-catalog';
function readCatalogState(){try{return JSON.parse(sessionStorage.getItem(CATALOG_STATE_KEY)||'{}');}catch{return{};}}
const savedCatalogState=readCatalogState();
let activeType=savedCatalogState.activeType||'all';const activeCategories=new Set(savedCatalogState.categories||[]);let activeSearch=savedCatalogState.search||'';let data;
function saveCatalogState(){try{sessionStorage.setItem(CATALOG_STATE_KEY,JSON.stringify({activeType,categories:[...activeCategories],search:activeSearch,scrollY:window.scrollY}));}catch{}}
const typeName=id=>data.types.find(type=>type.id===id)?.name||({products:'Карточки товаров',banners:'Экспресс-баннеры','vk-groups':'Группы ВК'}[id]||id);
const categoryName=id=>data.categories.find(category=>category.id===id)?.name||id;
const threeDSkeleton='<span class="carousel-loading-skeleton" aria-hidden="true"></span>';
const scrollImageObserver='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-out-of-view',!entry.isIntersecting)),{threshold:.025}):null;
function observeScrollImage(img){scrollImageObserver?.observe(img);}

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
const trackRuns=new WeakMap();const imageObservers=new WeakMap();const activeImageObservers=new Set();const imageLoadGuards=new WeakMap();
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
function safePlaceholder(value=''){return /^data:image\/(?:webp|png);base64,[A-Za-z0-9+/=]+$/.test(value)?escapeHTML(value):'';}
function formatCatalogDate(value=''){const timestamp=dateValue(value);return timestamp?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(timestamp):String(value||'');}
function card(project,cardIndex=0){
  const slides=project.slides||[];
  const badge='';
  const mainCarousel=project.blocks?.find(block=>block.type==='carousel'),isAvito=mainCarousel?.format==='avito';
  const aspect=isAvito?'4 / 3':project.type==='banners'?'1280 / 920':'808 / 632';
  const meta=`<div class="block-meta"><span class="work-type-badge" data-work-type="${escapeHTML(project.type)}">${escapeHTML(typeName(project.type))}</span>${project.date?`<time>${escapeHTML(formatCatalogDate(project.date))}</time>`:''}</div>`;
  if(project.previewImage?.src)return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window catalog-static-window" style="--carousel-aspect:${aspect}"><span class="carousel-loading-skeleton" aria-hidden="true"></span><img class="catalog-static-preview" src="${escapeHTML(project.previewImage.src)}" data-placeholder="${safePlaceholder(project.previewImage.placeholder)}" alt="${escapeHTML(project.title)}" loading="lazy">${badge}</div><div class="block-caption"><div class="block-copy"><h2 class="block-title">${escapeHTML(project.title)}</h2>${meta}</div><span class="slide-count"><b>${displayProjectImageCount(project)}</b><img class="photo-count-icon" src="assets/photo-icon.png" alt="" aria-hidden="true" width="14" height="14" loading="eager" decoding="async"></span></div></a>`;
  const orderedSlides=slides.length>1?[slides[slides.length-1],...slides.slice(0,-1)]:slides;
  if(!slides.length)return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}"><div class="carousel-window catalog-static-window" style="--carousel-aspect:${aspect}"></div><div class="block-caption"><div class="block-copy"><h2 class="block-title">${escapeHTML(project.title)}</h2>${meta}</div><span class="slide-count"><b>${displayProjectImageCount(project)}</b></span></div></a>`;
  const group=(duplicate=false)=>`<div class="track-set${duplicate?' track-set-repeat':''}"${duplicate?' aria-hidden="true"':''}>${orderedSlides.map((slide,index)=>{const near=index%2===1,wide=project.type==='banners',progress=index/Math.max(1,orderedSlides.length-1),drift=wide?(near?'-5px':'8px'):`-${2+progress*16}px`,cycle=54-progress*48,loading=duplicate||index>2?'lazy':'eager',priority=!duplicate&&cardIndex===0&&index===0?'high':'auto';return`<div class="slide" style="--depth:${index+1};--reveal-order:${index+(duplicate?slides.length:0)};--depth-z:${wide?(near?'12px':'-7px'):(near?'16px':'-9px')};--depth-yaw:${near?'-1.4deg':'1deg'};--depth-scale:${wide?(near?'1.012':'.994'):(near?'1.022':'.986')};--shadow-y:${wide?(near?'4px':'1px'):(near?'5px':'2px')};--shadow-blur:${wide?(near?'9px':'4px'):(near?'11px':'6px')};--shadow-alpha:${wide?(near?'.15':'.08'):(near?'.18':'.11')};--float-duration:${cycle}s;--float-delay:0s;animation-duration:${cycle}s!important;--drift-x:${drift};--drift-y:${wide?(near?'-0.8px':'0.7px'):`${.4+progress*3.6}px`}"><img src="${escapeHTML(slide.src)}" data-placeholder="${safePlaceholder(slide.placeholder)}" alt="${duplicate?'':escapeHTML(slide.alt||project.title)}" loading="${loading}" fetchpriority="${priority}" decoding="async"></div>`;}).join('')}</div>`;
  return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window${project.type==='banners'?' is-banner-carousel':''}${isAvito?' is-avito-carousel':''}" style="--carousel-aspect:${aspect}">${threeDSkeleton}<div class="track${slides.length<2?' is-static':''}" data-carousel="${escapeHTML(project.id)}">${group()}</div>${badge}</div><div class="block-caption"><div class="block-copy"><h2 class="block-title">${escapeHTML(project.title)}</h2>${meta}</div><span class="slide-count"><b>${displayProjectImageCount(project)}</b><img class="photo-count-icon" src="assets/photo-icon.png" alt="" aria-hidden="true" width="14" height="14" loading="eager" decoding="async"></span></div></a>`;
}
const cardAngle=-Math.PI*8/180,pixelsPerSecond=34;
const revealedCarousels=new WeakSet();
function revealCarouselOnEntry(viewport){if(!viewport||revealedCarousels.has(viewport)||!viewport.classList.contains('carousel-ready'))return;revealedCarousels.add(viewport);viewport.classList.add('is-scroll-revealing');}
function watchCatalogImage(img){observeScrollImage(img);if(img.dataset.catalogImageWatched==='true')return;img.dataset.catalogImageWatched='true';img.classList.add('is-image-loading');const media=img.closest('.catalog-static-window'),host=img.parentElement,placeholder=img.dataset.placeholder;if(host&&/^data:image\/(?:webp|png);base64,[A-Za-z0-9+/=]+$/.test(placeholder||'')){host.style.backgroundImage=`url(\"${placeholder}\")`;host.style.backgroundSize='cover';host.style.backgroundPosition='center';img.closest('.carousel-window,.hero3d-window,.case-slide-window,.article-image-open,.gallery-item')?.classList.add('has-lqip');}let timer=0;const finish=()=>{clearTimeout(timer);timer=0;img.classList.remove('is-image-loading','is-image-error');img.classList.add('image-ready');if(host)host.style.backgroundImage='';if(media&&img.matches('.catalog-static-preview'))media.classList.add('carousel-ready');},fail=()=>{clearTimeout(timer);timer=0;img.classList.remove('is-image-loading');img.classList.add('is-image-error');if(media&&img.matches('.catalog-static-preview'))media.classList.add('carousel-failed');window.portfolioError?.('Не удалось загрузить изображение. Проверьте интернет и перезагрузите страницу.');},armTimeout=()=>{if(!timer&&!img.complete)timer=setTimeout(()=>{timer=0;img.naturalWidth?finish():fail();},30000);};imageLoadGuards.set(img,armTimeout);if(img.complete&&img.naturalWidth){finish();return;}if(img.complete&&img.loading!=='lazy'){fail();return;}if(img.loading!=='lazy')armTimeout();img.addEventListener('load',finish,{once:true});img.addEventListener('error',fail,{once:true});}
function requestCatalogImage(img){img.loading='eager';imageLoadGuards.get(img)?.();}
async function prepareTrack(track,project){
  const run=(trackRuns.get(track)||0)+1;trackRuns.set(track,run);
  const ordered=project.slides.length>1?[project.slides.at(-1),...project.slides.slice(0,-1)]:project.slides;
  if(!ordered.length){track.closest('.carousel-window')?.classList.add('carousel-ready');return;}
  const viewport=track.parentElement,isBanner=project.type==='banners',overlap=isBanner?46:32,overscan=isBanner?54:18,viewportWidth=viewport.clientWidth,viewportHeight=viewport.clientHeight;
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
  const imageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;requestCatalogImage(entry.target);imageObserver.unobserve(entry.target);}),{root:viewport,rootMargin:'180px 0px'});
  imageObservers.set(track,imageObserver);activeImageObservers.add(imageObserver);
  const allImages=[...track.querySelectorAll('.slide img')];allImages.forEach(img=>{watchCatalogImage(img);if(!img.complete||!img.naturalWidth)imageObserver.observe(img);});
  const baseImages=[...base.querySelectorAll('.slide img')],visibleCount=Math.min(baseImages.length,Math.max(3,Math.ceil(viewportWidth/Math.max(1,widths[0]*.75))+1));
  baseImages.forEach((img,index)=>{if(index<visibleCount)requestCatalogImage(img);else img.loading='lazy';});
  const criticalImages=baseImages.slice(0,visibleCount);
  await Promise.all(criticalImages.map(img=>new Promise((resolve,reject)=>{if(img.complete){img.naturalWidth?resolve():reject(new Error('Изображение карусели недоступно'));return;}const timer=setTimeout(()=>reject(new Error('Таймаут загрузки видимых изображений')),30000);img.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});img.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Изображение карусели недоступно'));},{once:true});})));
  await Promise.all(criticalImages.map(img=>typeof img.decode==='function'?img.decode():Promise.resolve()));
  if(trackRuns.get(track)!==run||!track.isConnected)return;
  const window=track.closest('.carousel-window');window.classList.add('carousel-ready');revealCarouselOnEntry(window);
}
let trackObserver,visibilityObserver;const trackQueue=[];let preparingTracks=0;
function enqueueTrack(track,project){if(track.dataset.preparing==='true'||track.closest('.carousel-window')?.classList.contains('carousel-ready'))return;track.dataset.preparing='true';trackQueue.push({track,project});pumpTrackQueue();}
function pumpTrackQueue(){while(preparingTracks<2&&trackQueue.length){const {track,project}=trackQueue.shift();if(!track.isConnected){continue;}preparingTracks++;prepareTrack(track,project).catch(error=>{if(track.isConnected){console.warn('Карусель переключена на упрощённый показ:',error);window.portfolioError?.('Не удалось загрузить карусель. Проверьте соединение и перезагрузите страницу.');track.classList.add('is-static');track.closest('.carousel-window')?.classList.add('carousel-failed');}}).finally(()=>{preparingTracks--;if(track.isConnected)delete track.dataset.preparing;pumpTrackQueue();});}}
function draw(){
  trackObserver?.disconnect();visibilityObserver?.disconnect();trackQueue.length=0;activeImageObservers.forEach(observer=>observer.disconnect());activeImageObservers.clear();
  const query=activeSearch.trim().toLocaleLowerCase('ru');
  const shown=sortedProjects.filter(project=>{
    if(query&&!String(project.title||'').toLocaleLowerCase('ru').includes(query))return false;
    if(activeType!=='all'&&project.type!==activeType)return false;
    if(!activeCategories.size)return true;
    return activeType==='all'?activeCategories.has(project.type):activeCategories.has(project.category);
  });
  grid.innerHTML=shown.map((project,index)=>card(project,index)).join('');grid.hidden=!shown.length;empty.hidden=!!shown.length;
  polishTypography(grid);
  grid.querySelectorAll('.catalog-static-preview,.photo-count-icon,.track img').forEach(watchCatalogImage);
  const tracks=[...grid.querySelectorAll('[data-carousel]')];
  if('IntersectionObserver'in window){visibilityObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('is-carousel-in-view',entry.isIntersecting);if(entry.isIntersecting)revealCarouselOnEntry(entry.target);}),{rootMargin:'0px'});tracks.forEach(track=>visibilityObserver.observe(track.closest('.carousel-window')));}else tracks.forEach(track=>{track.closest('.carousel-window')?.classList.add('is-carousel-in-view');revealCarouselOnEntry(track.closest('.carousel-window'));});
  const startTrack=track=>{const project=projectsById.get(track.dataset.carousel);if(project&&track.isConnected)enqueueTrack(track,project);};
  if('IntersectionObserver'in window){trackObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){trackObserver.unobserve(entry.target);startTrack(entry.target);}}),{rootMargin:'480px 0px'});tracks.forEach(track=>trackObserver.observe(track));}else tracks.forEach(startTrack);
  empty.textContent=query?'По этому запросу ничего не найдено.':'В этой категории пока нет проектов.';
}
function setCatalogLoading(loading){grid.classList.toggle('is-loading',loading);grid.setAttribute('aria-busy',String(loading));if(loadingMessage)loadingMessage.hidden=!loading;}
let filterFrame=0;
function redrawFiltered(){cancelAnimationFrame(filterFrame);filterFrame=requestAnimationFrame(()=>{drawFilters();draw();});}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button||button.dataset.type===activeType)return;activeType=button.dataset.type;activeCategories.clear();saveCatalogState();tabs.querySelectorAll('.segment').forEach(segment=>{const selected=segment===button;segment.classList.toggle('is-active',selected);segment.setAttribute('aria-pressed',String(selected));});moveTypeIndicator();redrawFiltered(false);});
tabs.addEventListener('scroll',()=>moveTypeIndicator(),{passive:true});
window.addEventListener('resize',()=>moveTypeIndicator(),{passive:true});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;const key=button.dataset.filter;if(activeCategories.has(key))activeCategories.delete(key);else activeCategories.add(key);saveCatalogState();redrawFiltered(true);});
let searchTimer=0;if(searchInput){searchInput.value=activeSearch;searchInput.addEventListener('input',()=>{activeSearch=searchInput.value;saveCatalogState();clearTimeout(searchTimer);searchTimer=setTimeout(()=>redrawFiltered(),110);});}
window.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchInput?.focus();}});
grid.addEventListener('click',event=>{if(!event.target.closest('.work-block[href]'))return;saveCatalogState();try{sessionStorage.setItem(RETURN_TO_CATALOG_KEY,'1');}catch{}});
window.addEventListener('pagehide',saveCatalogState);
setCatalogLoading(true);
let fallbackError=null;try{data=await getPortfolio({onFallback:error=>fallbackError=error});}catch(error){console.error('Не удалось загрузить портфолио:',error);fallbackError=error;data={types:[],categories:[],projects:[]};}
if(activeType!=='all'&&!data.types.some(type=>type.id===activeType))activeType='all';
sortedProjects=[...data.projects].sort((a,b)=>dateValue(b.date)-dateValue(a.date)||String(a.id).localeCompare(String(b.id)));projectsById=new Map(sortedProjects.map(project=>[project.id,project]));drawTypes();drawFilters();draw();setCatalogLoading(false);if(searchInput)searchInput.value=activeSearch;
if(!data.projects.length){empty.textContent=fallbackError?'Не удалось загрузить проекты. Проверьте подключение и попробуйте ещё раз.':'Проекты скоро появятся.';empty.hidden=false;grid.hidden=true;setCatalogLoading(false);}
if(fallbackError)window.portfolioError?.('Не удалось обновить портфолио. Показана доступная сохранённая версия.');
try{if(sessionStorage.getItem(RETURN_TO_CATALOG_KEY)==='1'){sessionStorage.removeItem(RETURN_TO_CATALOG_KEY);const saved=readCatalogState();requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:Number(saved.scrollY)||0,behavior:'auto'})));}}catch{}
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  grid.querySelectorAll('[data-carousel]').forEach(track=>{const project=projectsById.get(track.dataset.carousel),viewport=track.closest('.carousel-window');if(!project||!viewport?.classList.contains('is-carousel-in-view'))return;viewport.classList.remove('carousel-failed');enqueueTrack(track,project);});
},180);},{passive:true});
