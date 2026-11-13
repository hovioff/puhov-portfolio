import {getPortfolio,savePortfolio,escapeHTML} from './data.js';
const data=await getPortfolio(),list=document.querySelector('#adminList'),editor=document.querySelector('#editor'),form=document.querySelector('#projectForm');
let editingSlides=[];
const slug=value=>String(value).trim().toLocaleLowerCase('ru').replace(/[^a-zа-яё0-9]+/gi,'-').replace(/(^-|-$)/g,'')||`item-${Date.now()}`;
const typeName=id=>data.types.find(item=>item.id===id)?.name||id;
const categoryName=id=>data.categories.find(item=>item.id===id)?.name||id;
function uniqueId(items,value){const base=slug(value);let id=base,n=2;while(items.some(item=>item.id===id))id=`${base}-${n++}`;return id;}
function renderList(){list.innerHTML=data.projects.map(p=>`<div class="admin-row"><div><strong>${escapeHTML(p.title)}</strong><small>${escapeHTML(typeName(p.type))} · ${escapeHTML(categoryName(p.category))} · ${p.slides.length} слайдов</small></div><button type="button" data-edit="${escapeHTML(p.id)}" aria-label="Изменить ${escapeHTML(p.title)}">✎</button></div>`).join('')||'<p class="empty-state">Проектов пока нет.</p>';}
function renderStructure(){
  document.querySelector('#typeList').innerHTML=data.types.map(type=>`<span class="builder-chip">${escapeHTML(type.name)}</span>`).join('');
  const typeOptions=data.types.map(type=>`<option value="${escapeHTML(type.id)}">${escapeHTML(type.name)}</option>`).join('');
  document.querySelector('#categoryType').innerHTML=typeOptions;
  document.querySelector('#categoryList').innerHTML=data.categories.map(category=>`<span class="builder-chip">${escapeHTML(category.name)} <small>${escapeHTML(typeName(category.typeId))}</small></span>`).join('');
}
function renderProjectSelects(typeId,categoryId){
  const typeSelect=form.elements.type,categorySelect=form.elements.category;
  typeSelect.innerHTML=data.types.map(type=>`<option value="${escapeHTML(type.id)}">${escapeHTML(type.name)}</option>`).join('');
  typeSelect.value=data.types.some(type=>type.id===typeId)?typeId:data.types[0]?.id||'';
  const categories=data.categories.filter(category=>category.typeId===typeSelect.value);
  categorySelect.innerHTML=categories.map(category=>`<option value="${escapeHTML(category.id)}">${escapeHTML(category.name)}</option>`).join('');
  categorySelect.value=categories.some(category=>category.id===categoryId)?categoryId:categories[0]?.id||'';
}
function renderPreview(){document.querySelector('#slidePreview').innerHTML=editingSlides.map((slide,i)=>`<div class="preview-tile"><img src="${escapeHTML(slide.src)}" alt=""><button type="button" data-remove-slide="${i}" aria-label="Удалить слайд ${i+1}">×</button></div>`).join('');}
function edit(project=null){form.reset();editingSlides=project?[...project.slides]:[];form.elements.id.value=project?.id||'';form.elements.title.value=project?.title||'';renderProjectSelects(project?.type||data.types[0]?.id,project?.category);form.elements.date.value=project?.date||'';form.elements.duration.value=project?.duration||'';form.elements.description.value=project?.description||'';document.querySelector('#editorHeading').textContent=project?'Редактировать проект':'Новый проект';document.querySelector('#deleteProject').hidden=!project;document.querySelector('#saveStatus').textContent='';editor.hidden=false;renderPreview();editor.scrollIntoView({behavior:'smooth',block:'start'});}
async function imageData(file){
  let bitmap;try{bitmap=await createImageBitmap(file);}catch{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({src:reader.result,alt:file.name});reader.onerror=reject;reader.readAsDataURL(file);});}
  const scale=Math.min(1,1500/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return{src:canvas.toDataURL('image/webp',.84),alt:file.name};
}
async function addSlides(files){
  const images=[...files].filter(file=>file.type.startsWith('image/'));
  if(!images.length)return;
  const zone=document.querySelector('#dropZone');zone.classList.add('is-loading');
  try{editingSlides.push(...await Promise.all(images.map(imageData)));renderPreview();}
  catch(error){document.querySelector('#saveStatus').textContent='Не удалось обработать одно из изображений.';console.error(error);}
  finally{zone.classList.remove('is-loading');form.elements.slides.value='';}
}
renderList();renderStructure();
document.querySelector('#addProject').addEventListener('click',()=>edit());
document.querySelector('#cancelEdit').addEventListener('click',()=>{editor.hidden=true;});
list.addEventListener('click',event=>{const button=event.target.closest('[data-edit]');if(button)edit(data.projects.find(p=>p.id===button.dataset.edit));});
form.elements.type.addEventListener('change',()=>renderProjectSelects(form.elements.type.value));
document.querySelector('#typeForm').addEventListener('submit',async event=>{event.preventDefault();const input=document.querySelector('#newType'),name=input.value.trim();if(!name)return;data.types.push({id:uniqueId(data.types,name),name});await savePortfolio(data);input.value='';renderStructure();renderProjectSelects(form.elements.type.value);});
document.querySelector('#categoryForm').addEventListener('submit',async event=>{event.preventDefault();const input=document.querySelector('#newCategory'),name=input.value.trim(),typeId=document.querySelector('#categoryType').value;if(!name||!typeId)return;data.categories.push({id:uniqueId(data.categories,name),typeId,name});await savePortfolio(data);input.value='';renderStructure();renderProjectSelects(form.elements.type.value);});
document.querySelector('#slidePreview').addEventListener('click',event=>{const button=event.target.closest('[data-remove-slide]');if(button){editingSlides.splice(Number(button.dataset.removeSlide),1);renderPreview();}});
form.elements.slides.addEventListener('change',event=>addSlides(event.target.files));
const dropZone=document.querySelector('#dropZone');
['dragenter','dragover'].forEach(name=>dropZone.addEventListener(name,event=>{event.preventDefault();dropZone.classList.add('is-dragging');}));
['dragleave','drop'].forEach(name=>dropZone.addEventListener(name,event=>{event.preventDefault();dropZone.classList.remove('is-dragging');}));
dropZone.addEventListener('drop',event=>addSlides(event.dataTransfer.files));
form.addEventListener('submit',async event=>{
  event.preventDefault();const f=new FormData(form),title=String(f.get('title')).trim(),existingId=String(f.get('id')||''),id=existingId||`project-${Date.now()}`;
  const status=document.querySelector('#saveStatus');status.textContent='Сохраняю…';
  try{
    const project={id,title,type:String(f.get('type')),category:String(f.get('category')),date:String(f.get('date')).trim(),duration:String(f.get('duration')).trim(),description:String(f.get('description')).trim(),slides:[...editingSlides]};
    if(!project.slides.length){status.textContent='Добавьте хотя бы один слайд.';return;}
    const index=data.projects.findIndex(p=>p.id===id);if(index<0)data.projects.unshift(project);else data.projects[index]=project;
    await savePortfolio(data);renderList();editor.hidden=true;
  }catch(error){status.textContent='Не удалось сохранить. Попробуйте загрузить изображения меньшего размера.';console.error(error);}
});
document.querySelector('#deleteProject').addEventListener('click',async()=>{
  const id=form.elements.id.value;if(!id||!confirm('Удалить проект и его слайды?'))return;
  data.projects=data.projects.filter(p=>p.id!==id);await savePortfolio(data);renderList();editor.hidden=true;
});
