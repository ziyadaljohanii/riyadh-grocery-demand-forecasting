let lessonHumanRecordings=[];
let currentHumanModel=null;
let lastPlayedByContext={lesson:null,word:null};
let activeTranscriptText="";
const LESSON_STEPS=[
  {id:"step-listen",label:"LISTEN",title:"Listen first",subtitle:"Start with a real human recording before you read."},
  {id:"step-reading",label:"READ",title:"Read the story",subtitle:"Tap any word to open its meaning, pronunciation and review tools."},
  {id:"step-shadow",label:"SHADOW",title:"Copy the rhythm",subtitle:"Hear a real speaker, then repeat the sentence in the same rhythm."},
  {id:"step-vocab",label:"WORDS",title:"Keep useful words",subtitle:"Save only the vocabulary you want to remember."},
  {id:"step-grammar",label:"PATTERN",title:"Build the pattern",subtitle:"See one grammar idea, then build it yourself."},
  {id:"step-check",label:"CHECK",title:"Check understanding",subtitle:"One quick question helps adjust what comes next."},
  {id:"step-speakwrite",label:"USE IT",title:"Use the English",subtitle:"Finish by speaking and writing in your own words."}
];
function showLessonStep(index){
  lessonStepIndex=Math.max(0,Math.min(LESSON_STEPS.length-1,index));
  const step=LESSON_STEPS[lessonStepIndex];
  document.querySelectorAll(".lesson-section").forEach(s=>s.classList.remove("active-step"));
  document.getElementById(step.id)?.classList.add("active-step");
  document.getElementById("lessonStepCount").textContent=`${lessonStepIndex+1} / ${LESSON_STEPS.length}`;
  document.getElementById("lessonStepName").textContent=step.label;
  document.getElementById("lessonStageTitle").textContent=step.title;
  document.getElementById("lessonStageSubtitle").textContent=step.subtitle;
  document.getElementById("lessonOverallProgress").style.width=`${Math.round((lessonStepIndex+1)/LESSON_STEPS.length*100)}%`;
  const prev=document.getElementById("lessonPrevBtn"),next=document.getElementById("lessonNextBtn"),complete=document.getElementById("completeLessonBtn");
  prev.classList.toggle("hidden",lessonStepIndex===0);
  next.classList.toggle("hidden",lessonStepIndex===LESSON_STEPS.length-1);
  complete.classList.toggle("hidden",lessonStepIndex!==LESSON_STEPS.length-1);
  window.scrollTo({top:0,behavior:"smooth"});
}

async function openLesson(id){
  currentUnit=UNITS.find(u=>u.id===id); if(!currentUnit)return;
  lessonHumanRecordings=[];currentHumanModel=null;lessonStepIndex=0;
  setView("lesson");
  document.getElementById("lessonLevelBadge").textContent=currentUnit.level;
  document.getElementById("lessonTitle").textContent=currentUnit.title;
  document.getElementById("lessonSubtitle").textContent=currentUnit.topic;
  renderPassage();renderVocab();renderGrammar();renderQuiz();renderSpeakWrite();renderShadow();renderLessonTranscript();renderListenChoose();
  document.getElementById("humanAudioList").innerHTML='<div class="empty-state small">Looking for real human recordings…</div>';
  document.getElementById("passageArabic").textContent=currentUnit.arabic;
  document.getElementById("passageArabic").classList.add("hidden");
  loadLessonImage(currentUnit.imageQuery);
  readingStart=Date.now();clearInterval(readingTick);readingTick=setInterval(updateReadingTimer,1000);
  showLessonStep(0);
  setTimeout(()=>findHumanLessonAudio(true),180);
  setTimeout(()=>warmVoiceLibrary((currentUnit.vocab||[]).map(v=>v[0])),1200);
}
function renderPassage(){
  const el=document.getElementById("passageText");
  const parts=currentUnit.passage.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);
  el.innerHTML=parts.map(p=>/^[A-Za-z][A-Za-z'-]*$/.test(p)?`<span class="word-token" tabindex="0" data-word="${esc(p.toLowerCase())}">${esc(p)}</span>`:esc(p)).join("");
  el.querySelectorAll(".word-token").forEach(w=>{
    w.addEventListener("click",()=>openWord(w.dataset.word));
    w.addEventListener("keydown",e=>{if(e.key==="Enter")openWord(w.dataset.word)})
  });
}
function updateReadingTimer(){
  if(!readingStart)return;
  const s=Math.floor((Date.now()-readingStart)/1000);
  document.getElementById("readingTimer").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
}
function renderVocab(){
  document.getElementById("vocabGrid").innerHTML=currentUnit.vocab.map(([w,ar])=>`
    <article class="vocab-card">
      <h3>${w}</h3><div class="ar" dir="rtl">${ar}</div>
      <p>Open the word for real-speaker audio, meaning and reminders.</p>
      <div class="vocab-actions">
        <button class="small-btn" data-vword="${w}">Human audio</button>
        <button class="small-btn" data-vsave="${w}">+ Review</button>
        <button class="small-btn" data-vhard="${w}">Hard</button>
      </div>
    </article>`).join("");
  document.querySelectorAll("[data-vword]").forEach(b=>b.addEventListener("click",()=>openWord(b.dataset.vword)));
  document.querySelectorAll("[data-vsave]").forEach(b=>b.addEventListener("click",()=>addReviewWord(b.dataset.vsave,meaningFor(b.dataset.vsave))));
  document.querySelectorAll("[data-vhard]").forEach(b=>b.addEventListener("click",()=>{
    state.hardWords[b.dataset.vhard]=true;
    addReviewWord(b.dataset.vhard,meaningFor(b.dataset.vhard),true);
    toast("Marked as hard")
  }));
}
function renderGrammar(){
  document.getElementById("grammarCard").innerHTML=`<h3>${currentUnit.grammar.title}</h3><p>${currentUnit.grammar.tip}</p><div class="grammar-example">${currentUnit.grammar.example}</div>`;
  const example=currentUnit.grammar.example.split(" ");
  const shuffled=[...example].sort(()=>Math.random()-.5);
  const sb=document.getElementById("sentenceBuilder");
  sb.innerHTML=`<h3>Sentence builder</h3><p class="support-text">Tap the words in the correct order.</p><div id="builderLine" class="builder-line"></div><div class="word-bank">${shuffled.map((w,i)=>`<button data-build="${i}">${esc(w)}</button>`).join("")}</div><button id="checkBuilderBtn" class="small-btn">Check</button>`;
  let built=[];
  sb.querySelectorAll("[data-build]").forEach(b=>b.addEventListener("click",()=>{
    built.push(b.textContent);b.disabled=true;document.getElementById("builderLine").textContent=built.join(" ")
  }));
  document.getElementById("checkBuilderBtn").onclick=()=>{
    const norm=s=>s.toLowerCase().replace(/[^a-z' ]/g,"").replace(/\s+/g," ").trim();
    if(norm(built.join(" "))===norm(currentUnit.grammar.example)){
      toast("Correct sentence ✓");addXP(5);adjustSkill("writing",1)
    }else{
      toast("Not quite. Try again.");built=[];document.getElementById("builderLine").textContent="";
      sb.querySelectorAll("[data-build]").forEach(b=>b.disabled=false)
    }
  };
}
function renderQuiz(){
  const q=currentUnit.quiz;const el=document.getElementById("quizCard");
  el.innerHTML=`<h3>${q.q}</h3>${q.options.map((o,i)=>`<button class="quiz-option" data-qopt="${i}">${esc(o)}</button>`).join("")}<div id="quizFeedback"></div>`;
  el.querySelectorAll("[data-qopt]").forEach(b=>b.addEventListener("click",()=>{
    const i=+b.dataset.qopt;el.querySelectorAll(".quiz-option").forEach(x=>x.disabled=true);
    b.classList.add(i===q.answer?"correct":"wrong");
    if(i!==q.answer)el.querySelector(`[data-qopt="${q.answer}"]`)?.classList.add("correct");
    const ok=i===q.answer;
    document.getElementById("quizFeedback").textContent=ok?"Correct. Nice work.":"Not quite. Read the passage once more.";
    state.quizHistory.push({unit:currentUnit.id,ok,at:Date.now()});
    adjustSkill("reading",ok?2:-1);addXP(ok?8:2);saveState()
  }));
}
function renderSpeakWrite(){
  document.getElementById("speakingPrompts").innerHTML=currentUnit.speaking.map((p,i)=>`<p><strong>${i+1}.</strong> ${p}</p>`).join("");
  document.getElementById("writingPrompt").textContent=currentUnit.writing;
  document.getElementById("writingInput").value="";
  document.getElementById("writingFeedback").textContent="";
}
function renderShadow(){
  const sentence=currentUnit.passage.split(/(?<=[.!?])\s+/).find(s=>s.trim().split(/\s+/).length>=3)||currentUnit.passage;
  document.getElementById("shadowSentence").textContent=sentence;
  document.getElementById("shadowResult").textContent="A matching human model will appear when available."
}
function populateSystemVoices(){}
function systemSpeak(){toast("Synthetic voices are disabled in this version.")}

function accentGroup(accent=""){
  const a=String(accent||"").toLowerCase();
  if(/south africa|south african|(^|\b)za(\b|$)/.test(a))return "ZA";
  if(/(^|\b)(us|usa|american|united states)(\b|$)/.test(a))return "US";
  if(/(^|\b)(uk|gb|british|united kingdom|england|scotland|wales|northern ireland)(\b|$)/.test(a))return "UK";
  return "Other";
}
function accentFullLabel(accent="",group){
  const g=group||accentGroup(accent);
  if(g==="US")return "American English";
  if(g==="UK")return "British English";
  if(g==="ZA")return "South African English";
  return accent&&accent!=="Accent not specified"?accent:"English";
}
function cleanSpeakerName(raw=""){
  let s=stripHtml(String(raw||""))
    .replace(/\s+/g," ")
    .replace(/^(User:|Speaker:|Author:)\s*/i,"")
    .trim();
  if(!s)return "";
  if(/^File:/i.test(s)||/^En[- _]/i.test(s)||/Human contributor|Tatoeba contributor/i.test(s))return "";
  if(s.length>46)s=s.slice(0,43).trim()+"…";
  return s;
}
function speakerDisplayName(item,index=0){
  const direct=cleanSpeakerName(item.label||item.speaker||item.username||"");
  return direct||`Speaker ${index+1}`;
}
function curatedSpeakerRule(raw=""){
  return typeof voiceLibrarySpeakerForArtist==="function"?voiceLibrarySpeakerForArtist(raw):null
}
function academicPreferenceScore(a){
  const rule=curatedSpeakerRule(a.label||"");
  if(!rule)return 0;
  const q=String(rule.quality||"").toLowerCase();
  if(q.includes("studio"))return 18;
  if(q.includes("shtooka"))return 15;
  if(q.includes("curated"))return 12;
  return 9
}
function audioQualityScore(a){
  let score=0;
  const u=String(a.url||"").toLowerCase();
  if(/\.mp3(\?|$)/.test(u)||/audio\/mpeg/.test(String(a.mime||"")))score+=10;
  else if(/\.wav(\?|$)/.test(u))score+=6;
  if(a.group==="US"||a.group==="UK"||a.group==="ZA")score+=6;
  if(a.style==="academic")score+=4+academicPreferenceScore(a);
  if(a.style==="street")score+=3;
  if(a.accent&&a.accent!=="Accent not specified")score+=3;
  if(cleanSpeakerName(a.label||""))score+=4;
  if(/wikimedia|lingua libre/i.test(a.source||""))score+=2;
  if(/tatoeba/i.test(a.source||""))score+=1;
  return score;
}
function sortHumanAudio(items){
  const order={US:0,UK:1,ZA:2,Other:3};
  return [...items].sort((a,b)=>
    (order[a.group]??4)-(order[b.group]??4) ||
    audioQualityScore(b)-audioQualityScore(a) ||
    String(a.label||"").localeCompare(String(b.label||""))
  )
}
function sentenceCandidates(){
  return currentUnit.passage.split(/(?<=[.!?])\s+/)
    .map(s=>s.trim()).filter(Boolean)
    .sort((a,b)=>Math.abs(a.split(/\s+/).length-8)-Math.abs(b.split(/\s+/).length-8));
}
async function findHumanLessonAudio(silent=false){
  const list=document.getElementById("humanAudioList");
  list.innerHTML='<div class="empty-state small">Searching real human recordings…</div>';
  let found=[];

  // Try exact human sentence/phrase recordings first.
  for(const text of sentenceCandidates()){
    const commons=await fetchCommonsAudio(text);
    found.push(...commons.map(x=>({...x,text})));
    if(found.length>=12)break
  }

  found=sortHumanAudio(dedupeAudio(found));
  if(found.length){
    lessonHumanRecordings=found.slice(0,18);
    currentHumanModel=lessonHumanRecordings.find(x=>x.group==="UK")||lessonHumanRecordings.find(x=>x.group==="US")||lessonHumanRecordings[0]||null;
    if(currentHumanModel?.text)document.getElementById("shadowSentence").textContent=currentHumanModel.text;
    renderAudioItems(list,lessonHumanRecordings,"human");
    applyAudioAccentFilter("all","humanAudioList");
    if(!silent)toast(state.settings.lang==="ar"?"تم العثور على تسجيلات بشرية":"Human recordings are ready");
    return lessonHumanRecordings;
  }

  // If a whole-sentence recording does not exist, search every vocabulary word,
  // not only the first word. This makes the human-audio section useful on every lesson.
  let fallback=[];
  for(const entry of (currentUnit.vocab||[])){
    const word=entry?.[0];if(!word)continue;
    const recordings=await fetchCommonsAudio(word);
    if(recordings.length)fallback.push(...recordings.map(x=>({...x,text:word})));
    if(fallback.length>=16)break
  }

  fallback=sortHumanAudio(dedupeAudio(fallback));
  if(fallback.length){
    lessonHumanRecordings=fallback.slice(0,18);
    currentHumanModel=null;
    list.innerHTML=`<div class="empty-state small">${state.settings.lang==="ar"?"لا يوجد تسجيل بشري مطابق للجملة كاملة. هذه تسجيلات بشرية حقيقية لكلمات الدرس.":"No exact human recording exists for the full sentence. These are real human recordings for words in this lesson."}</div><div id="lessonWordAudio"></div>`;
    renderAudioItems(document.getElementById("lessonWordAudio"),lessonHumanRecordings,"human");
    applyAudioAccentFilter("all","lessonWordAudio");
    if(!silent)toast(state.settings.lang==="ar"?"تم تحميل أصوات بشرية لكلمات الدرس":"Human word audio is ready");
    return lessonHumanRecordings;
  }

  lessonHumanRecordings=[];currentHumanModel=null;
  list.innerHTML=`<div class="empty-state small">${state.settings.lang==="ar"?"لم نجد تسجيلًا بشريًا صالحًا لهذا الدرس بعد. لن نستخدم صوت ذكاء اصطناعي بدلًا منه.":"No usable human recording was found for this lesson. AI speech will not be used as a substitute."}</div>`;
  if(!silent)toast(state.settings.lang==="ar"?"لا يوجد تسجيل بشري صالح حاليًا":"No usable human recording found");
  return [];
}
async function playShadowHuman(){
  if(!currentHumanModel)await findHumanLessonAudio(true);
  if(!currentHumanModel){
    toast(state.settings.lang==="ar"?"لا يوجد تسجيل محادثة بشري مطابق لهذه الجملة.":"No matching human conversational recording is available for this sentence.");
    return;
  }
  document.getElementById("shadowSentence").textContent=currentHumanModel.text||document.getElementById("shadowSentence").textContent;
  playRepeated(currentHumanModel.url)
}
function normalizedAudioText(s=""){
  return String(s).trim().toLowerCase().replace(/[.!?]+$/,"").replace(/\s+/g," ")
}
async function fetchTatoebaRecordings(){return []}
function bestCommonsPlayable(info){
  const derivatives=Array.isArray(info?.derivatives)?info.derivatives:[];
  const mp3s=derivatives.filter(d=>{
    const type=String(d.type||"").toLowerCase();
    const key=String(d.transcodekey||d.shorttitle||"").toLowerCase();
    const src=String(d.src||d.url||"").toLowerCase();
    return type.includes("audio/mpeg")||key.includes("mp3")||src.includes(".mp3")
  }).sort((a,b)=>(+(b.bitrate||0))-(+(a.bitrate||0)));
  const source=info?.url||"";
  const sources=[];
  for(const d of mp3s){
    const u=d.src||d.url;
    if(u&&!sources.includes(u))sources.push(u)
  }
  if(source&&!sources.includes(source))sources.push(source);
  if(!sources.length)return null;
  const first=sources[0];
  return {url:first,sources,mime:/\.mp3(\?|$)/i.test(first)?"audio/mpeg":/\.wav(\?|$)/i.test(first)?"audio/wav":"audio/ogg",bitrate:mp3s[0]?+(mp3s[0].bitrate||0)||null:null}
}
function commonsGroupFromBlob(blob=""){
  const b=String(blob).toLowerCase();
  if(/en[- _]?za|south africa|south african/.test(b))return "ZA";
  if(/en[- _]?(us)|american|united states/.test(b))return "US";
  if(/en[- _]?(uk|gb)|british|united kingdom|england|scotland|wales/.test(b))return "UK";
  return ""
}
function exactWordMatchesTitle(raw,title=""){
  const norm=String(raw).toLowerCase().replace(/[^a-z]/g,"");
  if(!norm)return false;
  const stripped=String(title).replace(/^File:/i,"").replace(/\.(ogg|oga|wav|mp3|flac)$/i,"").toLowerCase().replace(/^en[- _]?(us|uk|gb|za)[- _]?/,"").replace(/[- _]?\d+$/,"").replace(/[^a-z]/g,"");
  return stripped===norm
}
function commonsPageToAudioItem(p,raw){
  const info=p?.videoinfo?.[0];if(!info)return null;
  const playable=bestCommonsPlayable(info);if(!playable?.url)return null;
  const meta=info.extmetadata||{};
  const blob=`${p.title||""} ${stripHtml(meta.ImageDescription?.value||"")} ${stripHtml(meta.Description?.value||"")} ${stripHtml(meta.Categories?.value||"")}`.toLowerCase();
  if(/synthetic|text-to-speech|\btts\b|speech synthes|generated voice|computer voice/.test(blob))return null;
  const norm=String(raw).toLowerCase().replace(/[^a-z]/g,"");
  const desc=`${stripHtml(meta.ImageDescription?.value||"")} ${stripHtml(meta.Description?.value||"")}`.toLowerCase();
  const exactTitle=exactWordMatchesTitle(raw,p.title||"");
  const exactDescription=norm&&new RegExp(`(^|[^a-z])${norm}([^a-z]|$)`,"i").test(desc);
  if(!exactTitle&&!exactDescription)return null;
  const artistRaw=meta.AttributionName?.value||meta.Artist?.value||meta.Credit?.value||"";
  const label=cleanSpeakerName(artistRaw);if(!label)return null;
  const group=commonsGroupFromBlob(blob);if(!group)return null;
  const rule=curatedSpeakerRule(artistRaw);
  const license=stripHtml(meta.LicenseShortName?.value||meta.UsageTerms?.value||"");
  if(!license||/all rights reserved|no license/i.test(license))return null;
  const isShtooka=/shtooka/i.test(blob);
  return {
    url:playable.url,sources:playable.sources,label,
    accent:group==="US"?"American":group==="UK"?"British":"South African",
    group,style:rule?.style||"academic",voiceRole:rule?.role||null,
    qualityTag:rule?.quality||(isShtooka?"Shtooka learning recording":"Verified human pronunciation"),
    license,source:rule?.source||(isShtooka?"Shtooka / Wikimedia Commons":"Wikimedia Commons"),
    attributionUrl:`https://commons.wikimedia.org/wiki/${encodeURIComponent(String(p.title||"").replace(/ /g,"_"))}`,
    mime:playable.mime,bitrate:playable.bitrate,text:raw,
    speakerId:rule?.id||label.toLowerCase().replace(/[^a-z0-9]+/g,"-")
  }
}
async function fetchExactCommonsAudio(raw){
  const safe=String(raw||"").trim();
  if(!safe||safe.length>60)return [];
  const titles=[
    `File:En-uk-${safe}.ogg`,`File:En-uk-${safe}-1.ogg`,`File:En-uk-${safe}-2.ogg`,
    `File:En-gb-${safe}.ogg`,
    `File:En-us-${safe}.ogg`,`File:En-us-${safe}-1.ogg`,`File:En-us-${safe}-2.ogg`,
    `File:En-za-${safe}.ogg`
  ];
  try{
    const url=`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join("|"))}&prop=videoinfo&viprop=url%7Cderivatives%7Cextmetadata&format=json&origin=*`;
    const r=await fetch(url,{mode:"cors",cache:"no-store"});if(!r.ok)return [];
    const j=await r.json();
    return Object.values(j.query?.pages||{}).map(p=>commonsPageToAudioItem(p,safe)).filter(Boolean)
  }catch{return []}
}
async function fetchCommonsAudio(word){
  const raw=String(word||"").trim();if(!raw)return [];
  const cached=typeof voiceLibraryCacheGet==="function"?voiceLibraryCacheGet(raw):null;
  if(cached?.length)return sortHumanAudio(cached);

  const found=[];const seen=new Set();
  const direct=await fetchExactCommonsAudio(raw);
  for(const item of direct){
    if(item?.url&&!seen.has(item.url)){seen.add(item.url);found.push(item)}
  }

  const speakerConfig=(typeof VOICE_LIBRARY!=="undefined"?VOICE_LIBRARY.speakers:[])||[];
  const prefixes=[...new Set(speakerConfig.flatMap(s=>s.searchPrefixes||[]))];
  const queries=[...prefixes.map(p=>`intitle:${p}${raw}`),...prefixes.map(p=>`intitle:${p}${raw}-`),`English pronunciation "${raw}"`];

  for(const q of queries){
    if(found.length>=12)break;
    try{
      const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=16&prop=videoinfo&viprop=url%7Cderivatives%7Cextmetadata&format=json&origin=*`;
      const r=await fetch(url,{mode:"cors",cache:"no-store"});if(!r.ok)continue;
      const j=await r.json();
      for(const p of Object.values(j.query?.pages||{})){
        const item=commonsPageToAudioItem(p,raw);
        if(!item?.url||seen.has(item.url))continue;
        seen.add(item.url);found.push(item)
      }
    }catch{}
  }
  const result=sortHumanAudio(dedupeAudio(found)).slice(0,20);
  if(result.length&&typeof voiceLibraryCacheSet==="function")voiceLibraryCacheSet(raw,result);
  return result
}
async function warmVoiceLibrary(words=[]){
  const unique=[...new Set(words.map(w=>String(w||"").trim().toLowerCase()).filter(Boolean))].slice(0,10);
  for(const word of unique){
    try{
      const items=await fetchCommonsAudio(word);
      if(items[0]?.url&&typeof voiceLibraryCacheAudio==="function")voiceLibraryCacheAudio(items[0].url)
    }catch{}
    await new Promise(r=>setTimeout(r,120))
  }
}
function dedupeAudio(items){
  const seen=new Set();
  return items.filter(x=>{
    const key=(x.url||"")+"|"+(x.label||"")+"|"+(x.group||"")+"|"+(x.style||"");
    return x.url&&!seen.has(key)&&(seen.add(key),true)
  })
}
function buildVoiceProfiles(items){
  const pool=sortHumanAudio(items);
  const usedSpeakers={US:new Set(),UK:new Set(),ZA:new Set()};
  const pick=(group,style)=>{
    const candidates=pool.filter(x=>x.group===group&&x.style===style&&cleanSpeakerName(x.label||""));
    const chosen=candidates.find(x=>!usedSpeakers[group].has(cleanSpeakerName(x.label).toLowerCase()))||null;
    if(chosen)usedSpeakers[group].add(cleanSpeakerName(chosen.label).toLowerCase());
    return chosen
  };
  const byRole=(role)=>pool.find(x=>x.voiceRole===role&&!usedSpeakers[x.group]?.has(cleanSpeakerName(x.label).toLowerCase()))||null;
  const takeRole=(role,group,style)=>{
    const exact=byRole(role);
    if(exact){usedSpeakers[group].add(cleanSpeakerName(exact.label).toLowerCase());return exact}
    return pick(group,style)
  };
  return [
    {group:"US",style:"street",slot:"American Street",ar:"أمريكي شوارع",item:takeRole("American Street","US","street")},
    {group:"US",style:"academic",slot:"American Academic 1",ar:"أمريكي أكاديمي 1",item:takeRole("American Academic 1","US","academic")},
    {group:"US",style:"academic",slot:"American Academic 2",ar:"أمريكي أكاديمي 2",item:takeRole("American Academic 2","US","academic")},
    {group:"UK",style:"street",slot:"British Street",ar:"بريطاني شوارع",item:takeRole("British Street","UK","street")},
    {group:"UK",style:"academic",slot:"British Academic 1",ar:"بريطاني أكاديمي 1",item:takeRole("British Academic 1","UK","academic")},
    {group:"UK",style:"academic",slot:"British Academic 2",ar:"بريطاني أكاديمي 2",item:takeRole("British Academic 2","UK","academic")},
    {group:"ZA",style:"academic",slot:"South African Academic",ar:"جنوب أفريقيا أكاديمي",item:takeRole("South African Academic","ZA","academic")}
  ]
}
function updateAccentTabCounts(container,profiles){
  const selector=container.id==="wordAudioList"?"[data-word-accent]":"[data-accent-filter]";
  const available=g=>profiles.filter(p=>p.group===g&&p.item).length;
  const ar=state.settings.lang==="ar";
  document.querySelectorAll(selector).forEach(btn=>{
    const key=btn.dataset.wordAccent||btn.dataset.accentFilter;
    if(key==="all"){btn.textContent=ar?"الكل 7":"All 7";return}
    const target=key==="US"||key==="UK"?3:1;
    const base=ar?(key==="US"?"أمريكي":key==="UK"?"بريطاني":"جنوب أفريقيا"):(key==="US"?"American":key==="UK"?"British":"South Africa");
    btn.textContent=`${base} ${available(key)}/${target}`
  })
}
function renderAudioItems(container,items,kind){
  container._audioItems=items;
  const context=container.id==="wordAudioList"?"word":"lesson";
  const ar=state.settings.lang==="ar";
  const profiles=buildVoiceProfiles(items);
  const groups=[
    {id:"US",title:ar?"الإنجليزية الأمريكية":"American English",sub:ar?"شوارع + صوتان أكاديميان":"Street + 2 academic"},
    {id:"UK",title:ar?"الإنجليزية البريطانية":"British English",sub:ar?"شوارع + صوتان أكاديميان":"Street + 2 academic"},
    {id:"ZA",title:ar?"إنجليزية جنوب أفريقيا":"South African English",sub:ar?"أكاديمي فقط":"Academic only"}
  ];

  container.innerHTML=groups.map(group=>{
    const slots=profiles.filter(p=>p.group===group.id);
    return `<section class="audio-group-section" data-audio-section="${group.id}">
      <div class="audio-group-title"><div><strong>${group.title}</strong><small>${group.sub}</small></div><span>${slots.filter(s=>s.item).length}/${slots.length}</span></div>
      <div class="audio-group-list">
        ${slots.map((profile,idx)=>{
          const a=profile.item;
          const role=ar?profile.ar:profile.slot;
          if(!a)return `<div class="audio-item unavailable">
            <span class="audio-play disabled">×</span>
            <div class="speaker-copy"><strong class="speaker-name">${esc(role)}</strong><small class="speaker-accent">${ar?"غير متاح لهذه الكلمة أو الجملة":"Not available for this word or sentence"}</small></div>
            <span class="audio-source muted">Human only</span>
          </div>`;
          const speaker=speakerDisplayName(a,idx);
          return `<div class="audio-item" data-audio-group="${group.id}">
            <button class="audio-play" data-audio-url="${esc(a.url)}" aria-label="Play ${esc(speaker)}">▶</button>
            <div class="speaker-copy">
              <strong class="speaker-name">${esc(role)} · ${esc(speaker)}</strong>
              <small class="speaker-accent">${esc(accentFullLabel(a.accent,a.group))} · ${a.style==="street"?(ar?"طبيعي يومي":"Conversational"):(ar?"واضح للتعلم":"Academic / clear")}</small>
              <small class="speaker-quality">${esc(a.qualityTag||"Curated human recording")}</small>
              <small class="speaker-license">${esc(a.source||kind)} · ${esc(a.license||"Open license")}${a.attributionUrl?` · <a href="${esc(a.attributionUrl)}" target="_blank" rel="noopener">source</a>`:""}</small>
            </div>
            <span class="audio-source">Human</span>
          </div>`
        }).join("")}
      </div>
    </section>`
  }).join("");

  container.querySelectorAll("[data-audio-url]").forEach(b=>b.addEventListener("click",()=>{
    const url=b.dataset.audioUrl;
    const item=items.find(x=>x.url===url)||null;
    if(context==="lesson"&&item){
      currentHumanModel=item;
      if(item.text){
        activeTranscriptText=item.text;
        highlightTranscript(item.text);
      }
    }
    playRepeated(url,context,item)
  }));
  updateAccentTabCounts(container,profiles)
}
function applyAudioAccentFilter(group,containerId){
  const c=document.getElementById(containerId);if(!c)return;
  c.querySelectorAll("[data-audio-section]").forEach(section=>{
    section.classList.toggle("hidden",group!=="all"&&section.dataset.audioSection!==group)
  })
}
function stopActiveAudio(){
  if(activeAudio){
    activeAudio.pause();
    try{activeAudio.currentTime=0}catch{}
    activeAudio.src="";
    activeAudio=null
  }
}
function replayLastAudio(context="lesson"){
  const last=lastPlayedByContext[context];
  if(!last){toast(state.settings.lang==="ar"?"شغّل صوتًا أولًا.":"Play a voice first.");return}
  playRepeated(last.url,context,last.item)
}
function playRepeated(url,context="lesson",item=null){
  if(!url){toast(state.settings.lang==="ar"?"لم يتم العثور على ملف صوت صالح.":"No playable audio file was found.");return}
  stopActiveAudio();
  const repeatId=context==="word"?"wordRepeat":"humanRepeat";
  const speedId=context==="word"?"wordSpeed":"humanSpeed";
  const rawRepeat=document.getElementById(repeatId)?.value||"1";
  const repeatForever=rawRepeat==="loop";
  const repeat=repeatForever?Infinity:Math.max(1,+rawRepeat||1);
  const speed=+(document.getElementById(speedId)?.value||1);
  lastPlayedByContext[context]={url,item};
  if(typeof voiceLibraryCacheAudio==="function")voiceLibraryCacheAudio(url);
  let count=0;
  const a=new Audio();
  activeAudio=a;
  a.preload="auto";
  a.src=url;
  a.playbackRate=speed;
  a.onloadedmetadata=()=>{a.playbackRate=speed};
  a.onended=()=>{
    count++;
    if(repeatForever||count<repeat){
      try{a.currentTime=0}catch{}
      a.playbackRate=speed;
      const p=a.play();
      if(p&&typeof p.catch==="function")p.catch(()=>toast(state.settings.lang==="ar"?"تعذر تكرار التسجيل. اضغط تشغيل مرة أخرى.":"Repeat was blocked. Tap play again."))
    }
  };
  a.onerror=()=>toast(state.settings.lang==="ar"?"تعذر تشغيل هذا التسجيل. جرّب متحدثًا آخر.":"This recording could not be played. Try another speaker.");
  const attempt=a.play();
  if(attempt&&typeof attempt.catch==="function"){
    attempt.catch(()=>toast(state.settings.lang==="ar"?"اضغط تشغيل مرة أخرى. المتصفح منع التشغيل الأول.":"Tap play again. The browser blocked the first playback."))
  }
  if(context==="lesson"){adjustSkill("listening",.3);state.attempts.listening++;saveState()}
}
function renderLessonTranscript(){
  const el=document.getElementById("lessonTranscript");
  if(!el||!currentUnit)return;
  const sentences=sentenceCandidates();
  el.innerHTML=sentences.map((sentence,i)=>{
    const parts=sentence.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);
    const html=parts.map(p=>/^[A-Za-z][A-Za-z'-]*$/.test(p)
      ?`<span class="transcript-word" data-transcript-word="${esc(p.toLowerCase())}">${esc(p)}</span>`
      :esc(p)).join("");
    return `<div class="transcript-row" data-transcript-row="${i}">
      <button class="transcript-play" data-transcript-play="${i}" aria-label="Play sentence">▶</button>
      <div class="transcript-text">${html}</div>
      <span class="transcript-repeat">↺</span>
    </div>`
  }).join("");
  el.querySelectorAll("[data-transcript-play]").forEach(b=>b.addEventListener("click",e=>{
    e.stopPropagation();
    playTranscriptSentence(sentences[+b.dataset.transcriptPlay],+b.dataset.transcriptPlay)
  }));
  el.querySelectorAll("[data-transcript-row]").forEach(row=>row.addEventListener("click",()=>{
    playTranscriptSentence(sentences[+row.dataset.transcriptRow],+row.dataset.transcriptRow)
  }));
  el.querySelectorAll("[data-transcript-word]").forEach(w=>w.addEventListener("click",e=>{
    e.stopPropagation();openWord(w.dataset.transcriptWord)
  }))
}
async function renderListenChoose(){
  const stage=document.getElementById("listenChooseStage");
  if(!stage||!currentUnit)return;
  const pool=(currentUnit.vocab||[]).slice(0,Math.min(4,currentUnit.vocab.length));
  if(pool.length<2){
    stage.innerHTML='<div class="empty-state small">Not enough vocabulary for this exercise.</div>';
    return
  }
  const target=pool[0];
  const options=[...pool].sort(()=>Math.random()-.5);
  stage.innerHTML=`
    <div class="listen-prompt">
      <button id="listenChoosePlay" class="listen-big-play" aria-label="Play human recording">▶</button>
      <div><strong>${state.settings.lang==="ar"?"اسمع الكلمة ثم اختر معناها":"Listen to the word, then choose its meaning"}</strong>
      <small id="listenChooseVoiceLabel">${state.settings.lang==="ar"?"جارٍ البحث عن متحدث بشري…":"Finding a human speaker…"}</small></div>
    </div>
    <div class="listen-options">
      ${options.map(([w,ar],i)=>`<button class="listen-option" data-listen-opt="${esc(w)}"><span dir="rtl">${esc(ar)}</span></button>`).join("")}
    </div>
    <div id="listenChooseFeedback" class="mini-result hidden"></div>`;

  let voice=null;
  const findVoice=async()=>{
    if(voice)return voice;
    const recordings=await fetchCommonsAudio(target[0],false);
    const profiles=buildVoiceProfiles(recordings);
    voice=profiles.find(p=>p.item&&p.group==="US"&&p.style==="academic")?.item ||
          profiles.find(p=>p.item&&p.group==="UK"&&p.style==="academic")?.item ||
          profiles.find(p=>p.item&&p.group==="ZA")?.item ||
          recordings[0]||null;
    const label=document.getElementById("listenChooseVoiceLabel");
    if(label){
      label.textContent=voice
        ?`${speakerDisplayName(voice)} · ${accentFullLabel(voice.accent,voice.group)} · Human`
        :(state.settings.lang==="ar"?"لا يوجد تسجيل بشري متاح لهذه الكلمة":"No human recording available for this word");
    }
    return voice
  };
  const playBtn=document.getElementById("listenChoosePlay");
  playBtn.onclick=async()=>{
    playBtn.classList.add("loading");
    const v=await findVoice();
    playBtn.classList.remove("loading");
    if(v)playRepeated(v.url,"lesson",v);
    else toast(state.settings.lang==="ar"?"لا يوجد تسجيل بشري متاح.":"No human recording is available.")
  };
  findVoice();

  stage.querySelectorAll("[data-listen-opt]").forEach(btn=>btn.onclick=()=>{
    const correct=btn.dataset.listenOpt===target[0];
    stage.querySelectorAll("[data-listen-opt]").forEach(x=>x.disabled=true);
    btn.classList.add(correct?"correct":"wrong");
    if(!correct)stage.querySelector(`[data-listen-opt="${CSS.escape(target[0])}"]`)?.classList.add("correct");
    const fb=document.getElementById("listenChooseFeedback");
    fb.classList.remove("hidden");
    fb.textContent=correct
      ?(state.settings.lang==="ar"?`صحيح ✓ الكلمة هي: ${target[0]}`:`Correct ✓ The word was: ${target[0]}`)
      :(state.settings.lang==="ar"?`الإجابة الصحيحة: ${target[1]}`:`Correct meaning: ${target[1]}`);
    adjustSkill("listening",correct?1.5:-.5);addXP(correct?5:1)
  })
}

function highlightTranscript(text){
  const el=document.getElementById("lessonTranscript");if(!el)return;
  const norm=normalizedAudioText(text);
  el.querySelectorAll("[data-transcript-row]").forEach(row=>{
    row.classList.toggle("active",normalizedAudioText(row.querySelector(".transcript-text")?.textContent||"")===norm)
  })
}
async function playTranscriptSentence(text,index){
  activeTranscriptText=text;
  highlightTranscript(text);
  const row=document.querySelector(`[data-transcript-row="${index}"]`);
  row?.classList.add("loading");
  const found=await fetchCommonsAudio(text,false);
  row?.classList.remove("loading");
  const preferred=found.find(x=>x.group==="US"&&x.style==="street")||
    found.find(x=>x.group==="UK"&&x.style==="street")||found[0];
  if(!preferred){
    toast(state.settings.lang==="ar"?"لا يوجد تسجيل بشري مطابق لهذه الجملة.":"No exact human recording is available for this sentence.");
    return
  }
  currentHumanModel=preferred;
  playRepeated(preferred.url,"lesson",preferred)
}
