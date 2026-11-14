import {getPortfolio,escapeHTML} from './data.js';
const data=await getPortfolio();
const grid=document.querySelector('#workGrid');
const filters=document.querySelector('#filters');
const tabs=document.querySelector('#typeTabs');
const empty=document.querySelector('#emptyState');
let activeType='all',activeCategory=null;
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
const sortedProjects=[...data.projects].sort((a,b)=>dateValue(b.date)-dateValue(a.date));
function drawTypes(){tabs.innerHTML=[{id:'all',name:'Общая лента'},...data.types].map(type=>`<button type="button" class="segment${type.id===activeType?' is-active':''}" data-type="${escapeHTML(type.id)}" aria-pressed="${String(type.id===activeType)}">${escapeHTML(type.name)}</button>`).join('');}
function drawFilters(){
  const available=[...new Set(sortedProjects.filter(project=>activeType==='all'||project.type===activeType).map(project=>project.category).filter(Boolean))];
  if(activeCategory&&!available.includes(activeCategory))activeCategory=null;
  filters.innerHTML=available.map(key=>`<button class="category-chip" type="button" data-category="${escapeHTML(key)}" aria-pressed="${String(key===activeCategory)}">${escapeHTML(categoryName(key))}</button>`).join('');
  filters.hidden=!available.length;
}
function card(project){
  const slides=project.slides||[];
  const orderedSlides=slides.length>1?[slides[slides.length-1],...slides.slice(0,-1)]:slides;
  const group=(duplicate=false)=>`<div class="track-set${duplicate?' track-set-repeat':''}"${duplicate?' aria-hidden="true"':''}>${orderedSlides.map(slide=>`<div class="slide"><img src="${escapeHTML(slide.src)}" alt="${duplicate?'':escapeHTML(slide.alt||project.title)}" loading="eager" decoding="async"></div>`).join('')}</div>`;
  return `<a class="work-block" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window"><div class="track${slides.length<2?' is-static':''}" data-carousel="${escapeHTML(project.id)}">${group()}</div></div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${slides.length}</b><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5Z"/><circle cx="8.2" cy="8.4" r="2" fill="#f0f0f2"/><path d="m4.5 17 5.1 5 3.1 2.8 2.1-1.8 4.7 4H4.5Z" fill="#f0f0f2"/></svg></span></div></a>`;
}
const cardAngle=-Math.PI*8/180,overlap=3,pixelsPerSecond=34;
async function naturalSize(slide,img){
  if(slide.width&&slide.height)return{width:slide.width,height:slide.height};
  if(img.complete&&img.naturalWidth)return{width:img.naturalWidth,height:img.naturalHeight};
  try{await img.decode();}catch{}
  return img.naturalWidth?{width:img.naturalWidth,height:img.naturalHeight}:{width:3,height:4};
}
async function prepareTrack(track,project){
  const ordered=project.slides.length>1?[project.slides.at(-1),...project.slides.slice(0,-1)]:project.slides;
  const h=Math.min(350,Math.max(270,window.innerWidth*.8));
  const sizes=await Promise.all(ordered.map((slide,i)=>naturalSize(slide,track.querySelector(`.track-set:not(.track-set-repeat) .slide:nth-child(${i+1}) img`))));
  const widths=sizes.map(size=>h*size.width/size.height);
  const advances=widths.map(width=>width-overlap),stepX=advances.map(advance=>advance*Math.cos(cardAngle)),stepY=advances.map(advance=>advance*Math.sin(cardAngle));
  const groupX=stepX.reduce((sum,step)=>sum+step,0),groupY=stepY.reduce((sum,step)=>sum+step,0);
  const base=track.querySelector('.track-set');
  const startX=project.slides.length>1?35-widths[0]*Math.cos(cardAngle):20;
  const copies=Math.max(1,Math.floor((track.parentElement.clientWidth-startX)/groupX)+1);
  while(track.querySelectorAll('.track-set').length<copies+1){const clone=base.cloneNode(true);clone.classList.add('track-set-repeat');clone.setAttribute('aria-hidden','true');track.append(clone);}
  track.querySelectorAll('.track-set').forEach((set,setIndex)=>{
    let rise=0;set.querySelectorAll('.slide').forEach((node,index)=>{
      const width=widths[index],advance=advances[index];
      node.style.setProperty('--slide-width',`${width}px`);node.style.setProperty('--slide-height',`${h}px`);node.style.setProperty('--slide-advance',`${stepX[index]}px`);node.style.setProperty('--rise',`${rise}px`);rise+=stepY[index];
    });
    if(setIndex)set.style.setProperty('--set-rise',`${setIndex*groupY}px`);
  });
  // One full loop moves opposite to the repeated group's offset, exactly along the card's rotated edge.
  const travelY=-groupY,distance=Math.hypot(groupX,travelY);
  const viewportHeight=track.parentElement.clientHeight,baseY=(viewportHeight-h)/2+startX*Math.tan(cardAngle)+12;
  track.style.setProperty('--card-angle','-8deg');track.style.setProperty('--travel-x',`${groupX}px`);track.style.setProperty('--travel-y',`${travelY}px`);track.style.setProperty('--base-y',`${baseY}px`);track.style.setProperty('--duration',`${distance/pixelsPerSecond}s`);track.style.left=`${startX}px`;
  track.closest('.carousel-window').classList.add('carousel-ready');
}
function draw(){
  const shown=sortedProjects.filter(project=>(activeType==='all'||project.type===activeType)&&(!activeCategory||project.category===activeCategory));
  grid.innerHTML=shown.map(card).join('');grid.hidden=!shown.length;empty.hidden=!!shown.length;
  for(const track of grid.querySelectorAll('[data-carousel]')){const project=shown.find(item=>item.id===track.dataset.carousel);if(project)prepareTrack(track,project);}
  empty.textContent='Проекты этого типа появятся здесь.';
}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button)return;activeType=button.dataset.type;activeCategory=null;drawTypes();drawFilters();draw();});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;activeCategory=activeCategory===button.dataset.category?null:button.dataset.category;drawFilters();draw();});
drawTypes();drawFilters();draw();
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(draw,180);});
