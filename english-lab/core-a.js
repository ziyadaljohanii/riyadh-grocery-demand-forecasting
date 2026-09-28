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
function toast(msg){const el=document.getElementById("toast");if(!el)return;el.textContent=msg;el.classList.remove("hidden");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.add("hidden"),2400)}
function setView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(`view-${name}`)?.classList.add("active");
  document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===name));
  document.body.classList.toggle("lesson-active",name==="lesson");
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
function dueReviews(){
  const now=Date.now();
  return Object.values(state.reviews).filter(r=>!r.known&&(!r.due||r.due<=now)).sort((a,b)=>(a.due||0)-(b.due||0))
}
function estimateLevel(){
  const avg=Object.values(state.skills).reduce((a,b)=>a+b,0)/5;
  let lvl="A1";
  for(const l of LEVELS){if(avg>=LEVEL_THRESHOLDS[l])lvl=l}
  state.level=lvl;
  return lvl
}
function weakestSkill(){return Object.entries(state.skills).sort((a,b)=>a[1]-b[1])[0][0]}
function skillLabel(k){return ({listening:"Listening",reading:"Reading",speaking:"Speaking",writing:"Writing",vocabulary:"Vocabulary"})[k]||k}
function skillLabelAr(k){return ({listening:"الاستماع",reading:"القراءة",speaking:"التحدث",writing:"الكتابة",vocabulary:"المفردات"})[k]||k}
function addXP(n){state.xp+=n;updateStreak();saveState()}
function adjustSkill(skill,delta){
  state.skills[skill]=Math.max(0,Math.min(100,(state.skills[skill]||0)+delta));
  estimateLevel();saveState()
}
function currentCourseUnit(level){
  const units=levelUnits(level);
  return units.find(u=>!state.completed[u.id])||units[units.length-1]||UNITS[0]
}
function rankedWeakWords(){
  const keys=new Set([...Object.keys(state.reviews),...Object.keys(state.selectedWords),...Object.keys(state.hardWords)]);
  return [...keys].map(word=>{
    const r=state.reviews[word]||{};
    const score=(r.wrong||0)*4+(state.hardWords[word]?4:0)+(state.selectedWords[word]||0)*.8-(r.correct||0)*.6;
    return {word,meaning:r.meaning||meaningFor?.(word)||"",score}
  }).sort((a,b)=>b.score-a.score).filter(x=>x.score>0)
}
function adaptiveSnapshot(){
  const weak=weakestSkill();
  const attempts=Object.values(state.attempts||{}).reduce((a,b)=>a+(+b||0),0);
  const evidence=(state.quizHistory?.length||0)+attempts+Object.keys(state.reviews||{}).length;
  const confidence=Math.min(94,52+Math.round(Math.sqrt(evidence)*7));
  const words=rankedWeakWords().slice(0,5);
  let reason=`${skillLabel(weak)} is currently your lowest skill score.`;
  if(weak==="listening")reason="You need more listening exposure. Human-audio practice will appear more often.";
  if(weak==="speaking")reason="Speaking attempts are behind your other skills. Shadowing is prioritised.";
  if(weak==="vocabulary")reason="Saved and difficult words are affecting your vocabulary score. Review is prioritised.";
  if(weak==="writing")reason="Writing is your lowest area. Short sentence practice is prioritised.";
  if(weak==="reading")reason="Reading checks need more accuracy. Comprehension practice is prioritised.";
  return {weak,weakLabel:skillLabel(weak),confidence,words,reason}
}
function coachTip(){
  const snap=adaptiveSnapshot(),due=dueReviews().length;
  if(due>5)return `${due} reviews are due. Clear a few before adding more new words.`;
  return snap.reason
}
function renderHome(){
  const ar=state.settings.lang==="ar";
  const level=estimateLevel();
  const units=levelUnits(level);
  const current=currentCourseUnit(level);
  const done=units.filter(u=>state.completed[u.id]).length;
  const pct=units.length?Math.round(done/units.length*100):0;
  const snap=adaptiveSnapshot();

  const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  put("homeLevelText",`${level} · ${LEVEL_NAMES[level]}`);
  put("xpValue",state.xp);put("xpValueDesktop",state.xp);
  put("streakValue",state.streak);put("streakValueDesktop",state.streak);
  put("dueValue",dueReviews().length);put("dueValueDesktop",dueReviews().length);
  put("coachSummary",ar?`خطتك تتكيف مع مستواك، والتركيز الآن على ${skillLabelAr(snap.weak)}.`:`Your course is adapting to ${snap.weakLabel.toLowerCase()} and your saved-word performance.`);
  const tip=ar?(snap.weak==="listening"?"الاستماع يحتاج ممارسة أكثر. سنعطي التسجيلات البشرية أولوية أكبر.":snap.weak==="speaking"?"التحدث يحتاج ممارسة أكثر. سنعطي الشادووينق أولوية أكبر.":snap.weak==="vocabulary"?"بعض الكلمات المحفوظة تحتاج مراجعة أكثر.":snap.weak==="writing"?"الكتابة تحتاج تدريبًا أكثر على الجمل القصيرة.":"القراءة تحتاج دقة أعلى في فهم النص.") : coachTip();
  put("coachTip",tip);put("coachTipDesktop",tip);
  put("aiWeakSkillMobile",ar?skillLabelAr(snap.weak):snap.weakLabel);put("aiWeakSkillDesktop",ar?skillLabelAr(snap.weak):snap.weakLabel);
  put("courseProgressText",ar?`${done} من ${units.length} دروس مكتملة`:`${done} of ${units.length} lessons complete`);
  const bar=document.getElementById("courseProgressBar");if(bar)bar.style.width=pct+"%";

  const pathItems=[];
  units.forEach((u,i)=>{
    pathItems.push({type:"lesson",unit:u});
    if(i===0&&dueReviews().length>0)pathItems.push({type:"review",title:ar?"مراجعة ذكية":"Smart review",sub:ar?`${dueReviews().length} كلمات جاهزة للمراجعة`:`${dueReviews().length} words are ready`});
    if(i===1)pathItems.push({type:"speaking",title:ar?"تدريب التحدث":"Speaking boost",sub:ar?"شادووينق بصوت بشري":"Human shadowing"});
  });

  document.getElementById("learningPath").innerHTML=pathItems.map((item,i)=>{
    if(item.type==="lesson"){
      const u=item.unit,isDone=!!state.completed[u.id],isCurrent=current?.id===u.id&&!isDone;
      return `<button class="path-node ${isDone?"done":isCurrent?"current":""}" data-path-unit="${u.id}">
        ${isCurrent?`<span class="node-start">${ar?"الخطوة التالية":"YOUR NEXT STEP"}</span>`:""}
        <span class="path-bubble">${isDone?"✓":isCurrent?"★":u.emoji}</span>
        <span class="path-label"><b>${esc(u.title)}</b>${esc(u.topic)}</span>
      </button>`
    }
    if(item.type==="review"){
      return `<button class="path-node review" data-path-action="review"><span class="path-bubble">↻</span><span class="path-label"><b>${item.title}</b>${item.sub}</span></button>`
    }
    return `<button class="path-node speaking" data-path-action="speaking"><span class="path-bubble">◉</span><span class="path-label"><b>${item.title}</b>${item.sub}</span></button>`
  }).join("");

  document.querySelectorAll("[data-path-unit]").forEach(b=>b.addEventListener("click",()=>openLesson(b.dataset.pathUnit)));
  document.querySelectorAll('[data-path-action="review"]').forEach(b=>b.addEventListener("click",()=>setView("review")));
  document.querySelectorAll('[data-path-action="speaking"]').forEach(b=>b.addEventListener("click",()=>startRecommended("speaking")));
}
function startRecommended(skill){
  const unit=currentCourseUnit(state.level);
  openLesson(unit.id);
  if(skill)toast(state.settings.lang==="ar"?`التركيز الحالي: ${skillLabelAr(skill)}`:`${skillLabel(skill)} is your current focus.`)
}
function renderLearn(){
  const ar=state.settings.lang==="ar";
  const selected=state.settings.selectedLevel||state.level;
  document.getElementById("levelTabs").innerHTML=LEVELS.map(l=>`<button class="chip ${l===selected?"active":""}" data-lvl-tab="${l}">${l} · ${LEVEL_NAMES[l]}</button>`).join("");
  document.querySelectorAll("[data-lvl-tab]").forEach(b=>b.addEventListener("click",()=>{
    state.settings.selectedLevel=b.dataset.lvlTab;saveState();renderLearn()
  }));
  document.getElementById("unitGrid").innerHTML=levelUnits(selected).map((u,i)=>{
    const done=!!state.completed[u.id];
    return `<article class="unit-card">
      <div class="unit-art"><span class="unit-level">${u.level} · Lesson ${i+1}</span><span class="emoji">${u.emoji}</span></div>
      <div class="unit-body">
        <strong>${esc(u.title)}</strong><p>${esc(u.topic)}</p>
        <div class="unit-meta"><span>Listen</span><span>Words</span><span>Speak</span></div>
        <button class="${done?"secondary-btn":"primary-btn"}" data-unit="${u.id}">${ar?(done?"راجع الدرس":"ابدأ الدرس"):(done?"Practise again":"Start lesson")}</button>
      </div>
    </article>`
  }).join("");
  document.querySelectorAll("[data-unit]").forEach(b=>b.addEventListener("click",()=>openLesson(b.dataset.unit)));
}