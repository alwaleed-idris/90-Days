/* Cloud sync through Supabase (same data on phone and laptop).
   The whole app state is one JSON row per user; the newest copy (by S._t) wins.
   SB_URL / SB_KEY are the project's URL and public "anon" key; sync stays off while they are empty. */
(function(){
const SB_URL='',SB_KEY='';
const AK='alwaleed-90-auth',ST='alwaleed-90-sync';
let A=null,last=0,pushT=null,busy=false,err='';
try{A=JSON.parse(localStorage.getItem(AK))}catch(e){}
try{last=+localStorage.getItem(ST)||0}catch(e){}
const on=()=>!!(SB_URL&&SB_KEY),signed=()=>!!(A&&A.refresh_token);
const keepA=()=>{try{A?localStorage.setItem(AK,JSON.stringify(A)):localStorage.removeItem(AK)}catch(e){}};
const msg=j=>j&&(j.msg||j.error_description||j.message||j.error)||'تعذّر الاتصال';
const AR={'Invalid login credentials':'البريد أو كلمة المرور غير صحيحة','Email not confirmed':'أكّد بريدك من الرسالة التي وصلتك أولًا','User already registered':'هذا البريد مسجّل، سجّل الدخول بدلًا من ذلك'};
const ar=m=>AR[m]||m;

async function auth(path,body){
 const r=await fetch(SB_URL+'/auth/v1/'+path,{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(ar(msg(j)));return j}
const setSession=j=>{A={access_token:j.access_token,refresh_token:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1e3,uid:j.user&&j.user.id,email:j.user&&j.user.email};keepA()};
async function token(){
 if(!signed())throw new Error('سجّل الدخول أولًا');
 if(Date.now()>A.exp-6e4){try{setSession(await auth('token?grant_type=refresh_token',{refresh_token:A.refresh_token}))}catch(e){A=null;keepA();throw new Error('انتهت الجلسة، سجّل الدخول من جديد')}}
 return A.access_token}
async function rest(method,q,body){
 const r=await fetch(SB_URL+'/rest/v1/app_state'+q,{method,headers:{apikey:SB_KEY,Authorization:'Bearer '+await token(),'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:body&&JSON.stringify(body)});
 if(!r.ok)throw new Error(msg(await r.json().catch(()=>({}))));return method=='GET'?r.json():null}

function stamp(){last=Date.now();try{localStorage.setItem(ST,last)}catch(e){};err=''}
function rerender(){try{fill();paint();applyTheme();if(page==2)structR();if(page==3)tasksR();if(page==5)setR();tbar()}catch(e){}}

const strip=o=>JSON.stringify(Object.assign({},o,{_t:0}));
const hasData=o=>!!(Object.keys(o.tasks||{}).length||(o.inc||[]).length||(o.log||[]).length||(o.ideas||[]).length);
async function pull(){
 const rows=await rest('GET','?select=data');const d=rows[0]&&rows[0].data;
 // first sync on this device: when both copies hold real data and differ, the person picks which one to keep
 let take=d&&(d._t||0)>(S._t||0);
 if(d&&!last&&strip(d)!=strip(S)){take=!hasData(S)||hasData(d)&&confirm('في حسابك بيانات محفوظة تختلف عن بيانات هذا الجهاز.\n\nموافق: استخدم بيانات الحساب\nإلغاء: ارفع بيانات هذا الجهاز واستبدل بها بيانات الحساب');if(!take)S._t=Date.now()}
 if(take){S=load(d);try{localStorage.setItem(K,JSON.stringify(S))}catch(e){};rerender();window.onTimer&&onTimer();return 'pulled'}
 return d?'same':'empty'}
async function push(){await rest('POST','?on_conflict=user_id',{user_id:A.uid,data:S,updated_at:new Date().toISOString()})}

async function sync(){
 if(!on()||!signed()||busy||!navigator.onLine)return;busy=true;
 try{const r=await pull();if(r!='pulled'&&(r=='empty'||(S._t||0)>last))await push();stamp()}
 catch(e){err=e.message}finally{busy=false;if(page==5)setR()}}

// called by save() in index.html
window.onSave=function(){S._t=Date.now();if(!on()||!signed())return;clearTimeout(pushT);pushT=setTimeout(async()=>{if(busy)return;busy=true;try{await push();stamp()}catch(e){err=e.message}finally{busy=false}},2000)};

window.SYNC={
 rows(){
  const RW=(t,sm,c)=>`<div class="rw"><div class="lb"><b>${t}</b>${sm?`<small>${sm}</small>`:''}</div>${c||''}</div>`;
  let b;
  if(!on())b=RW('غير مفعّلة بعد','تحتاج ربط التطبيق بحساب Supabase');
  else if(!signed())b=`<div class="rw col"><div class="lb"><b>تسجيل الدخول</b><small>استخدم البريد وكلمة المرور نفسيهما على الهاتف واللابتوب</small></div><input id="sbE" type="email" dir="ltr" style="text-align:right" placeholder="البريد الإلكتروني" autocomplete="email"><input id="sbP" type="password" dir="ltr" style="text-align:right" placeholder="كلمة المرور (6 أحرف على الأقل)" autocomplete="current-password"><div class="row"><button class="btn" onclick="SYNC.signIn()">دخول</button><button class="btn g" onclick="SYNC.signUp()">حساب جديد</button></div></div>`;
  else b=RW('الحساب',esc(A.email||''))+RW('آخر مزامنة',err?'خطأ: '+esc(err):last?new Date(last).toLocaleString(LOC,{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}):'لم تتم بعد',`<button class="btn g" onclick="SYNC.now()">مزامنة الآن</button>`)+RW('تسجيل الخروج','تبقى بياناتك على هذا الجهاز',`<button class="btn r" onclick="SYNC.signOut()">خروج</button>`);
  return `<div class="gh">المزامنة بين الأجهزة</div><div class="grp">${b}</div><div class="ft">تُحفظ بياناتك في حسابك وتتزامن تلقائيًا بين الهاتف واللابتوب. عند الاختلاف تُعتمد آخر نسخة عُدّلت.</div>`},
 async signIn(){const e=$('sbE').value.trim(),p=$('sbP').value;if(!e||!p)return toast('أدخل البريد وكلمة المرور');
  try{setSession(await auth('token?grant_type=password',{email:e,password:p}));toast('تم تسجيل الدخول');await sync()}catch(x){toast(x.message)}setR()},
 async signUp(){const e=$('sbE').value.trim(),p=$('sbP').value;if(!e||p.length<6)return toast('أدخل البريد وكلمة مرور من 6 أحرف على الأقل');
  try{const j=await auth('signup',{email:e,password:p});if(j.access_token){setSession(j);toast('تم إنشاء الحساب');await sync()}else toast('أرسلنا رسالة تأكيد إلى بريدك، أكّدها ثم سجّل الدخول')}catch(x){toast(x.message)}setR()},
 async now(){await sync();toast(err?'تعذّرت المزامنة: '+err:'تمت المزامنة')},
 signOut(){if(!confirm('تسجيل الخروج؟ تبقى بياناتك على هذا الجهاز.'))return;A=null;keepA();last=0;try{localStorage.removeItem(ST)}catch(e){}setR()}
};

if(on()){sync();setInterval(sync,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});addEventListener('online',sync)}
})();
