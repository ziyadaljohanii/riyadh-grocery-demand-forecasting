let state = loadState();
let currentUnit = null;
let activeAudio = null;
let readingStart = null;
let readingTick = null;
let recognition = null;
let currentWord = null;
let placementIndex = 0;
let placementScore = 0;
let lessonStepIndex = 0;

function clone(o){return JSON.parse(JSON.stringify(o))}
function loadState(){
  try{
    const raw=localStorage.getItem("englishLabV3");
    return raw?Object.assign(clone(defaultState),JSON.parse(raw)):clone(defaultState)
  }catch{return clone(defaultState)}
}
function saveState(){localStorage.setItem("englishLabV3",JSON.stringify(state));updateBadges()}
function todayKey(d=new Date()){return d.toISOString().slice(0,10)}
function levelUnits(level){return UNITS.filter(u=>u.level===level)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function stripHtml(s=""){const d=document.createElement("div");d.innerHTML=s;return d.textContent||""}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.remove("hidden");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.add("hidden"),2400)}
function setView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(`view-${name}`)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===name));
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="home")renderHome();
  if(name==="learn")renderLearn();
  if(name==="review")renderReview();
  if(name==="games")renderGames();
  if(name==="progress")renderProgress();
}
function updateStreak(){
  const t=todayKey();if(state.lastStudyDate===t)return;
  if(state.lastStudyDate){
    const prev=new Date(state.lastStudyDate+"T12:00:00"),now=new Date(t+"T12:00:00");
    const days=Math.round((now-prev)/86400000);
    state.streak=days===1?state.streak+1:1
  }else state.streak=1;
  state.lastStudyDate=t;saveState()
}
function dueReviews(){const now=Date.now();return Object.values(state.reviews).filter(r=>!r.known&&(!r.due||r.due<=now)).sort((a,b)=>(a.due||0)-(b.due||0))}
function estimateLevel(){
  const avg=Object.values(state.skills).reduce((a,b)=>a+b,0)/5;
  let lvl="A1";for(const l of LEVELS){if(avg>=LEVEL_THRESHOLDS[l])lvl=l}
  state.level=lvl;return lvl
}
function weakestSkill(){return Object.entries(state.skills).sort((a,b)=>a[1]-b[1])[0][0]}
function skillLabel(k){return ({listening:"Listening",reading:"Reading",speaking:"Speaking",writing:"Writing",vocabulary:"Vocabulary"})[k]||k}
function addXP(n){state.xp+=n;updateStreak();saveState()}
function adjustSkill(skill,delta){state.skills[skill]=Math.max(0,Math.min(100,(state.skills[skill]||0)+delta));estimateLevel();saveState()}

function coachTip(){
  const due=dueReviews().length,weak=weakestSkill();
  if(due>5)return `You have ${due} reviews waiting. Clear a few before adding more new words.`;
  if(weak==="speaking")return "Your next priority is speaking. Shadow one short sentence until the rhythm feels natural.";
  if(weak==="listening")return "Your next priority is listening. Start with a human recording at 0.85×, then return to normal speed.";
  if(weak==="writing")return "Your next priority is writing. Use short, accurate sentences before making them longer.";
  if(weak==="vocabulary")return "Your next priority is vocabulary. Save only useful words and review them in context.";
  return "Keep the next lesson simple: listen first, then read, then use the English yourself."
}
function currentCourseUnit(level){
  const units=levelUnits(level);
  return units.find(u=>!state.completed[u.id])||units[units.length-1]||UNITS[0]
}
function renderHome(){
  const level=estimateLevel();
  const units=levelUnits(level);
  const current=currentCourseUnit(level);
  const done=units.filter(u=>state.completed[u.id]).length;
  const pct=units.length?Math.round(done/units.length*100):0;

  document.getElementById("homeLevelText").textContent=`${level} · ${LEVEL_NAMES[level]}`;
  document.getElementById("xpValue").textContent=state.xp;
  document.getElementById("streakValue").textContent=state.streak;
  document.getElementById("dueValue").textContent=dueReviews().length;
  document.getElementById("coachSummary").textContent=`You’re on ${level}. ${skillLabel(weakestSkill())} needs the most attention right now.`;
  document.getElementById("coachTip").textContent=coachTip();
  document.getElementById("courseProgressText").textContent=`${done} of ${units.length} lessons complete`;
  document.getElementById("courseProgressBar").style.width=pct+"%";

  document.getElementById("learningPath").innerHTML=units.map((u,i)=>{
    const isDone=!!state.completed[u.id];
    const isCurrent=current?.id===u.id&&!isDone;
    const status=isDone?"done":isCurrent?"current":"upcoming";
    const symbol=isDone?"✓":isCurrent?"▶":i+1;
    return `<button class="path-node ${status}" data-path-unit="${u.id}">
      <span class="path-bubble">${symbol}</span>
      <span class="path-copy"><strong>${esc(u.title)}</strong><small>${esc(u.topic)}</small></span>
    </button>`
  }).join("");

  document.querySelectorAll("[data-path-unit]").forEach(b=>b.addEventListener("click",()=>openLesson(b.dataset.pathUnit)));
}
function startRecommended(skill){
  const unit=currentCourseUnit(state.level);
  openLesson(unit.id);
  if(skill)toast(`${skillLabel(skill)} is your current focus.`)
}
function renderLearn(){
  const selected=state.settings.selectedLevel||state.level;
  document.getElementById("levelTabs").innerHTML=LEVELS.map(l=>`<button class="chip ${l===selected?"active":""}" data-lvl-tab="${l}">${l} · ${LEVEL_NAMES[l]}</button>`).join("");
  document.querySelectorAll("[data-lvl-tab]").forEach(b=>b.addEventListener("click",()=>{state.settings.selectedLevel=b.dataset.lvlTab;saveState();renderLearn()}));
  document.getElementById("unitGrid").innerHTML=levelUnits(selected).map((u,i)=>{
    const done=!!state.completed[u.id];
    return `<article class="unit-card">
      <div class="unit-art"><span class="unit-level">${u.level} · ${i+1}</span><span class="emoji">${u.emoji}</span></div>
      <div class="unit-body">
        <strong>${esc(u.title)}</strong><p>${esc(u.topic)}</p>
        <div class="unit-meta"><span>Listen</span><span>Read</span><span>Speak</span></div>
        <button class="${done?"secondary-btn":"primary-btn"}" data-unit="${u.id}">${done?"Review lesson":"Start"}</button>
      </div>
    </article>`
  }).join("");
  document.querySelectorAll("[data-unit]").forEach(b=>b.addEventListener("click",()=>openLesson(b.dataset.unit)));
}
