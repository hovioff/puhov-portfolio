import {getPortfolio,escapeHTML} from './data.js';
const data=await getPortfolio();
const grid=document.querySelector('#workGrid');
const filters=document.querySelector('#filters');
const tabs=document.querySelector('#typeTabs');
const empty=document.querySelector('#emptyState');
let activeType='all',activeCategory=null;
const typeName=id=>data.types.find(type=>type.id===id)?.name||id;
const categoryName=id=>data.categories.find(category=>category.id===id)?.name||id;
function drawTypes(){tabs.innerHTML=[{id:'all',name:'Все проекты'},...data.types].map(type=>`<button type="button" class="segment${type.id===activeType?' is-active':''}" data-type="${escapeHTML(type.id)}" aria-pressed="${String(type.id===activeType)}">${escapeHTML(type.name)}</button>`).join('');}
function drawFilters(){
  const available=[...new Set(data.projects.filter(project=>activeType==='all'||project.type===activeType).map(project=>project.category).filter(Boolean))];
  if(activeCategory&&!available.includes(activeCategory))activeCategory=null;
  filters.innerHTML=available.map(key=>`<button class="category-chip" type="button" data-category="${escapeHTML(key)}" aria-pressed="${String(key===activeCategory)}">${escapeHTML(categoryName(key))}</button>`).join('');
  filters.hidden=!available.length;
}
function card(project){
  const slides=project.slides||[];
  const pictures=slides.map((slide,index)=>`<div class="slide"><img src="${escapeHTML(slide.src)}" alt="${escapeHTML(slide.alt||project.title)}" loading="${index<2?'eager':'lazy'}"></div>`).join('');
  const loop=slides.length>1?slides.map(slide=>`<div class="slide" aria-hidden="true"><img src="${escapeHTML(slide.src)}" alt="" loading="lazy"></div>`).join(''):'';
  return `<a class="work-block" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="Открыть проект «${escapeHTML(project.title)}"><div class="carousel-window"><div class="track${slides.length<2?' is-static':''}">${pictures}${loop}</div><div class="edge"></div><div class="edge right"></div></div><div class="block-caption"><h2 class="block-title">${escapeHTML(project.title)}</h2><span class="slide-count"><b>${slides.length}</b><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5Z"/><circle cx="8.2" cy="8.4" r="2" fill="#f0f0f2"/><path d="m4.5 17 5.1-5 3.1 2.8 2.1-1.8 4.7 4H4.5Z" fill="#f0f0f2"/></svg></span></div></a>`;
}
function draw(){
  const shown=data.projects.filter(project=>(activeType==='all'||project.type===activeType)&&(!activeCategory||project.category===activeCategory));
  grid.innerHTML=shown.map(card).join('');grid.hidden=!shown.length;empty.hidden=!!shown.length;
  empty.textContent='Проекты этого типа появятся здесь.';
}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-type]');if(!button)return;activeType=button.dataset.type;activeCategory=null;drawTypes();drawFilters();draw();});
filters.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;activeCategory=activeCategory===button.dataset.category?null:button.dataset.category;drawFilters();draw();});
drawTypes();drawFilters();draw();
