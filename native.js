/* Android (Capacitor) layer. Does nothing on the web version.
   - Schedules prayer, block and task alerts as real Android notifications so they fire while the app is closed.
   - Exports the backup through the Android share sheet (blob downloads don't work inside the app). */
(function(){
if(!window.NATIVE)return;
const s=document.createElement('script');s.src='capacitor.js';s.onload=init;document.head.appendChild(s);

function init(){
 const {registerPlugin}=window.capacitorExports,LN=registerPlugin('LocalNotifications'),FS=registerPlugin('Filesystem'),SH=registerPlugin('Share');
 const CH='a90',DAYS=7;let sig='',busy=false;

 const refreshPerm=()=>LN.checkPermissions().then(r=>{window.NPS={granted:'granted',denied:'denied'}[r.display]||'default';if(page==5)setR()}).catch(()=>{});

 window.perm=function(){LN.requestPermissions().then(r=>{toast('الإشعارات: '+(r.display=='granted'?'مفعّلة':'محظورة من إعدادات الهاتف'));refreshPerm();sched(1)}).catch(()=>toast('تعذّر طلب الإذن'))};
 // Android shows the scheduled notification itself; keep the in-app popup and sound only.
 window.sysN=function(){};

 window.exp=async function(){try{
  const r=await FS.writeFile({path:'alwaleed-90-backup.json',data:JSON.stringify(S),directory:'CACHE',encoding:'utf8'});
  await SH.share({title:'نسخة احتياطية · 90 Day Game',files:[r.uri]});
 }catch(e){if(!/cancel/i.test(e&&e.message||''))toast('تعذّر التصدير')}};

 // Same events and wording as notify() in index.html, but for the next DAYS days.
 function events(){
  const out=[],now=Date.now(),ld=num(S.lead);
  for(let i=0;i<DAYS;i++){
   const d=new Date();d.setDate(d.getDate()+i);const k=iso(d);
   const at=m=>{const x=new Date(d);x.setHours(0,m,0,0);return x.getTime()};
   if(S.nt.prayer)P.forEach(p=>out.push([at(tm(S.pt[p[0]])),'حان وقت صلاة '+p[1],'الوقت محجوز للصلاة']));
   if(S.nt.task)(S.tasks[k]||[]).forEach(t=>{if(!t.done&&t.s)out.push([at(tm(t.s))-ld*6e4,t.t,(ld?`تبدأ بعد ${ld} دقائق`:'تبدأ الآن')+` · ${t.s} – ${t.e}`+(t.goal?'':' · تنبيه: لا تخدم هدفك')])});
   if(S.nt.block)S.blocks.forEach(b=>out.push([at(tm(b.s)),'بدأت فترة: '+b.n,`${b.s} – ${b.e}`]));
  }
  return out.filter(e=>e[0]>now+5e3).sort((a,b)=>a[0]-b[0]).slice(0,400);
 }

 async function sched(force){
  if(busy)return;const ev=events(),g=JSON.stringify(ev);if(!force&&g==sig)return;
  busy=true;try{
   const pend=await LN.getPending();
   if(pend.notifications.length)await LN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
   if(ev.length)await LN.schedule({notifications:ev.map((e,i)=>({id:i+1,title:e[1],body:e[2],channelId:CH,smallIcon:'ic_stat_notify',schedule:{at:new Date(e[0]),allowWhileIdle:true}}))});
   sig=g;
  }catch(e){console.warn('schedule failed',e)}finally{busy=false}
 }

 LN.createChannel({id:CH,name:'تنبيهات 90 يوم',description:'الصلاة والمهام وفترات اليوم',importance:5,visibility:1,vibration:true}).catch(()=>{})
  .then(()=>LN.checkPermissions()).then(r=>r.display=='granted'?r:LN.requestPermissions()).catch(()=>{})
  .then(()=>{refreshPerm();sched(1)});
 setInterval(sched,30000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)sched();else{refreshPerm();sched(1)}});
}
})();
