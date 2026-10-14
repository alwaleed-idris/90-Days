/* Cloud sync between the phone app and the web version, through api/sync.mjs on Vercel.
   The person picks one sync passphrase and enters it on every device; its SHA-256 hash names
   their cloud copy. The whole app state is one JSON document; the newest copy (by S._t) wins.
   API is the web version's address, used by the Android app (the web version calls itself). */
(function(){
const API='https://90-d-sigma.vercel.app';
const KK='alwaleed-90-synckey',ST='alwaleed-90-sync';
let key='',last=0,pushT=null,busy=false,err='';
try{key=localStorage.getItem(KK)||''}catch(e){}
try{last=+localStorage.getItem(ST)||0}catch(e){}
const base=()=>/^https?:$/.test(location.protocol)&&!window.NATIVE?'':API;
const signed=()=>!!key;
const url=()=>base()+'/api/sync?k='+key;
const ERR={503:'التخزين السحابي غير موصول بعد',413:'البيانات أكبر من المسموح'};

async function hash(p){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('90-days-sync:'+p));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function call(method,body){
 let r;try{r=await fetch(url(),{method,headers:{'Content-Type':'application/json'},body:body&&JSON.stringify(body),cache:'no-store'})}catch(e){throw new Error('لا يوجد اتصال بالخادم')}
 if(!r.ok)throw new Error(ERR[r.status]||'تعذّر الاتصال ('+r.status+')');return r.json()}

function stamp(){last=Date.now();try{localStorage.setItem(ST,last)}catch(e){};err=''}
function rerender(){try{fill();paint();applyTheme();if(page==2)structR();if(page==3)tasksR();if(page==5)setR();tbar()}catch(e){}}

const strip=o=>JSON.stringify(Object.assign({},o,{_t:0}));
const hasData=o=>!!(Object.keys(o.tasks||{}).length||(o.inc||[]).length||(o.log||[]).length||(o.ideas||[]).length);
async function pull(){
 const d=(await call('GET')).data;
 // first sync on this device: when both copies hold real data and differ, the person picks which one to keep
 let take=d&&(d._t||0)>(S._t||0);
 if(d&&!last&&strip(d)!=strip(S)){take=!hasData(S)||hasData(d)&&confirm('في السحابة بيانات محفوظة تختلف عن بيانات هذا الجهاز.\n\nموافق: استخدم بيانات السحابة\nإلغاء: ارفع بيانات هذا الجهاز واستبدل بها بيانات السحابة');if(!take)S._t=Date.now()}
 if(take){S=load(d);try{localStorage.setItem(K,JSON.stringify(S))}catch(e){};rerender();window.onTimer&&onTimer();return 'pulled'}
 return d?'same':'empty'}
const push=()=>call('PUT',{data:S});

async function sync(){
 if(!signed()||busy||!navigator.onLine)return;busy=true;
 try{const r=await pull();if(r!='pulled'&&(r=='empty'||(S._t||0)>last))await push();stamp()}
 catch(e){err=e.message}finally{busy=false;if(page==5)setR()}}

// called by save() in index.html
window.onSave=function(){S._t=Date.now();if(!signed())return;clearTimeout(pushT);pushT=setTimeout(async()=>{if(busy)return;busy=true;try{await push();stamp()}catch(e){err=e.message}finally{busy=false}},2000)};

window.SYNC={
 rows(){
  const RW=(t,sm,c)=>`<div class="rw"><div class="lb"><b>${t}</b>${sm?`<small>${sm}</small>`:''}</div>${c||''}</div>`;
  const b=!signed()
   ?`<div class="rw col"><div class="lb"><b>تفعيل المزامنة</b><small>اختر كلمة سر للمزامنة وأدخلها نفسها على الهاتف واللابتوب</small></div><input id="syK" type="password" dir="ltr" style="text-align:right" placeholder="كلمة سر المزامنة (8 أحرف على الأقل)" autocomplete="new-password"><div class="row"><button class="btn" onclick="SYNC.start()">تفعيل</button></div></div>`
   :RW('آخر مزامنة',err?'خطأ: '+esc(err):last?new Date(last).toLocaleString(LOC,{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}):'لم تتم بعد',`<button class="btn g" onclick="SYNC.now()">مزامنة الآن</button>`)+RW('إيقاف المزامنة','تبقى بياناتك على هذا الجهاز وفي السحابة',`<button class="btn r" onclick="SYNC.stop()">إيقاف</button>`);
  return `<div class="gh">المزامنة بين الأجهزة</div><div class="grp">${b}</div><div class="ft">تُحفظ نسخة من بياناتك في السحابة وتتزامن تلقائيًا بين الهاتف واللابتوب. عند الاختلاف تُعتمد آخر نسخة عُدّلت. احفظ كلمة السر جيدًا، فمن يعرفها يصل إلى بياناتك.</div>`},
 async start(){const p=$('syK').value;if(p.length<8)return toast('كلمة السر 8 أحرف على الأقل');
  key=await hash(p);last=0;await sync();
  if(err&&!last){toast('تعذّرت المزامنة: '+err);key='';err=''}else{try{localStorage.setItem(KK,key)}catch(e){}toast('تم تفعيل المزامنة')}
  setR()},
 async now(){await sync();toast(err?'تعذّرت المزامنة: '+err:'تمت المزامنة')},
 stop(){if(!confirm('إيقاف المزامنة على هذا الجهاز؟'))return;key='';last=0;try{localStorage.removeItem(KK);localStorage.removeItem(ST)}catch(e){}setR()}
};

if(signed())sync();
setInterval(()=>{if(!document.hidden)sync()},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});addEventListener('online',sync);
})();
