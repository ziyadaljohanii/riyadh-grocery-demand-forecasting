let lessonHumanRecordings=[];
let currentHumanModel=null;
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
  renderPassage();renderVocab();renderGrammar();renderQuiz();renderSpeakWrite();renderShadow();
  document.getElementById("humanAudioList").innerHTML='<div class="empty-state small">Looking for real human recordings…</div>';
  document.getElementById("passageArabic").textContent=currentUnit.arabic;
  document.getElementById("passageArabic").classList.add("hidden");
  loadLessonImage(currentUnit.imageQuery);
  readingStart=Date.now();clearInterval(readingTick);readingTick=setInterval(updateReadingTimer,1000);
  showLessonStep(0);
  setTimeout(()=>findHumanLessonAudio(true),180);
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
  const a=String(accent).toLowerCase();
  if(/(^|\b)(us|american|united states)(\b|$)/.test(a))return "US";
  if(/(^|\b)(uk|gb|british|england|english england)(\b|$)/.test(a))return "UK";
  return "Other";
}
function sentenceCandidates(){
  return currentUnit.passage.split(/(?<=[.!?])\s+/)
    .map(s=>s.trim()).filter(Boolean)
    .sort((a,b)=>Math.abs(a.split(/\s+/).length-8)-Math.abs(b.split(/\s+/).length-8));
}
async function findHumanLessonAudio(silent=false){
  const list=document.getElementById("humanAudioList");
  list.innerHTML='<div class="empty-state small">Searching open human-recording libraries…</div>';
  let found=[];
  for(const text of sentenceCandidates()){
    const r=await fetchTatoebaRecordings(text);
    if(r.length){found.push(...r.map(x=>({...x,text})));if(found.length>=9)break}
  }
  if(found.length){
    lessonHumanRecordings=dedupeAudio(found).slice(0,12);
    currentHumanModel=lessonHumanRecordings[0]||null;
    if(currentHumanModel?.text)document.getElementById("shadowSentence").textContent=currentHumanModel.text;
    renderAudioItems(list,lessonHumanRecordings,"tatoeba");
    applyAudioAccentFilter("all","humanAudioList");
    if(!silent)toast(`${lessonHumanRecordings.length} human recording${lessonHumanRecordings.length===1?"":"s"} found`);
    return lessonHumanRecordings;
  }
  const keyword=currentUnit.vocab[0]?.[0];
  const commons=keyword?await fetchCommonsAudio(keyword):[];
  if(commons.length){
    lessonHumanRecordings=commons.map(x=>({...x,text:keyword}));
    currentHumanModel=null;
    list.innerHTML='<div class="empty-state small">No exact sentence recording was found. These are real human word recordings from this lesson.</div><div id="lessonWordAudio"></div>';
    renderAudioItems(document.getElementById("lessonWordAudio"),lessonHumanRecordings,"commons");
    if(!silent)toast("No exact sentence model found. Human word recordings are available.")
    return lessonHumanRecordings;
  }
  lessonHumanRecordings=[];currentHumanModel=null;
  list.innerHTML='<div class="empty-state small">No matching reusable human recording was found. Synthetic speech will not be used as a replacement.</div>';
  if(!silent)toast("No matching human recording found");
  return [];
}
async function playShadowHuman(){
  if(!currentHumanModel){
    await findHumanLessonAudio(true);
  }
  if(!currentHumanModel){
    toast("No exact human sentence recording is available for this lesson yet.");
    return;
  }
  document.getElementById("shadowSentence").textContent=currentHumanModel.text||document.getElementById("shadowSentence").textContent;
  playRepeated(currentHumanModel.url)
}
async function fetchTatoebaRecordings(text){
  try{
    const q=encodeURIComponent('"'+text+'"');
    const url=`https://api.tatoeba.org/v1/sentences?lang=eng&q=${q}&has_audio=yes&include=audios&limit=20`;
    const res=await fetch(url);if(!res.ok)throw new Error();
    const j=await res.json();
    const rows=j.data||j.sentences||j.results||[];
    const out=[];
    for(const row of rows){
      const sentence=row.text||row.sentence||"";
      if(sentence.trim().toLowerCase()!==text.trim().toLowerCase())continue;
      const audios=Array.isArray(row.audios)?row.audios:Array.isArray(row.audio)?row.audio:[];
      for(const a of audios){
        const id=a.id||a.audio_id;
        const url=a.url||(id?`https://tatoeba.org/audio/download/${id}`:"");
        if(!url)continue;
        const accent=a.accent||a.variant||a.user?.country||"Accent not specified";
        out.push({
          url,
          label:a.author||a.username||a.user?.username||"Tatoeba contributor",
          accent,
          group:accentGroup(accent),
          license:a.license||"Tatoeba contribution",
          source:"Tatoeba",
          text:sentence
        })
      }
    }
    return out
  }catch{return []}
}
async function fetchCommonsAudio(word){
  const queries=[
    `intitle:En-us-${word}`,
    `intitle:En-uk-${word}`,
    `intitle:En-gb-${word}`,
    `intitle:LL-Q1860 ${word}`,
    `English pronunciation ${word}`
  ];
  const found=[];const seen=new Set();
  for(const q of queries){
    try{
      const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=18&prop=imageinfo&iiprop=url%7Cextmetadata&format=json&origin=*`;
      const r=await fetch(url);if(!r.ok)continue;
      const j=await r.json();const pages=Object.values(j.query?.pages||{});
      for(const p of pages){
        const info=p.imageinfo?.[0];
        if(!info?.url||seen.has(info.url)||!(/\.(ogg|oga|wav|mp3)$/i.test(info.url)))continue;
        const meta=info.extmetadata||{};
        const blob=`${p.title} ${stripHtml(meta.ImageDescription?.value||"")} ${stripHtml(meta.Description?.value||"")} ${stripHtml(meta.Categories?.value||"")}`.toLowerCase();
        if(/synthetic|text-to-speech|tts|speech synthes/.test(blob))continue;
        const norm=word.toLowerCase().replace(/[^a-z]/g,"");
        if(!p.title.toLowerCase().replace(/[^a-z]/g,"").includes(norm))continue;
        seen.add(info.url);
        let accent="Accent not specified";
        if(/en[- _]?(us)|american|united states/.test(blob))accent="US";
        else if(/en[- _]?(uk|gb)|british|england/.test(blob))accent="UK";
        else if(/en[- _]?au|austral/.test(blob))accent="Australian";
        else if(/en[- _]?ca|canad/.test(blob))accent="Canadian";
        const source=/lingua libre|ll-q/.test(blob)?"Lingua Libre / Wikimedia":"Wikimedia Commons";
        found.push({
          url:info.url,
          label:stripHtml(meta.Artist?.value||p.title.replace(/^File:/,"Human contributor")),
          accent,
          group:accentGroup(accent),
          license:stripHtml(meta.LicenseShortName?.value||"Open license"),
          source,
          text:word
        })
      }
    }catch{}
  }
  return dedupeAudio(found).slice(0,18)
}
function dedupeAudio(items){
  const seen=new Set();return items.filter(x=>x.url&&!seen.has(x.url)&&(seen.add(x.url),true))
}
function renderAudioItems(container,items,kind){
  container._audioItems=items;
  container.innerHTML=items.map((a,i)=>`
    <div class="audio-item" data-audio-group="${a.group||accentGroup(a.accent)}">
      <button class="audio-play" data-audio-i="${i}" aria-label="Play human recording">▶</button>
      <div>
        <strong>${esc(a.label||"Human speaker")}</strong>
        <small>${esc(a.accent||"Accent not specified")} · ${esc(a.license||"Open license")}</small>
      </div>
      <span class="audio-source">Human · ${esc(a.source||kind)}</span>
    </div>`).join("");
  container.querySelectorAll("[data-audio-i]").forEach(b=>b.addEventListener("click",()=>playRepeated(items[+b.dataset.audioI].url)))
}
function applyAudioAccentFilter(group,containerId){
  const c=document.getElementById(containerId);if(!c)return;
  c.querySelectorAll("[data-audio-group]").forEach(el=>el.classList.toggle("hidden",group!=="all"&&el.dataset.audioGroup!==group))
}
function playRepeated(url){
  if(activeAudio){activeAudio.pause();activeAudio=null}
  const repeat=+(document.getElementById("humanRepeat")?.value||1);
  const speed=+(document.getElementById("humanSpeed")?.value||1);
  let count=0;
  const play=()=>{
    const a=new Audio(url);activeAudio=a;a.playbackRate=speed;
    a.onended=()=>{count++;if(count<repeat)play()};
    a.play().catch(()=>toast("This human recording could not be played in your browser."))
  };
  play();adjustSkill("listening",.3);state.attempts.listening++;saveState()
}