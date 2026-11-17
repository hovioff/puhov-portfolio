import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SUPABASE_BUCKET} from './supabase-config.js';

export const DEFAULT_DATA = {
  types:[{id:'products',name:'Карточки товаров'},{id:'banners',name:'Экспресс-баннеры'},{id:'vk-groups',name:'Группы ВК'}],
  categories:[{id:'animals',typeId:'products',name:'Товары для животных'},{id:'tech',typeId:'products',name:'Техника'},{id:'other',typeId:'products',name:'Другое'}],
  projects: [{
    id: 'meatbone', type: 'products', category: 'animals', title: 'Мясное печенье для собак',
    description: 'Визуальная упаковка продукта для маркетплейсов. Акцент на аппетитной подаче, понятной выгоде и характере бренда.',
    date: '1 октября 2026', duration: 'за 2 дня',
    slides: [1,2,3,4,5].map((n) => ({src:`assets/meatbone/slide-${String(n).padStart(2,'0')}.webp`,alt:`Мясное печенье для собак — слайд ${n}`,width:420,height:560}))
  }]
};
const DB_NAME='puhov-portfolio';
let clientPromise;
export const cloudEnabled=Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY&&!SUPABASE_URL.includes('YOUR_')&&!SUPABASE_PUBLISHABLE_KEY.includes('YOUR_'));
export async function getSupabase(){
  if(!cloudEnabled)throw new Error('Сначала заполните js/supabase-config.js.');
  clientPromise||=(async()=>{const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');return createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});})();
  return clientPromise;
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function normalise(data){const next=clone(data||DEFAULT_DATA);next.types=Array.isArray(next.types)?next.types:[];for(const type of DEFAULT_DATA.types)if(!next.types.some(item=>item.id===type.id))next.types.push(clone(type));if(!next.types.length)next.types=clone(DEFAULT_DATA.types);next.categories=Array.isArray(next.categories)&&next.categories.length?next.categories:clone(DEFAULT_DATA.categories);next.projects=Array.isArray(next.projects)?next.projects:[];return next;}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore('content');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function getLocal(){try{const db=await openDatabase();const saved=await new Promise((resolve,reject)=>{const request=db.transaction('content','readonly').objectStore('content').get('portfolio');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();return normalise(saved||DEFAULT_DATA);}catch{return normalise(DEFAULT_DATA);}}
export async function getAdminDraft(){try{const db=await openDatabase();const value=await new Promise((resolve,reject)=>{const request=db.transaction('content','readonly').objectStore('content').get('admin-draft');request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});db.close();return value;}catch(error){console.warn('Could not read the local admin draft.',error);return null;}}
export async function saveAdminDraft(draft){const db=await openDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('content','readwrite');tx.objectStore('content').put(draft,'admin-draft');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();return draft;}
export async function deleteAdminDraft(){const db=await openDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('content','readwrite');tx.objectStore('content').delete('admin-draft');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();}
async function mapLimit(items,limit,mapper){const results=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const index=next++;if(index>=items.length)return;results[index]=await mapper(items[index],index);}}));return results;}
export async function getPortfolio({onFallback}={}){
  if(!cloudEnabled)return getLocal();
  try{
    const url=new URL(`${SUPABASE_URL}/rest/v1/portfolio_content`);
    url.searchParams.set('select','payload');url.searchParams.set('id','eq.main');
    const response=await fetch(url,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error(`Supabase read failed (${response.status})`);
    const rows=await response.json();
    return normalise(rows[0]?.payload||await getLocal());
  }catch(error){
    console.warn('Could not load the cloud portfolio; showing the local fallback.',error);
    onFallback?.(error);
    return getLocal();
  }
}
function dataURLToBlob(value){const comma=value.indexOf(',');if(!value.startsWith('data:')||comma<0)throw new Error('Не удалось прочитать локальное изображение.');const metadata=value.slice(5,comma),payload=value.slice(comma+1),mime=metadata.split(';')[0]||'application/octet-stream';let bytes;if(/(?:^|;)base64(?:;|$)/i.test(metadata)){const binary=atob(payload.replace(/\s/g,''));bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);}else bytes=new TextEncoder().encode(decodeURIComponent(payload));return new Blob([bytes],{type:mime});}
async function uploadSlide(supabase,slide,projectId,index){
  const upload=async(value,suffix)=>{if(!value?.startsWith('data:'))return value;const blob=dataURLToBlob(value);if(!['image/webp','image/png','image/jpeg','image/avif'].includes(blob.type))throw new Error('Неподдерживаемый формат изображения.');const ext=blob.type==='image/png'?'png':blob.type==='image/jpeg'?'jpg':blob.type==='image/avif'?'avif':'webp',path=`${projectId}/${Date.now()}-${index}-${suffix}.${ext}`;const{error}=await supabase.storage.from(SUPABASE_BUCKET).upload(path,blob,{contentType:blob.type,upsert:true});if(error)throw error;return supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl;};
  if(!slide.src?.startsWith('data:')){if(!slide.previewSrc?.startsWith('data:'))return slide;return{...slide,previewSrc:await upload(slide.previewSrc,'small')};}
  return{...slide,src:await upload(slide.src,'full'),previewSrc:await upload(slide.previewSrc,'small')};
}
export async function savePortfolio(data){
  data=normalise(data);
  if(!cloudEnabled){const db=await openDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('content','readwrite');tx.objectStore('content').put(data,'portfolio');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();return data;}
  const supabase=await getSupabase();const {data:auth}=await supabase.auth.getSession();if(!auth.session)throw new Error('Для облачного сохранения войдите в админку.');
  for(const project of data.projects){
    project.slides=await mapLimit(project.slides||[],3,(slide,index)=>uploadSlide(supabase,slide,project.id,index));
    project.sections=await mapLimit(project.sections||[],3,async(section,index)=>({...section,image:section.image?await uploadSlide(supabase,section.image,`${project.id}/story`,index):null}));
    if(project.previewImage)project.previewImage=await uploadSlide(supabase,project.previewImage,`${project.id}/preview`,0);
    if(project.blocks)project.blocks=await mapLimit(project.blocks,3,async(block,index)=>block.type==='image'?{...block,...await uploadSlide(supabase,block,`${project.id}/article`,index)}:block.type==='carousel'?{...block,slides:await mapLimit(block.slides||[],3,(slide,slideIndex)=>uploadSlide(supabase,slide,`${project.id}/carousel-${index}`,slideIndex))}:block);
  }
  const {error}=await supabase.from('portfolio_content').upsert({id:'main',payload:data,updated_at:new Date().toISOString()});if(error)throw error;return data;
}
export function displayProjectImageCount(project={}){const raw=project?.slideCountOverride;if(raw!==''&&raw!==null&&raw!==undefined&&Number.isFinite(Number(raw))&&Number(raw)>=0)return Math.floor(Number(raw));return countProjectImages(project);}
export function countProjectImages(project={}){
  const sources=new Set();let anonymous=0;
  const add=image=>{if(!image)return;if(typeof image==='string'){sources.add(image);return;}if(image.src)sources.add(image.src);else anonymous++;};
  (project.slides||[]).forEach(add);
  (project.blocks||[]).forEach(block=>{if(block.type==='image')add(block);else if(block.type==='carousel')(block.slides||[]).forEach(add);});
  (project.sections||[]).forEach(section=>add(section.image));
  return sources.size+anonymous;
}
export function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
