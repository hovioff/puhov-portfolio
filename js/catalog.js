import {getPortfolio,escapeHTML} from './data.js';
const grid=document.querySelector('#workGrid');
const filters=document.querySelector('#filters');
const tabs=document.querySelector('#typeTabs');
const empty=document.querySelector('#emptyState');
let activeType='all';const activeCategories=new Set();let data;
const typeName=id=>data.types.find(type=>type.id===id)?.name||id;
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
function drawTypes(){tabs.innerHTML=[{id:'all',name:'Общая лента'},...data.types].map(type=>`<button type="button" class="segment${type.id===activeType?' is-active':''}" data-type="${escapeHTML(type.id)}" aria-pressed="${String(type.id===activeType)}">${escapeHTML(type.name)}</button>`).join('');}
function drawFilters(){
  const available=[...new Set(sortedProjects.filter(project=>activeType==='all'||project.type===activeType).map(project=>project.category).filter(Boolean))];
  for(const key of activeCategories)if(!available.includes(key))activeCategories.delete(key);
  filters.innerHTML=available.map(key=>`<button class="category-chip" type="button" data-category="${escapeHTML(key)}" aria-pressed="${String(activeCategories.has(key))}">${escapeHTML(categoryName(key))}</button>`).join('');
  filters.hidden=!available.length;
}
function card(project,cardIndex=0){
  const slides=project.slides||[];
  if(project.previewImage?.src)return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window catalog-static-window"><img class="catalog-static-preview" src="${escapeHTML(project.previewImage.src)}" alt="${escapeHTML(project.title)}" loading="lazy"></div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${slides.length}</b><span aria-hidden="true">▣</span></span></div></a>`;
  const orderedSlides=slides.length>1?[slides[slides.length-1],...slides.slice(0,-1)]:slides;
  const group=(duplicate=false)=>`<div class="track-set${duplicate?' track-set-repeat':''}"${duplicate?' aria-hidden="true"':''}>${orderedSlides.map((slide,index)=>{const near=index%2===1,drift=near?'-2px':'4.5px',cycle=near?8.8+(index%3)*.8:6.8+(index%3)*.5,loading=duplicate||cardIndex>1||index>1?'lazy':'eager',priority=!duplicate&&cardIndex===0&&index===0?'high':'auto';return`<div class="slide" style="--depth:${index+1};--depth-z:${near?'12px':'-7px'};--depth-yaw:${near?'-1.4deg':'1deg'};--depth-scale:${near?'1.012':'.994'};--shadow-y:${near?'4px':'1px'};--shadow-blur:${near?'9px':'4px'};--shadow-alpha:${near?'.15':'.08'};--float-duration:${cycle}s;--float-delay:0s;--drift-x:${drift};--drift-y:${near?'-0.8px':'0.7px'}"><img src="${escapeHTML(slide.src)}" alt="${duplicate?'':escapeHTML(slide.alt||project.title)}" loading="${loading}" fetchpriority="${priority}" decoding="async"></div>`;}).join('')}</div>`;
  return `<a class="work-block" style="--card-index:${Math.min(cardIndex,8)}" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window"><div class="track${slides.length<2?' is-static':''}" data-carousel="${escapeHTML(project.id)}">${group()}</div></div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${slides.length}</b><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5Z"/><circle cx="8.2" cy="8.4" r="2" fill="#f0f0f2"/><path d="m4.5 17 5.1 5 3.1 2.8 2.1-1.8 4.7 4H4.5Z" fill="#f0f0f2"/></svg></span></div></a>`;
}
const cardAngle=-Math.PI*8/180,pixelsPerSecond=34;
async function prepareTrack(track,project){
  const ordered=project.slides.length>1?[project.slides.at(-1),...project.slides.slice(0,-1)]:project.slides;
  const viewport=track.parentElement,overscan=18,viewportWidth=viewport.clientWidth,viewportHeight=viewport.clientHeight;
  // Every portfolio preview uses the agreed 808:632 canvas; object-fit:cover fills it without gaps.
  const h=viewportHeight+viewportWidth*Math.tan(Math.abs(cardAngle))+18;
  const widths=ordered.map((slide,index)=>{const image=track.querySelectorAll('.slide img')[index];const w=Number(slide.width)||image?.naturalWidth||808;const h0=Number(slide.height)||image?.naturalHeight||632;return h*(w/h0);});
  const advances=widths.map(width=>Math.max(1,width-10)),stepX=advances.map(advance=>advance*Math.cos(cardAngle)),stepY=advances.map(advance=>advance*Math.sin(cardAngle));
  const groupX=stepX.reduce((sum,step)=>sum+step,0),groupY=stepY.reduce((sum,step)=>sum+step,0);
  const base=track.querySelector('.track-set');
  const startX=project.slides.length>1?35-widths[0]*Math.cos(cardAngle):20;
  const copies=Math.max(1,Math.ceil((track.parentElement.clientWidth-startX)/groupX)+3);
  while(track.querySelectorAll('.track-set').length<copies+1){const clone=base.cloneNode(true);clone.classList.add('track-set-repeat');clone.setAttribute('aria-hidden','true');clone.querySelectorAll('img').forEach(img=>{img.alt='';img.loading='eager';img.fetchPriority='low';});track.append(clone);}
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
  track.closest('.carousel-window').classList.add('carousel-ready');
}
function draw(){
  const shown=sortedProjects.filter(project=>(activeType==='all'||project.type===activeType)&&(!activeCategories.size||activeCategories.has(project.category)));
  grid.innerHTML=shown.map((project,index)=>card(project,index)).join('');grid.hidden=!shown.length;empty.hidden=!!shown.length;
  grid.querySelectorAll('img').forEach(img=>{img.classList.add('is-image-loading');const finish=()=>{img.classList.remove('is-image-loading');img.classList.add('image-ready');};if(img.complete&&img.naturalWidth)finish();else{img.addEventListener('load',finish,{once:true});img.addEventListener('error',()=>{img.classList.remove('is-image-loading');img.classList.add('is-image-error');},{once:true});setTimeout(()=>{if(img.classList.contains('is-image-loading')){img.classList.remove('is-image-loading');img.classList.add('is-image-error');}},8000);}});
  for(const track of grid.querySelectorAll('[data-carousel]')){const project=shown.find(item=>item.id===track.dataset.carousel);if(project)prepareTrack(track,project).catch(error=>{console.error('Не удалось подготовить карусель:',error);track.classList.add('is-static');track.closest('.carousel-window')?.classList.add('carousel-ready');});}
  empty.textContent='Проекты этого типа появятся здесь.';
}
function setCatalogLoading(loading){grid.classList.toggle('is-loading',loading);grid.setAttribute('aria-busy',String(loading));}
let filterTimer;
function redrawFiltered(){clearTimeout(filterTimer);grid.classList.add('is-filtering');filterTimer=setTimeout(()=>{drawTypes();drawFilters();draw();requestAnimationFrame(()=>grid.classList.remove('is-filtering'));},130);}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button||button.dataset.type===activeType)return;activeType=button.dataset.type;activeCategories.clear();redrawFiltered();});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;const key=button.dataset.category;if(activeCategories.has(key))activeCategories.delete(key);else activeCategories.add(key);redrawFiltered();});
setCatalogLoading(true);
try{data=await getPortfolio();}catch(error){console.error('Не удалось загрузить портфолио:',error);data={types:[],categories:[],projects:[]};}
sortedProjects=[...data.projects].sort((a,b)=>dateValue(b.date)-dateValue(a.date));const loadingCards=[...grid.querySelectorAll('.work-skeleton')].map(node=>node.cloneNode(true));drawTypes();drawFilters();draw();if(data.projects.length&&loadingCards.length){grid.prepend(...loadingCards);grid.classList.add('has-content');requestAnimationFrame(()=>setCatalogLoading(false));setTimeout(()=>{grid.classList.remove('has-content');grid.querySelectorAll('.work-skeleton').forEach(node=>node.remove());},390);}else setCatalogLoading(false);
if(!data.projects.length){empty.textContent='Не удалось загрузить проекты. Проверьте подключение и обновите страницу.';empty.hidden=false;grid.hidden=true;}
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(draw,180);});
