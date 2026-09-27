let state = loadState();
let currentUnit = null;
let activeAudio = null;
let readingStart = null;
let readingTick = null;
let recognition = null;
let currentWord = null;
let placementIndex = 0;
let placementScore = 0;

function clone(o){return JSON.parse(JSON.stringify(o))}
function loadState(){
  try{const raw=localStorage.getItem("englishLabV3");return raw?Object.assign(clone(defaultState),JSON.parse(raw)):clone(defaultState)}catch{return clone(defaultState)}
}
function saveState(){localStorage.setItem("englishLabV3",JSON.stringify(state));updateBadges()}
function todayKey(d=new Date()){return d.toISOString().slice(0,10)}
function levelUnits(level){return UNITS.filter(u=>u.level===level)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function stripHtml(s=""){const d=document.createElement("div");d.innerHTML=s;return d.textContent||""}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.remove("hidden");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.add("hidden"),2600)}
function setView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const v=document.getElementById(`view-${name}`); if(v) v.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===name));
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="home")renderHome(); if(name==="learn")renderLearn(); if(name==="review")renderReview(); if(name==="games")renderGames(); if(name==="progress")renderProgress();
}
function updateStreak(){
  const t=todayKey(); if(state.lastStudyDate===t)return;
  if(state.lastStudyDate){const prev=new Date(state.lastStudyDate+"T12:00:00");const now=new Date(t+"T12:00:00");const days=Math.round((now-prev)/86400000);state.streak=days===1?state.streak+1:1}else state.streak=1;
  state.lastStudyDate=t; saveState();
}
function dueReviews(){const now=Date.now();return Object.values(state.reviews).filter(r=>!r.known && (!r.due||r.due<=now)).sort((a,b)=>(a.due||0)-(b.due||0))}
function estimateLevel(){
  const avg=Object.values(state.skills).reduce((a,b)=>a+b,0)/5;
  let lvl="A1"; for(const l of LEVELS){if(avg>=LEVEL_THRESHOLDS[l])lvl=l}
  state.level=lvl; return lvl;
}
function weakestSkill(){return Object.entries(state.skills).sort((a,b)=>a[1]-b[1])[0][0]}
function skillLabel(k){return ({listening:"Listening",reading:"Reading",speaking:"Speaking",writing:"Writing",vocabulary:"Vocabulary"})[k]||k}
function addXP(n){state.xp+=n;updateStreak();saveState()}
function adjustSkill(skill,delta){state.skills[skill]=Math.max(0,Math.min(100,(state.skills[skill]||0)+delta));estimateLevel();saveState()}

function renderHome(){
  const level=estimateLevel();
  document.getElementById("homeLevelText").textContent=`${level} ${LEVEL_NAMES[level]}`;
  document.getElementById("levelOrb").textContent=level; document.getElementById("xpValue").textContent=state.xp;document.getElementById("streakValue").textContent=state.streak;document.getElementById("dueValue").textContent=dueReviews().length;
  const weak=weakestSkill(); document.getElementById("coachSummary").textContent=`Your weakest area right now is ${skillLabel(weak).toLowerCase()}. Today’s plan gives it extra weight.`;
  document.getElementById("coachTip").textContent=coachTip();
  const daily=[
    {icon:"🎧",title:"Focused listening",sub:`${skillLabel(weak)==="Listening"?"Priority today":"5-minute warm-up"}`,action:()=>startRecommended("listening")},
    {icon:"🧠",title:"Memory review",sub:`${dueReviews().length} item${dueReviews().length===1?"":"s"} due now`,action:()=>setView("review")},
    {icon:"🎙️",title:"Speak aloud",sub:"Shadow one sentence 3 times",action:()=>startRecommended("speaking")}
  ];
  document.getElementById("dailyPlan").innerHTML=daily.map((d,i)=>`<article class="daily-card"><div class="daily-icon">${d.icon}</div><div><strong>${d.title}</strong><small>${d.sub}</small></div><button class="small-btn" data-daily="${i}">Start</button></article>`).join("");
  daily.forEach((d,i)=>document.querySelector(`[data-daily="${i}"]`)?.addEventListener("click",d.action));
  document.getElementById("skillPanel").innerHTML=Object.entries(state.skills).map(([k,v])=>`<div class="skill-card"><span>${skillLabel(k)}</span><strong>${Math.round(v)}%</strong><div class="meter"><i style="width:${v}%"></i></div></div>`).join("");
  document.getElementById("levelCards").innerHTML=LEVELS.map(l=>`<button class="level-card ${l===level?"active":""}" data-level-jump="${l}"><strong>${l}</strong><small>${LEVEL_NAMES[l]}</small></button>`).join("");
  document.querySelectorAll("[data-level-jump]").forEach(b=>b.addEventListener("click",()=>{state.settings.selectedLevel=b.dataset.levelJump;saveState();setView("learn")}));
}
function coachTip(){
  const due=dueReviews().length, weak=weakestSkill();
  if(due>5)return `You have ${due} overdue review items. Clearing a few now will help more than adding many new words.`;
  if(weak==="speaking")return "You understand more than you produce. Use the shadowing step and repeat the same sentence until it feels automatic.";
  if(weak==="listening")return "Replay short human recordings at 0.8× first, then return to 1×. Avoid reading the text too early.";
  if(weak==="writing")return "Write short answers with words you already know. Clear sentences beat complicated sentences with many errors.";
  return "Tap unfamiliar words while reading. Words you inspect repeatedly are automatically treated as weak vocabulary.";
}
function startRecommended(skill){
  const lvl=state.level; const candidates=levelUnits(lvl); let unit=candidates.find(u=>!state.completed[u.id])||candidates[0]||UNITS[0]; openLesson(unit.id); toast(`Coach chose this ${skill} practice for you.`)
}

function renderLearn(){
  const selected=state.settings.selectedLevel||state.level;
  document.getElementById("levelTabs").innerHTML=LEVELS.map(l=>`<button class="chip ${l===selected?"active":""}" data-lvl-tab="${l}">${l} · ${LEVEL_NAMES[l]}</button>`).join("");
  document.querySelectorAll("[data-lvl-tab]").forEach(b=>b.addEventListener("click",()=>{state.settings.selectedLevel=b.dataset.lvlTab;saveState();renderLearn()}));
  document.getElementById("unitGrid").innerHTML=levelUnits(selected).map((u,i)=>{
    const done=!!state.completed[u.id];
    return `<article class="unit-card"><div class="unit-art"><span class="unit-level">${u.level} · Unit ${i+1}</span><span class="emoji">${u.emoji}</span></div><div class="unit-body"><strong>${u.title}</strong><p>${u.topic}</p><div class="unit-meta"><span>🎧 Listening</span><span>🎙 Shadowing</span><span>✍️ Writing</span></div><button class="${done?"secondary-btn":"primary-btn"}" data-unit="${u.id}">${done?"Review again":"Start lesson"}</button></div></article>`
  }).join("");
  document.querySelectorAll("[data-unit]").forEach(b=>b.addEventListener("click",()=>openLesson(b.dataset.unit)));
}