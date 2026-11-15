import {getPortfolio,escapeHTML,countProjectImages} from './data.js?v=20261115-05';
const grid=document.querySelector('#workGrid');
const filters=document.querySelector('#filters');
const tabs=document.querySelector('#typeTabs');
const empty=document.querySelector('#emptyState');
let activeType='all';const activeCategories=new Set();let data;
const typeName=id=>data.types.find(type=>type.id===id)?.name||({products:'Карточки товаров',banners:'Экспресс-баннеры','vk-groups':'Группы ВК'}[id]||id);
const categoryName=id=>data.categories.find(category=>category.id===id)?.name||id;
const monthNames={января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
function dateValue(value=''){
  const parsed=Date.parse(value);if(Number.isFinite(parsed))return parsed;
  const match=String(value).toLocaleLowerCase('ru').match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/);
  if(match&&monthNames[match[2]]!==undefined)return new Date(Number(match[3]),monthNames[match[2]],Number(match[1])).getTime();
  const numeric=String(value).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  return numeric?new Date(+numeric[3],+numeric[2]-1,+numeric[1]).getTime():0;
}
let sortedProjects=[];
const trackRuns=new WeakMap();
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
  if(project.previewImage?.src)return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window catalog-static-window"><span class="carousel-loading-skeleton" aria-hidden="true"></span><img class="catalog-static-preview" src="${escapeHTML(project.previewImage.src)}" alt="${escapeHTML(project.title)}" loading="lazy">${badge}</div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${countProjectImages(project)}</b><img class="photo-count-icon" src="assets/photo-icon.png" alt="" aria-hidden="true" width="14" height="14" loading="eager" decoding="async"></span></div></a>`;
  const orderedSlides=slides.length>1?[slides[slides.length-1],...slides.slice(0,-1)]:slides;
  const group=(duplicate=false)=>`<div class="track-set${duplicate?' track-set-repeat':''}"${duplicate?' aria-hidden="true"':''}>${orderedSlides.map((slide,index)=>{const near=index%2===1,wide=project.type==='banners',drift=near?(wide?'-5px':'-2px'):(wide?'8px':'4.5px'),cycle=wide?(near?42+(index%3)*6:6+(index%3)*.6):(near?18+(index%3)*2:3.6+(index%3)*.45),loading=duplicate||cardIndex>1||index>1?'lazy':'eager',priority=!duplicate&&cardIndex===0&&index===0?'high':'auto';return`<div class="slide" style="--depth:${index+1};--depth-z:${near?'12px':'-7px'};--depth-yaw:${near?'-1.4deg':'1deg'};--depth-scale:${near?'1.012':'.994'};--shadow-y:${near?'4px':'1px'};--shadow-blur:${near?'9px':'4px'};--shadow-alpha:${near?'.15':'.08'};--float-duration:${cycle}s;--float-delay:0s;--drift-x:${drift};--drift-y:${near?'-0.8px':'0.7px'}"><img src="${escapeHTML(slide.src)}" alt="${duplicate?'':escapeHTML(slide.alt||project.title)}" loading="${loading}" fetchpriority="${priority}" decoding="async"></div>`;}).join('')}</div>`;
  return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window${project.type==='banners'?' is-banner-carousel':''}"><span class="carousel-loading-skeleton" aria-hidden="true"></span><div class="track${slides.length<2?' is-static':''}" data-carousel="${escapeHTML(project.id)}">${group()}</div>${badge}</div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${countProjectImages(project)}</b><img class="photo-count-icon" src="assets/photo-icon.png" alt="" aria-hidden="true" width="14" height="14" loading="eager" decoding="async"></span></div></a>`;
}
const cardAngle=-Math.PI*8/180,pixelsPerSecond=34;
async function prepareTrack(track,project){
  const run=(trackRuns.get(track)||0)+1;trackRuns.set(track,run);
  const ordered=project.slides.length>1?[project.slides.at(-1),...project.slides.slice(0,-1)]:project.slides;
  const viewport=track.parentElement,isBanner=project.type==='banners',overlap=isBanner?46:18,overscan=isBanner?54:18,viewportWidth=viewport.clientWidth,viewportHeight=viewport.clientHeight;
  // Every portfolio preview uses the agreed 808:632 canvas; object-fit:cover fills it without gaps.
  const h=viewportHeight+viewportWidth*Math.tan(Math.abs(cardAngle))+18;
  const widths=ordered.map((slide,index)=>{const image=track.querySelectorAll('.slide img')[index];const w=Number(slide.width)||image?.naturalWidth||808;const h0=Number(slide.height)||image?.naturalHeight||632;return h*(w/h0);});
  const advances=widths.map(width=>Math.max(1,width-overlap)),stepX=advances.map(advance=>advance*Math.cos(cardAngle)),stepY=advances.map(advance=>advance*Math.sin(cardAngle));
  const groupX=stepX.reduce((sum,step)=>sum+step,0),groupY=stepY.reduce((sum,step)=>sum+step,0);
  const base=track.querySelector('.track-set');
  const startX=project.slides.length>1?(isBanner?-12:35)-widths[0]*Math.cos(cardAngle):20;
  const copies=Math.max(1,Math.ceil((track.parentElement.clientWidth-startX)/groupX)+3);
  while(track.querySelectorAll('.track-set').length<copies+1){const clone=base.cloneNode(true);clone.classList.add('track-set-repeat');clone.setAttribute('aria-hidden','true');clone.querySelectorAll('img').forEach(img=>{img.alt='';img.loading='eager';img.fetchPriority='low';img.classList.remove('is-image-loading','is-image-error');img.classList.add('image-ready');});track.append(clone);}
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
  const cardIndex=Number(track.closest('.work-block')?.style.getPropertyValue('--card-index')||0);
  const images=[...track.querySelectorAll('img')];
  if(cardIndex<2)images.forEach(img=>{img.loading='eager';});
  await Promise.all(images.map(img=>new Promise((resolve,reject)=>{if(img.complete){img.naturalWidth?resolve():reject(new Error('Изображение карусели недоступно'));return;}const timer=setTimeout(()=>reject(new Error('Таймаут загрузки изображения карусели')),12000);img.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});img.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Изображение карусели недоступно'));},{once:true});})));
  await Promise.all(images.map(img=>typeof img.decode==='function'?img.decode():Promise.resolve()));
  if(trackRuns.get(track)!==run||!track.isConnected)return;
  track.closest('.carousel-window').classList.add('carousel-ready');
}
let catalogRevealScheduled=false;
function revealCatalogWhenReady(){
  if(!grid.classList.contains('has-content'))return;
  const visibleCards=[...grid.querySelectorAll('.work-block')].slice(0,matchMedia('(max-width: 600px)').matches?1:2);
  const ready=visibleCards.every(card=>{
    const window=card.querySelector('.carousel-window');
    if(window?.classList.contains('catalog-static-window'))return !window.querySelector('img.is-image-loading');
    return window?.classList.contains('carousel-ready')||window?.classList.contains('carousel-failed');
  });
  if(!ready||catalogRevealScheduled)return;
  catalogRevealScheduled=true;
  setTimeout(()=>{
    if(!grid.classList.contains('has-content')){catalogRevealScheduled=false;return;}
    const stillReady=[...grid.querySelectorAll('.work-block')].slice(0,matchMedia('(max-width: 600px)').matches?1:2).every(card=>{
      const window=card.querySelector('.carousel-window');
      if(window?.classList.contains('catalog-static-window'))return !window.querySelector('img.is-image-loading');
      return window?.classList.contains('carousel-ready')||window?.classList.contains('carousel-failed');
    });
    if(!stillReady){catalogRevealScheduled=false;return;}
    grid.classList.add('is-revealing');
    setTimeout(()=>{grid.querySelectorAll('.work-skeleton').forEach(node=>node.remove());grid.classList.remove('has-content','is-revealing');setCatalogLoading(false);catalogRevealScheduled=false;},220);
  },1000);
}
let trackObserver;
function draw(){
  const shown=sortedProjects.filter(project=>{
    if(activeType!=='all'&&project.type!==activeType)return false;
    if(!activeCategories.size)return true;
    return activeType==='all'?activeCategories.has(project.type):activeCategories.has(project.category);
  });
  grid.innerHTML=shown.map((project,index)=>card(project,index)).join('');grid.hidden=!shown.length;empty.hidden=!!shown.length;
  grid.querySelectorAll('img').forEach(img=>{img.classList.add('is-image-loading');const finish=()=>{img.classList.remove('is-image-loading');img.classList.add('image-ready');const media=img.closest('.catalog-static-window');if(media)media.classList.add('carousel-ready');requestAnimationFrame(revealCatalogWhenReady);};if(img.complete&&img.naturalWidth)finish();else{img.addEventListener('load',finish,{once:true});img.addEventListener('error',()=>{img.classList.remove('is-image-loading');img.classList.add('is-image-error');const media=img.closest('.catalog-static-window');if(media)media.classList.add('carousel-failed');requestAnimationFrame(revealCatalogWhenReady);},{once:true});setTimeout(()=>{if(img.classList.contains('is-image-loading')){img.classList.remove('is-image-loading');img.classList.add('is-image-error');const media=img.closest('.catalog-static-window');if(media)media.classList.add('carousel-failed');requestAnimationFrame(revealCatalogWhenReady);}},8000);}});
  trackObserver?.disconnect();
  const tracks=[...grid.querySelectorAll('[data-carousel]')];
  const startTrack=track=>{const project=shown.find(item=>item.id===track.dataset.carousel);if(project)prepareTrack(track,project).catch(error=>{console.error('Не удалось подготовить карусель:',error);track.classList.add('is-static');track.closest('.carousel-window')?.classList.add('carousel-failed');}).finally(revealCatalogWhenReady);};
  if('IntersectionObserver'in window){trackObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){trackObserver.unobserve(entry.target);startTrack(entry.target);}}),{rootMargin:'220px 0px'});tracks.forEach(track=>trackObserver.observe(track));}else tracks.forEach(startTrack);
  empty.textContent='Проекты этого типа появятся здесь.';
}
function setCatalogLoading(loading){grid.classList.toggle('is-loading',loading);grid.setAttribute('aria-busy',String(loading));}
let filterTimer;
function redrawFiltered(animateChoice=true){clearTimeout(filterTimer);grid.classList.toggle('is-filtering',animateChoice);filterTimer=setTimeout(()=>{drawFilters();draw();requestAnimationFrame(()=>grid.classList.remove('is-filtering'));},animateChoice?130:0);}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button||button.dataset.type===activeType)return;activeType=button.dataset.type;activeCategories.clear();tabs.querySelectorAll('.segment').forEach(segment=>{const selected=segment===button;segment.classList.toggle('is-active',selected);segment.setAttribute('aria-pressed',String(selected));});moveTypeIndicator();redrawFiltered(false);});
tabs.addEventListener('scroll',()=>moveTypeIndicator(),{passive:true});
window.addEventListener('resize',()=>moveTypeIndicator(),{passive:true});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;const key=button.dataset.filter;if(activeCategories.has(key))activeCategories.delete(key);else activeCategories.add(key);redrawFiltered(true);});
setCatalogLoading(true);
try{data=await getPortfolio();}catch(error){console.error('Не удалось загрузить портфолио:',error);data={types:[],categories:[],projects:[]};}
sortedProjects=[...data.projects].sort((a,b)=>dateValue(b.date)-dateValue(a.date));const loadingCards=[...grid.querySelectorAll('.work-skeleton')].map(node=>node.cloneNode(true));drawTypes();drawFilters();draw();if(data.projects.length&&loadingCards.length){grid.prepend(...loadingCards);grid.classList.add('has-content');requestAnimationFrame(revealCatalogWhenReady);}else setCatalogLoading(false);
if(!data.projects.length){empty.textContent='Не удалось загрузить проекты. Проверьте подключение и обновите страницу.';empty.hidden=false;grid.hidden=true;setCatalogLoading(false);}
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  const visible=sortedProjects.filter(project=>(activeType==='all'||project.type===activeType)&&(!activeCategories.size||activeCategories.has(project.category)));
  grid.querySelectorAll('[data-carousel]').forEach(track=>{const project=visible.find(item=>item.id===track.dataset.carousel);if(!project)return;const viewport=track.closest('.carousel-window');if(!viewport.classList.contains('carousel-ready'))viewport.classList.remove('carousel-failed');prepareTrack(track,project).catch(error=>{console.error('Не удалось перестроить карусель:',error);track.classList.add('is-static');viewport.classList.add('carousel-failed');}).finally(revealCatalogWhenReady);});
},180);},{passive:true});
