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
function clone(value){return JSON.parse(JSON.stringify(value));}
function normalise(data){
  const next=clone(data||DEFAULT_DATA);
  next.types=Array.isArray(next.types)&&next.types.length?next.types:clone(DEFAULT_DATA.types);
  next.categories=Array.isArray(next.categories)&&next.categories.length?next.categories:clone(DEFAULT_DATA.categories);
  next.projects=Array.isArray(next.projects)?next.projects:[];
  return next;
}
function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('content');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function getPortfolio(){
  try{
    const db=await openDatabase();
    const saved=await new Promise((resolve,reject)=>{
      const request=db.transaction('content','readonly').objectStore('content').get('portfolio');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    db.close();return normalise(saved||DEFAULT_DATA);
  }catch{return normalise(DEFAULT_DATA);}
}
export async function savePortfolio(data){
  data=normalise(data);
  const db=await openDatabase();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('content','readwrite');tx.objectStore('content').put(data,'portfolio');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  db.close();
}
export function escapeHTML(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
