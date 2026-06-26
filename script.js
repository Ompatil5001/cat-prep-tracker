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
let calYear,calMonth,selDate;
let currentPage="quant";

SECTIONS.forEach(s=>s.topics.forEach((_,i)=>qState[s.id+"_"+i]=false));

/* ── Storage ──
   Plain localStorage (this is a regular browser file, not a Claude
   artifact, so window.storage isn't available here). To protect against
   accidental clearing of browser data, this also:
   1) keeps a rolling backup copy under a second key, and
   2) lets you export everything to a JSON file you can keep safe, and
      re-import later via the Backup menu in the sidebar.
*/
const LS_KEYS={q:"cat_q_v4",daily:"cat_daily_v4",read:"cat_read_v4"};
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
    // rolling backup blob, separate key, so one corrupted key doesn't lose everything
    localStorage.setItem(LS_BACKUP_KEY,JSON.stringify({
      q:qState,daily:dailyData,read:readingData,savedAt:new Date().toISOString()
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
    if(q){const p=JSON.parse(q);Object.keys(p).forEach(k=>{if(k in qState)qState[k]=p[k];});}
    if(d)dailyData=JSON.parse(d);
    if(r)readingData=JSON.parse(r);
    // if the main keys are missing/empty but a backup blob exists, restore from it
    if(!q&&!d&&!r){
      const b=localStorage.getItem(LS_BACKUP_KEY);
      if(b){
        const p=JSON.parse(b);
        if(p.q)Object.keys(p.q).forEach(k=>{if(k in qState)qState[k]=p.q[k];});
        if(p.daily)dailyData=p.daily;
        if(p.read)readingData=p.read;
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
  // Only pull from the cloud if this browser looks empty (e.g. storage was wiped).
  // Otherwise local data wins, and the next save just refreshes the cloud copy.
  const looksEmpty=!localStorage.getItem(LS_KEYS.q)&&!localStorage.getItem(LS_KEYS.daily)&&
                    !localStorage.getItem(LS_KEYS.read)&&!localStorage.getItem(LS_BACKUP_KEY);
  if(!looksEmpty)return;
  try{
    const doc=await db.collection("trackers").doc(_uid).get();
    if(doc.exists){
      const p=doc.data();
      if(p.q)Object.keys(p.q).forEach(k=>{if(k in qState)qState[k]=p.q[k];});
      if(p.daily)dailyData=p.daily;
      if(p.read)readingData=p.read;
      _doSaveAll();
      renderNav();updatePanel();updateGlobal();
      if(currentPage==="daily")renderCalendar();
      if(currentPage==="reading")renderReadingLog();
      _setSaveStatus("Restored from cloud ✓",false);
    }
  }catch(e){
    console.error("cloud pull failed",e);
  }
}

async function _cloudPush(){
  if(!_cloudReady||!_uid)return;
  try{
    await db.collection("trackers").doc(_uid).set({
      q:qState,daily:dailyData,read:readingData,savedAt:new Date().toISOString()
    });
  }catch(e){
    console.error("cloud push failed",e);
  }
}

/* ── Export / Import (file backup) ── */
function exportBackup(){
  const payload={q:qState,daily:dailyData,read:readingData,exportedAt:new Date().toISOString()};
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
      saveAll();
      renderNav();updatePanel();updateGlobal();
      if(currentPage==="daily")renderCalendar();
      if(currentPage==="reading")renderReadingLog();
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

/* ── CAT Exam Countdown ── */
function updateCountdown(){
  const exam=new Date('2026-11-29T00:00:00');
  const now=new Date();
  const diff=exam-now;
  const el=document.getElementById('cd-days');
  const days=diff>0?Math.ceil(diff/(1000*60*60*24)):0;
  if(el)el.textContent=diff<=0?'🎯':days;
  // mobile fallback: ring-stats shows a compact line since sb-top is hidden
  const rs=document.querySelector('.ring-stats');
  if(rs)rs.dataset.cd=days>0?days+' days to CAT':'CAT is today!';
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
  updateCountdown();
  setInterval(updateCountdown,60*60*1000); // refresh every hour
  _cloudInit();
})();
