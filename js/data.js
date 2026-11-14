import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SUPABASE_BUCKET} from './supabase-config.js';

export const DEFAULT_DATA = {
  types:[{id:'products',name:'Карточки товаров'},{id:'banners',name:'Экспресс-баннеры'}],
  categories:[{id:'animals',typeId:'products',name:'Товары для животных'},{id:'tech',typeId:'products',name:'Техника'},{id:'other',typeId:'products',name:'Другое'}],
  projects: [{
    id: 'meatbone', type: 'products', category: 'animals', title: 'Мясное печенье для собак',
    description: 'Визуальная упаковка продукта для маркетплейсов. Акцент на аппетитной подаче, понятной выгоде и характере бренда.',
    date: '1 октября 2026', duration: 'за 2 дня',
    slides: [1,2,3,4,5].map((n) => ({src:`assets/meatbone/slide-${String(n).padStart(2,'0')}.webp`,alt:`Мясное печенье для собак — слайд ${n}`}))
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
function normalise(data){const next=clone(data||DEFAULT_DATA);next.types=Array.isArray(next.types)&&next.types.length?next.types:clone(DEFAULT_DATA.types);next.categories=Array.isArray(next.categories)&&next.categories.length?next.categories:clone(DEFAULT_DATA.categories);next.projects=Array.isArray(next.projects)?next.projects:[];return next;}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>request.result.createObjectStore('content');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function getLocal(){try{const db=await openDatabase();const saved=await new Promise((resolve,reject)=>{const request=db.transaction('content','readonly').objectStore('content').get('portfolio');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();return normalise(saved||DEFAULT_DATA);}catch{return normalise(DEFAULT_DATA);}}
export async function getPortfolio(){
  if(!cloudEnabled)return getLocal();
  const supabase=await getSupabase();const {data,error}=await supabase.from('portfolio_content').select('payload').eq('id','main').maybeSingle();
  if(error)throw error;return normalise(data?.payload||await getLocal());
}
async function uploadSlide(supabase,slide,projectId,index){
  if(!slide.src?.startsWith('data:'))return slide;
  const response=await fetch(slide.src);const blob=await response.blob();const ext=blob.type==='image/png'?'png':'webp';const path=`${projectId}/${Date.now()}-${index}.${ext}`;
  const {error}=await supabase.storage.from(SUPABASE_BUCKET).upload(path,blob,{contentType:blob.type,upsert:true});if(error)throw error;
  const {data}=supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);return{...slide,src:data.publicUrl};
}
export async function savePortfolio(data){
  data=normalise(data);
  if(!cloudEnabled){const db=await openDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('content','readwrite');tx.objectStore('content').put(data,'portfolio');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();return data;}
  const supabase=await getSupabase();const {data:auth}=await supabase.auth.getSession();if(!auth.session)throw new Error('Для облачного сохранения войдите в админку.');
  for(const project of data.projects){
    project.slides=await Promise.all((project.slides||[]).map((slide,index)=>uploadSlide(supabase,slide,project.id,index)));
    project.sections=await Promise.all((project.sections||[]).map(async(section,index)=>({...section,image:section.image?await uploadSlide(supabase,section.image,`${project.id}/story`,index):null})));
    if(project.previewImage)project.previewImage=await uploadSlide(supabase,project.previewImage,`${project.id}/preview`,0);
    if(project.blocks)project.blocks=await Promise.all(project.blocks.map(async(block,index)=>block.type==='image'?{...block,...await uploadSlide(supabase,block,`${project.id}/article`,index)}:block.type==='carousel'?{...block,slides:await Promise.all((block.slides||[]).map((slide,slideIndex)=>uploadSlide(supabase,slide,`${project.id}/carousel-${index}`,slideIndex)))}:block));
  }
  const {error}=await supabase.from('portfolio_content').upsert({id:'main',payload:data,updated_at:new Date().toISOString()});if(error)throw error;return data;
}
export function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
