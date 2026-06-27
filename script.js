/* ═══════════════ DATA ═══════════════ */
const SECTIONS=[
  {id:"arith",name:"Arithmetic",weightage:"40%",questions:"8–10 Qs",hex:"#a78bfa",bg:"rgba(167,139,250,0.1)",
   topics:["Percentages","Ratio and Proportion","Averages and Mixtures","Profit, Loss, and Discount","Simple and Compound Interest","Time, Speed, and Distance","Time and Work","Pipes and Cisterns","Boats and Streams","Partnerships"]},
  {id:"alg",name:"Algebra",weightage:"30%",questions:"5–7 Qs",hex:"#34d399",bg:"rgba(52,211,153,0.1)",
   topics:["Linear Equations","Quadratic Equations","Inequalities","Functions","Logarithms","Progressions (AP, GP, HP)","Sequences and Series","Maxima and Minima","Polynomials"]},
  {id:"geo",name:"Geometry",weightage:"15%",questions:"1–3 Qs",hex:"#fb923c",bg:"rgba(251,146,60,0.1)",
   topics:["Lines and Angles","Triangles","Circles","Quadrilaterals","Polygons","Mensuration (2D and 3D)","Coordinate Geometry","Trigonometry","Similarity of Triangles","Properties of Circles"]},
  {id:"num",name:"Numbers",weightage:"5–7%",questions:"1–2 Qs",hex:"#fbbf24",bg:"rgba(251,191,36,0.1)",
   topics:["Natural, Whole & Integer Numbers","Rational and Irrational Numbers","Real Numbers","Divisibility and Remainders","Factors and Multiples","HCF and LCM","Prime and Composite Numbers","Cyclicity and Factorials","Base System","Indices and Surds"]},
  {id:"mod",name:"Modern Math",weightage:"5–7%",questions:"2–4 Qs",hex:"#f472b6",bg:"rgba(244,114,182,0.1)",
   topics:["Permutations and Combinations","Probability","Set Theory","Venn Diagrams","Binomial Theorem","Functions and Graphs"]}
];

const DAILY_TASKS=[
  {id:"q",label:"Quant Questions",total:20,color:"#a78bfa",items:Array.from({length:20},(_,i)=>`Q${i+1}`)},
  {id:"rc",label:"RC Sets",total:5,color:"#38bdf8",items:["RC Set 1","RC Set 2","RC Set 3","RC Set 4","RC Set 5"]},
  {id:"dilr",label:"DILR Sets",total:5,color:"#fb923c",items:["DILR Set 1","DILR Set 2","DILR Set 3","DILR Set 4","DILR Set 5"]}
];

const TAG_COLORS={
  Philosophy:{c:"#a78bfa",bg:"rgba(167,139,250,0.12)"},
  Science:{c:"#38bdf8",bg:"rgba(56,189,248,0.12)"},
  Psychology:{c:"#f472b6",bg:"rgba(244,114,182,0.12)"},
  Society:{c:"#fb923c",bg:"rgba(251,146,60,0.12)"},
  History:{c:"#fbbf24",bg:"rgba(251,191,36,0.12)"},
  Technology:{c:"#34d399",bg:"rgba(52,211,153,0.12)"},
  Arts:{c:"#e879f9",bg:"rgba(232,121,249,0.12)"},
  Other:{c:"#94a3b8",bg:"rgba(148,163,184,0.12)"}
};

const TOTAL=SECTIONS.reduce((a,s)=>a+s.topics.length,0);
let qState={},activeId="arith";
let dailyData={};   // { "YYYY-MM-DD": { q:[bool*20], rc:[bool*5], dilr:[bool*5] } }
let readingData=[];  // [{id,date,title,url,tag,notes}]
let mockData={};    // { "1": {date,varc_c,varc_w,dilr_c,dilr_w,qa_c,qa_w,notes} ... }
let calYear,calMonth,selDate;
let currentPage="quant";
let activeMockNum=null;
let mockFilter="all";

SECTIONS.forEach(s=>s.topics.forEach((_,i)=>qState[s.id+"_"+i]=false));

/* ── Storage ──
   Plain localStorage (this is a regular browser file, not a Claude
   artifact, so window.storage isn't available here). To protect against
   accidental clearing of browser data, this also:
   1) keeps a rolling backup copy under a second key, and
   2) lets you export everything to a JSON file you can keep safe, and
      re-import later via the Backup menu in the sidebar.
*/
const LS_KEYS={q:"cat_q_v4",daily:"cat_daily_v4",read:"cat_read_v4",mocks:"cat_mocks_v4"};
const LS_BACKUP_KEY="cat_backup_v4";
let _saveTimer=null;
let _saveStatusEl=null;
function _setSaveStatus(text,isError){
  if(!_saveStatusEl)_saveStatusEl=document.getElementById("save-status");
  if(!_saveStatusEl)return;
  _saveStatusEl.textContent=text;
  _saveStatusEl.style.color=isError?"#fb923c":"var(--muted)";
}
function saveAll(){
  if(_saveTimer)clearTimeout(_saveTimer);
  _setSaveStatus("Saving…",false);
  _saveTimer=setTimeout(_doSaveAll,300);
}
function _doSaveAll(){
  try{
    localStorage.setItem(LS_KEYS.q,JSON.stringify(qState));
    localStorage.setItem(LS_KEYS.daily,JSON.stringify(dailyData));
    localStorage.setItem(LS_KEYS.read,JSON.stringify(readingData));
    localStorage.setItem(LS_KEYS.mocks,JSON.stringify(mockData));
    // rolling backup blob, separate key, so one corrupted key doesn't lose everything
    localStorage.setItem(LS_BACKUP_KEY,JSON.stringify({
      q:qState,daily:dailyData,read:readingData,mocks:mockData,savedAt:new Date().toISOString()
    }));
    _setSaveStatus("Saved ✓",false);
    _cloudPush();
  }catch(e){
    console.error("saveAll failed",e);
    _setSaveStatus("Save failed",true);
  }
}
function loadAll(){
  try{
    const q=localStorage.getItem(LS_KEYS.q);
    const d=localStorage.getItem(LS_KEYS.daily);
    const r=localStorage.getItem(LS_KEYS.read);
    const m=localStorage.getItem(LS_KEYS.mocks);
    if(q){const p=JSON.parse(q);Object.keys(p).forEach(k=>{if(k in qState)qState[k]=p[k];});}
    if(d)dailyData=JSON.parse(d);
    if(r)readingData=JSON.parse(r);
    if(m)mockData=JSON.parse(m);
    // if the main keys are missing/empty but a backup blob exists, restore from it
    if(!q&&!d&&!r){
      const b=localStorage.getItem(LS_BACKUP_KEY);
      if(b){
        const p=JSON.parse(b);
        if(p.q)Object.keys(p.q).forEach(k=>{if(k in qState)qState[k]=p.q[k];});
        if(p.daily)dailyData=p.daily;
        if(p.read)readingData=p.read;
        if(p.mocks)mockData=p.mocks;
        _setSaveStatus("Restored from backup",false);
        return;
      }
    }
  }catch(e){
    console.error("loadAll failed",e);
  }
}

/* ── Cloud sync (Firebase, Google Sign-In) ──
   Mirrors the same data into a private cloud document keyed by the
   signed-in user's UID, so the same Google account on a different
   device (or a cleared cache on this one) doesn't lose anything.

   Sign-in itself happens on login.html (see login.js); the guard in
   auth.js makes sure this page is only reached once a user exists.
   The listener below just picks up that user's uid and wires it into
   the existing _cloudPush()/_cloudPullIfNeeded() functions — nothing
   else about cloud sync changed. Reads/writes are restricted to that
   uid's own document by the Firestore rules, not by this code.
*/
let _cloudReady=false;
let _uid=null;

function _cloudInit(){
  if(typeof auth==="undefined"){
    console.warn("Firebase not configured — cloud sync disabled. Fill in firebase-config.js.");
    return;
  }
  auth.onAuthStateChanged(async user=>{
    if(!user){
      // Defense in depth: auth.js already guards this page, but if it's
      // ever reached while signed out, send back to login instead of
      // silently running with no cloud sync.
      window.location.replace("login.html");
      return;
    }
    _uid=user.uid;
    _cloudReady=true;
    await _cloudPullIfNeeded();
  });
}

async function _cloudPullIfNeeded(){
  // Always pull from Firestore on login — Firestore is the source of truth.
  // The old "looksEmpty" guard was preventing cross-device sync: once mobile
  // had any localStorage data it would never fetch updates made on PC.
  try{
    const doc=await db.collection("trackers").doc(_uid).get();
    if(doc.exists){
      const p=doc.data();
      if(p.q)Object.keys(p.q).forEach(k=>{if(k in qState)qState[k]=p.q[k];});
      if(p.daily)dailyData=p.daily;
      if(p.read)readingData=p.read;
      if(p.mocks)mockData=p.mocks;
      // Write to localStorage only — skip _cloudPush to avoid a redundant write
      localStorage.setItem(LS_KEYS.q,JSON.stringify(qState));
      localStorage.setItem(LS_KEYS.daily,JSON.stringify(dailyData));
      localStorage.setItem(LS_KEYS.read,JSON.stringify(readingData));
      localStorage.setItem(LS_KEYS.mock,JSON.stringify(mockData));
      renderNav();updatePanel();updateGlobal();
      if(currentPage==="daily")renderCalendar();
      if(currentPage==="reading")renderReadingLog();
      if(currentPage==="mocks")renderMockList();
      _setSaveStatus("Synced ✓",false);
    }
  }catch(e){
    console.error("cloud pull failed",e);
    _setSaveStatus("Sync failed — check connection",true);
  }
}

async function _cloudPush(){
  if(!_cloudReady||!_uid)return;
  try{
    await db.collection("trackers").doc(_uid).set({
      q:qState,daily:dailyData,read:readingData,mocks:mockData,savedAt:new Date().toISOString()
    });
  }catch(e){
    console.error("cloud push failed",e);
  }
}

/* ── Export / Import (file backup) ── */
function exportBackup(){
  const payload={q:qState,daily:dailyData,read:readingData,mocks:mockData,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  const stamp=new Date().toISOString().slice(0,10);
  a.href=url;
  a.download=`cat-tracker-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  _setSaveStatus("Backup downloaded ✓",false);
}
function importBackupFile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const p=JSON.parse(e.target.result);
      if(p.q)Object.keys(p.q).forEach(k=>{if(k in qState)qState[k]=p.q[k];});
      if(p.daily)dailyData=p.daily;
      if(p.read)readingData=p.read;
      if(p.mocks)mockData=p.mocks;
      saveAll();
      renderNav();updatePanel();updateGlobal();
      if(currentPage==="daily")renderCalendar();
      if(currentPage==="reading")renderReadingLog();
      if(currentPage==="mocks")renderMockList();
      _setSaveStatus("Backup imported ✓",false);
      alert("Backup imported successfully.");
    }catch(err){
      console.error("import failed",err);
      alert("Couldn't read that file — make sure it's a backup JSON exported from this tracker.");
    }
  };
  reader.readAsText(file);
}
/* ── Page nav ── */
function setPage(p){
  currentPage=p;
  document.querySelectorAll(".page").forEach(el=>el.classList.remove("active"));
  document.getElementById("page-"+p).classList.add("active");
  document.querySelectorAll(".main-nav-btn").forEach(el=>el.classList.remove("active"));
  document.getElementById("mnav-"+p).classList.add("active");
  document.getElementById("sec-nav").style.display=p==="quant"?"block":"none";
  if(p==="daily") renderCalendar();
  if(p==="reading") renderReadingLog();
  if(p==="mocks") renderMockList();
}

/* ══════════════════════════════════
   QUANT
══════════════════════════════════ */
const checkSvg=`<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.8L3.8 7L9 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function countDone(sec){return sec.topics.filter((_,i)=>qState[sec.id+"_"+i]).length;}

function updateGlobal(){
  const done=SECTIONS.reduce((a,s)=>a+countDone(s),0);
  const pct=Math.round(done/TOTAL*100);
  document.getElementById("ring-prog").style.strokeDashoffset=163-(163*pct/100);
  document.getElementById("ring-pct").textContent=pct+"%";
  document.getElementById("stat-done").textContent=done;
  document.getElementById("stat-left").textContent=TOTAL-done;
}

function updateNavTab(sec){
  const done=countDone(sec),pct=Math.round(done/sec.topics.length*100);
  const el=document.getElementById("nav_"+sec.id); if(!el)return;
  el.querySelector(".nav-pct").textContent=pct+"%";
  el.querySelector(".nav-bar").style.width=pct+"%";
  el.querySelector(".nav-sub").textContent=done+"/"+sec.topics.length+" done";
}

function updatePanel(){
  const sec=SECTIONS.find(s=>s.id===activeId);
  const done=countDone(sec),pct=Math.round(done/sec.topics.length*100);
  document.getElementById("panel-dot").style.cssText=`background:${sec.hex};box-shadow:0 0 7px ${sec.hex}50;`;
  document.getElementById("panel-title").textContent=sec.name;
  document.getElementById("sec-prog-fill").style.cssText=`width:${pct}%;background:${sec.hex};`;
  document.getElementById("sec-prog-label").textContent=done+" / "+sec.topics.length;
  document.getElementById("sec-prog-pct").style.color=sec.hex;
  document.getElementById("sec-prog-pct").textContent=pct+"%";
  document.getElementById("mark-all-btn").textContent=done===sec.topics.length?"Deselect all":"Mark all done";
  document.getElementById("panel-pills").innerHTML=`
    <span class="pill" style="background:${sec.bg};color:${sec.hex};border-color:${sec.hex}44;">${sec.weightage} weightage</span>
    <span class="pill" style="background:var(--surface2);color:var(--muted);border-color:var(--border2);">${sec.questions}</span>`;
  renderTopics(sec);
}

function renderTopics(sec){
  document.getElementById("topics-grid").innerHTML=sec.topics.map((t,i)=>{
    const ok=qState[sec.id+"_"+i];
    return `<div class="topic${ok?" checked":""}" id="t_${sec.id}_${i}" onclick="toggle('${sec.id}',${i})">
      <div class="custom-cb" style="${ok?`background:${sec.hex};`:""}">${checkSvg}</div>
      <span class="topic-name">${t}</span></div>`;
  }).join("");
}

function toggle(secId,idx){
  qState[secId+"_"+idx]=!qState[secId+"_"+idx];
  const item=document.getElementById("t_"+secId+"_"+idx);
  const sec=SECTIONS.find(s=>s.id===secId);
  if(item){item.classList.toggle("checked",qState[secId+"_"+idx]);item.querySelector(".custom-cb").style.background=qState[secId+"_"+idx]?sec.hex:"";}
  updateNavTab(sec);if(activeId===secId)updatePanel();updateGlobal();saveAll();
}

function selectAllActive(){
  const sec=SECTIONS.find(s=>s.id===activeId);
  const allDone=countDone(sec)===sec.topics.length;
  sec.topics.forEach((_,i)=>{qState[activeId+"_"+i]=!allDone;const item=document.getElementById("t_"+activeId+"_"+i);if(item){item.classList.toggle("checked",!allDone);item.querySelector(".custom-cb").style.background=!allDone?sec.hex:"";}});
  updateNavTab(sec);updatePanel();updateGlobal();saveAll();
}

function resetAll(){
  Object.keys(qState).forEach(k=>qState[k]=false);
  SECTIONS.forEach(s=>updateNavTab(s));updatePanel();updateGlobal();saveAll();
}

function setActive(id){
  activeId=id;
  document.querySelectorAll(".nav-tab").forEach(el=>el.classList.toggle("active",el.dataset.id===id));
  updatePanel();
}

function renderNav(){
  document.getElementById("sec-nav").innerHTML=SECTIONS.map(sec=>{
    const done=countDone(sec),pct=Math.round(done/sec.topics.length*100);
    return `<div class="nav-tab${sec.id===activeId?" active":""}" id="nav_${sec.id}" data-id="${sec.id}" onclick="setActive('${sec.id}')">
      <div class="nav-dot" style="background:${sec.hex}"></div>
      <div class="nav-info"><div class="nav-name">${sec.name}</div><div class="nav-sub">${done}/${sec.topics.length} done</div></div>
      <div class="nav-right">
        <span class="nav-pct" style="color:${sec.hex}">${pct}%</span>
        <div class="nav-bar-wrap"><div class="nav-bar" style="width:${pct}%;background:${sec.hex}"></div></div>
      </div></div>`;
  }).join("");
}

/* ══════════════════════════════════
   DAILY TASKS
══════════════════════════════════ */
function todayStr(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;}

function initDay(dk){
  if(!dailyData[dk])dailyData[dk]={q:Array(20).fill(false),rc:Array(5).fill(false),dilr:Array(5).fill(false)};
}

function dayDoneCount(dk){
  if(!dailyData[dk])return 0;
  return dailyData[dk].q.filter(Boolean).length+dailyData[dk].rc.filter(Boolean).length+dailyData[dk].dilr.filter(Boolean).length;
}
function dayTotal(){return 30;}
function isDayPerfect(dk){return dayDoneCount(dk)===30;}
function hasAnyTask(dk){return !!dailyData[dk]&&dayDoneCount(dk)>0;}

function calcStreak(){
  let streak=0,d=new Date();
  while(true){
    const dk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if(!hasAnyTask(dk))break;
    streak++;d.setDate(d.getDate()-1);
  }
  return streak;
}

function renderCalendar(){
  const now=new Date();
  if(calYear===undefined){calYear=now.getFullYear();calMonth=now.getMonth();}
  if(selDate===undefined)selDate=todayStr();

  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  document.getElementById("cal-month-label").textContent=MONTHS[calMonth]+" "+calYear;

  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const todayS=todayStr();

  let html="";
  for(let i=0;i<firstDay;i++)html+=`<div class="cal-cell empty"><span class="cal-num"></span></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const done=dayDoneCount(dk);
    const perfect=isDayPerfect(dk);
    const hasData=done>0;
    const isToday=dk===todayS;
    const isSel=dk===selDate;
    const dots=hasData?`<div class="dot-row">
      ${dailyData[dk]&&dailyData[dk].q.some(Boolean)?`<div class="dot" style="background:#a78bfa"></div>`:""}
      ${dailyData[dk]&&dailyData[dk].rc.some(Boolean)?`<div class="dot" style="background:#38bdf8"></div>`:""}
      ${dailyData[dk]&&dailyData[dk].dilr.some(Boolean)?`<div class="dot" style="background:#fb923c"></div>`:""}
    </div>`:"<div class='dot-row'></div>";
    html+=`<div class="cal-cell${isToday?" today":""}${isSel?" selected":""}${hasData?" has-data":""}${perfect?" full-day":""}" onclick="selectDay('${dk}')">
      <span class="cal-num">${d}</span>${dots}</div>`;
  }
  document.getElementById("cal-grid").innerHTML=html;

  // streak stats
  const streak=calcStreak();
  const perfectDays=Object.keys(dailyData).filter(k=>isDayPerfect(k)).length;
  const activeDays=Object.keys(dailyData).filter(k=>hasAnyTask(k)).length;
  document.getElementById("streak-count").textContent=streak;
  document.getElementById("perfect-days").textContent=perfectDays;
  document.getElementById("active-days").textContent=activeDays;

  renderDayPanel(selDate);
}

function changeMonth(dir){
  calMonth+=dir;
  if(calMonth<0){calMonth=11;calYear--;}
  if(calMonth>11){calMonth=0;calYear++;}
  renderCalendar();
}

function selectDay(dk){selDate=dk;renderCalendar();}

function renderDayPanel(dk){
  const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const d=new Date(dk+"T00:00:00");
  document.getElementById("day-date-title").textContent=d.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  document.getElementById("day-date-sub").textContent=DAYS[d.getDay()]+" · click tasks to mark done";
  initDay(dk);
  const data=dailyData[dk];

  let html="";
  const groups=[
    {key:"q",label:"Quant Questions",color:"#a78bfa",items:data.q.map((_,i)=>({label:`Question ${i+1}`,idx:i}))},
    {key:"rc",label:"Reading Comprehension",color:"#38bdf8",items:data.rc.map((_,i)=>({label:`RC Set ${i+1}`,idx:i}))},
    {key:"dilr",label:"Data Interpretation & LR",color:"#fb923c",items:data.dilr.map((_,i)=>({label:`DILR Set ${i+1}`,idx:i}))}
  ];

  groups.forEach(g=>{
    const doneCount=data[g.key].filter(Boolean).length;
    const allDone=doneCount===data[g.key].length;
    html+=`<div class="task-group">
      <div class="task-group-head" style="color:${g.color}">
        <span>${g.label} <span class="tg-count">${doneCount}/${data[g.key].length}</span></span>
        <button class="tg-mark-all-btn" onclick="markAllGroup('${dk}','${g.key}')" style="border-color:${g.color}44;color:${g.color}">${allDone?"Unmark all":"Mark all"}</button>
      </div>
      <div class="task-items">`;
    // for quant show 4-col mini layout
    if(g.key==="q"){
      html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">`;
      g.items.forEach(item=>{
        const done=data.q[item.idx];
        html+=`<div class="task-item${done?" done":""}" onclick="toggleTask('${dk}','${g.key}',${item.idx})" style="padding:7px 8px;justify-content:center">
          <div class="task-cb" style="${done?`background:#a78bfa;border-color:transparent`:""}">${done?checkSvg:""}</div>
          <span class="task-label" style="text-align:center;font-size:13px">Q${item.idx+1}</span></div>`;
      });
      html+=`</div>`;
    } else {
      g.items.forEach(item=>{
        const done=data[g.key][item.idx];
        html+=`<div class="task-item${done?" done":""}" onclick="toggleTask('${dk}','${g.key}',${item.idx})">
          <div class="task-cb" style="${done?`background:${g.color};border-color:transparent`:""}">${done?checkSvg:""}</div>
          <span class="task-label">${item.label}</span></div>`;
      });
    }
    html+=`</div></div>`;
  });
  document.getElementById("tasks-scroll").innerHTML=html;

  const done=dayDoneCount(dk),total=dayTotal();
  const pct=Math.round(done/total*100);
  document.getElementById("day-prog-txt").textContent=done+" / "+total;
  document.getElementById("day-prog-fill").style.width=pct+"%";
}

function toggleTask(dk,group,idx){
  initDay(dk);
  dailyData[dk][group][idx]=!dailyData[dk][group][idx];
  saveAll();renderCalendar();
}

function markAllGroup(dk,group){
  initDay(dk);
  const arr=dailyData[dk][group];
  const allDone=arr.every(Boolean);
  dailyData[dk][group]=arr.map(()=>!allDone);
  saveAll();renderCalendar();
}

/* ══════════════════════════════════
   READING LOG
══════════════════════════════════ */
function addReadingEntry(){
  const title=document.getElementById("re-title").value.trim();
  if(!title)return;
  const entry={
    id:Date.now(),
    date:todayStr(),
    title,
    url:document.getElementById("re-url").value.trim(),
    tag:document.getElementById("re-tag").value,
    notes:document.getElementById("re-notes").value.trim()
  };
  readingData.unshift(entry);
  document.getElementById("re-title").value="";
  document.getElementById("re-url").value="";
  document.getElementById("re-notes").value="";
  saveAll();renderReadingLog();
}

function deleteEntry(id){
  readingData=readingData.filter(e=>e.id!==id);
  saveAll();renderReadingLog();
}

function renderReadingLog(){
  // entries
  const list=document.getElementById("entries-list");
  if(!readingData.length){
    list.innerHTML=`<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">No readings logged yet.<br>Add your first Aeon article above.</div>`;
  } else {
    list.innerHTML=readingData.map(e=>{
      const tc=TAG_COLORS[e.tag]||TAG_COLORS.Other;
      const d=new Date(e.date+"T00:00:00");
      const dateStr=d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
      return `<div class="read-entry">
        <div class="re-top">
          <div class="re-title">${e.title}</div>
          <div class="re-meta">
            <span class="re-date">${dateStr}</span>
            <span class="re-tag" style="color:${tc.c};background:${tc.bg};border-color:${tc.c}44">${e.tag}</span>
            <button class="re-del" onclick="deleteEntry(${e.id})">✕</button>
          </div>
        </div>
        ${e.notes?`<div class="re-notes">${e.notes}</div>`:""}
        ${e.url?`<a class="re-link" href="${e.url}" target="_blank">🔗 Open on Aeon</a>`:""}
      </div>`;
    }).join("");
  }

  // stats
  document.getElementById("rs-total").textContent=readingData.length;
  const now=new Date();
  const thisMonth=readingData.filter(e=>{const d=new Date(e.date+"T00:00:00");return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  document.getElementById("rs-this-month").textContent=thisMonth;

  // reading streak
  let rStreak=0,rd=new Date();
  while(true){
    const dk=`${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,"0")}-${String(rd.getDate()).padStart(2,"0")}`;
    if(!readingData.some(e=>e.date===dk))break;
    rStreak++;rd.setDate(rd.getDate()-1);
  }
  document.getElementById("rs-streak").textContent=rStreak;

  // tag counts
  const tagCounts={};
  readingData.forEach(e=>tagCounts[e.tag]=(tagCounts[e.tag]||0)+1);
  document.getElementById("rs-tags").innerHTML=Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).map(([tag,cnt])=>{
    const tc=TAG_COLORS[tag]||TAG_COLORS.Other;
    return `<div class="tag-stat"><span class="tag-name" style="color:${tc.c}">${tag}</span><span class="tag-count">${cnt}</span></div>`;
  }).join("");

  // heatmap
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const firstDay=new Date(now.getFullYear(),now.getMonth(),1).getDay();
  let hm="";
  for(let i=0;i<firstDay;i++)hm+=`<div class="mh-cell"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const dk=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cnt=readingData.filter(e=>e.date===dk).length;
    const cls=cnt===0?"":cnt===1?"r1":cnt===2?"r2":"r3";
    hm+=`<div class="mh-cell ${cls}" title="${d}: ${cnt} readings"></div>`;
  }
  document.getElementById("mh-grid").innerHTML=hm;
}

/* ══════════════════════════════════
   MOCK LOG
══════════════════════════════════ */

// Percentile lookup tables — CAT 2026 actual data (Slot 1)
// VARC: 24 Qs | max raw ~72
const VARC_PCTL=[
  {min:51,pct:"99.9"},
  {min:44,pct:"99.5"},
  {min:40,pct:"99"},
  {min:34,pct:"98"},
  {min:30,pct:"95"},
  {min:23,pct:"90"},
  {min:19,pct:"85"},
  {min:17,pct:"80"},
  {min:0,pct:"<80"}
];
// DILR: 22 Qs | max raw ~66
const DILR_PCTL=[
  {min:46,pct:"99.9"},
  {min:39,pct:"99.5"},
  {min:34,pct:"99"},
  {min:31,pct:"98"},
  {min:26,pct:"95"},
  {min:19,pct:"90"},
  {min:15,pct:"85"},
  {min:13,pct:"80"},
  {min:0,pct:"<80"}
];
// QA: 22 Qs | max raw ~66
const QA_PCTL=[
  {min:48,pct:"99.9"},
  {min:40,pct:"99.5"},
  {min:33,pct:"99"},
  {min:30,pct:"98"},
  {min:25,pct:"95"},
  {min:18,pct:"90"},
  {min:16,pct:"85"},
  {min:14,pct:"80"},
  {min:0,pct:"<80"}
];
// Overall scaled /228 → percentile (CAT 2026 Slot 1)
const OVERALL_PCTL=[
  {min:122,pct:"99.9"},
  {min:103,pct:"99.5"},
  {min:90,pct:"99"},
  {min:81,pct:"98"},
  {min:70,pct:"95"},
  {min:53,pct:"90"},
  {min:45,pct:"85"},
  {min:40,pct:"80"},
  {min:0,pct:"<80"}
];

function lookupPctile(table,raw){
  if(raw===null||raw===undefined||isNaN(raw))return "—";
  for(const row of table){if(raw>=row.min)return row.pct;}
  return "<50";
}

function calcRaw(c,w){
  const cv=parseInt(c)||0, wv=parseInt(w)||0;
  return (cv*3)-(wv*1);
}

function rawToScaled300(varcRaw,dilrRaw,qaRaw){
  // CAT 2026: max raw = 72+66+66 = 204; overall percentile lookup uses total raw directly
  return varcRaw+dilrRaw+qaRaw;
}

function calcMockScores(){
  const vc=document.getElementById("mf-varc-c").value;
  const vw=document.getElementById("mf-varc-w").value;
  const dc=document.getElementById("mf-dilr-c").value;
  const dw=document.getElementById("mf-dilr-w").value;
  const qc=document.getElementById("mf-qa-c").value;
  const qw=document.getElementById("mf-qa-w").value;

  const vRaw=calcRaw(vc,vw);
  const dRaw=calcRaw(dc,dw);
  const qRaw=calcRaw(qc,qw);

  const hasV=vc||vw, hasD=dc||dw, hasQ=qc||qw;

  document.getElementById("mf-varc-raw").textContent=hasV?vRaw:"—";
  document.getElementById("mf-dilr-raw").textContent=hasD?dRaw:"—";
  document.getElementById("mf-qa-raw").textContent=hasQ?qRaw:"—";
  document.getElementById("mf-varc-pct").textContent=hasV?lookupPctile(VARC_PCTL,vRaw):"—";
  document.getElementById("mf-dilr-pct").textContent=hasD?lookupPctile(DILR_PCTL,dRaw):"—";
  document.getElementById("mf-qa-pct").textContent=hasQ?lookupPctile(QA_PCTL,qRaw):"—";

  if(hasV&&hasD&&hasQ){
    const totalRaw=vRaw+dRaw+qRaw;
    const scaled=rawToScaled300(vRaw,dRaw,qRaw);
    document.getElementById("mf-total-raw").textContent=totalRaw;
    document.getElementById("mf-total-scaled").textContent=scaled;
    document.getElementById("mf-total-pct").textContent=lookupPctile(OVERALL_PCTL,scaled);
  } else {
    document.getElementById("mf-total-raw").textContent="—";
    document.getElementById("mf-total-scaled").textContent="—";
    document.getElementById("mf-total-pct").textContent="—";
  }
}

function openMockForm(num){
  activeMockNum=num;
  document.getElementById("mock-detail-placeholder").style.display="none";
  const form=document.getElementById("mock-entry-form");
  form.style.display="flex";
  document.getElementById("mock-form-title").textContent=`Mock #${num}`;

  const existing=mockData[num];
  document.getElementById("mf-date").value=existing?existing.date:todayStr();
  document.getElementById("mf-varc-c").value=existing?existing.varc_c:"";
  document.getElementById("mf-varc-w").value=existing?existing.varc_w:"";
  document.getElementById("mf-dilr-c").value=existing?existing.dilr_c:"";
  document.getElementById("mf-dilr-w").value=existing?existing.dilr_w:"";
  document.getElementById("mf-qa-c").value=existing?existing.qa_c:"";
  document.getElementById("mf-qa-w").value=existing?existing.qa_w:"";
  document.getElementById("mf-notes").value=existing?existing.notes:"";
  calcMockScores();

  // highlight selected row
  document.querySelectorAll(".mock-row").forEach(r=>r.classList.remove("active"));
  const row=document.getElementById("mock-row-"+num);
  if(row)row.classList.add("active");
}

function saveMockEntry(){
  if(!activeMockNum)return;
  const vc=document.getElementById("mf-varc-c").value;
  const vw=document.getElementById("mf-varc-w").value;
  const dc=document.getElementById("mf-dilr-c").value;
  const dw=document.getElementById("mf-dilr-w").value;
  const qc=document.getElementById("mf-qa-c").value;
  const qw=document.getElementById("mf-qa-w").value;

  mockData[activeMockNum]={
    date:document.getElementById("mf-date").value||todayStr(),
    varc_c:parseInt(vc)||0, varc_w:parseInt(vw)||0,
    dilr_c:parseInt(dc)||0, dilr_w:parseInt(dw)||0,
    qa_c:parseInt(qc)||0, qa_w:parseInt(qw)||0,
    notes:document.getElementById("mf-notes").value.trim()
  };
  saveAll();
  renderMockList();
  // re-highlight after re-render
  const row=document.getElementById("mock-row-"+activeMockNum);
  if(row)row.classList.add("active");
  _setSaveStatus("Mock #"+activeMockNum+" saved ✓",false);
}

function setMockFilter(f,btn){
  mockFilter=f;
  document.querySelectorAll(".mock-filter-btn").forEach(b=>b.classList.remove("active"));
  if(btn)btn.classList.add("active");
  renderMockList();
}

function renderMockList(){
  const attempted=Object.keys(mockData).length;
  document.getElementById("mock-counter").textContent=`${attempted} / 40 attempted`;
  document.getElementById("ms-attempted").textContent=attempted;

  // compute stats
  const entries=Object.entries(mockData);
  if(entries.length){
    const scaleds=entries.map(([,m])=>{
      const vr=calcRaw(m.varc_c,m.varc_w);
      const dr=calcRaw(m.dilr_c,m.dilr_w);
      const qr=calcRaw(m.qa_c,m.qa_w);
      return rawToScaled300(vr,dr,qr);
    });
    scaleds.sort((a,b)=>b-a);
    document.getElementById("ms-best-scaled").textContent=scaleds[0];
    document.getElementById("ms-avg-scaled").textContent=Math.round(scaleds.reduce((a,b)=>a+b,0)/scaleds.length);
    document.getElementById("ms-best-pct").textContent=lookupPctile(OVERALL_PCTL,scaleds[0]);
    if(scaleds.length>=2){
      // trend: avg of last 5 sorted by mock number vs overall avg
      const last5=entries
        .sort((a,b)=>parseInt(a[0])-parseInt(b[0]))
        .slice(-5)
        .map(([,m])=>rawToScaled300(calcRaw(m.varc_c,m.varc_w),calcRaw(m.dilr_c,m.dilr_w),calcRaw(m.qa_c,m.qa_w)));
      const l5avg=Math.round(last5.reduce((a,b)=>a+b,0)/last5.length);
      const allAvg=Math.round(scaleds.reduce((a,b)=>a+b,0)/scaleds.length);
      const diff=l5avg-allAvg;
      document.getElementById("ms-trend").textContent=(diff>=0?"+":"")+diff;
      document.getElementById("ms-trend").style.color=diff>=0?"#34d399":"#fb923c";
    } else {
      document.getElementById("ms-trend").textContent="—";
    }
  } else {
    ["ms-best-scaled","ms-avg-scaled","ms-best-pct","ms-trend"].forEach(id=>{
      document.getElementById(id).textContent="—";
    });
    document.getElementById("ms-trend").style.color="";
  }

  // render list rows
  let html="";
  for(let i=1;i<=40;i++){
    const m=mockData[i];
    const done=!!m;
    if(mockFilter==="done"&&!done)continue;
    if(mockFilter==="pending"&&done)continue;

    if(done){
      const vr=calcRaw(m.varc_c,m.varc_w);
      const dr=calcRaw(m.dilr_c,m.dilr_w);
      const qr=calcRaw(m.qa_c,m.qa_w);
      const scaled=rawToScaled300(vr,dr,qr);
      const pct=lookupPctile(OVERALL_PCTL,scaled);
      const dateStr=m.date?new Date(m.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"";
      html+=`<div class="mock-row done" id="mock-row-${i}" onclick="openMockForm(${i})">
        <div class="mock-row-num">${i}</div>
        <div class="mock-row-info">
          <div class="mock-row-title">Mock #${i}<span class="mock-row-date">${dateStr}</span></div>
          <div class="mock-row-scores">
            <span class="mock-score-chip varc">VARC: ${vr}</span>
            <span class="mock-score-chip dilr">DILR: ${dr}</span>
            <span class="mock-score-chip qa">QA: ${qr}</span>
          </div>
        </div>
        <div class="mock-row-right">
          <div class="mock-row-scaled">${scaled}</div>
          <div class="mock-row-pct">${pct}</div>
        </div>
      </div>`;
    } else {
      html+=`<div class="mock-row pending" id="mock-row-${i}" onclick="openMockForm(${i})">
        <div class="mock-row-num muted">${i}</div>
        <div class="mock-row-info">
          <div class="mock-row-title">Mock #${i}<span class="mock-row-status">Pending</span></div>
        </div>
        <div class="mock-row-right"><div class="mock-row-enter">+ Enter →</div></div>
      </div>`;
    }
  }
  document.getElementById("mock-list-scroll").innerHTML=html||`<div style="text-align:center;color:var(--muted);padding:32px;font-size:13px">No mocks match this filter.</div>`;

  // re-highlight active if still visible
  if(activeMockNum){
    const row=document.getElementById("mock-row-"+activeMockNum);
    if(row)row.classList.add("active");
  }
}

/* ── INIT ── */
(async function init(){
  const now=new Date();
  calYear=now.getFullYear();calMonth=now.getMonth();selDate=todayStr();
  await loadAll();
  renderNav();
  updatePanel();
  updateGlobal();
  setPage("quant");
  _setSaveStatus("Loaded",false);
  _cloudInit();
})();
