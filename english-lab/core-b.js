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
  const a=String(accent||"").toLowerCase();
  if(/(^|\b)(us|usa|american|united states)(\b|$)/.test(a))return "US";
  if(/(^|\b)(uk|gb|british|united kingdom|england|scotland|wales|northern ireland)(\b|$)/.test(a))return "UK";
  return "Other";
}
function accentFullLabel(accent="",group){
  const a=String(accent||"").toLowerCase();
  const g=group||accentGroup(accent);
  if(g==="US")return "American English";
  if(g==="UK")return "British English";
  if(/austral/.test(a))return "Australian English";
  if(/canad/.test(a))return "Canadian English";
  if(/new zealand|nz\b/.test(a))return "New Zealand English";
  if(/irish|ireland/.test(a))return "Irish English";
  if(/south africa/.test(a))return "South African English";
  if(accent&&accent!=="Accent not specified")return accent;
  return "Other English accent";
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
function audioQualityScore(a){
  let score=0;
  const u=String(a.url||"").toLowerCase();
  if(/\.mp3(\?|$)/.test(u)||/audio\/mpeg/.test(String(a.mime||"")))score+=8;
  else if(/\.wav(\?|$)/.test(u))score+=5;
  if(a.group==="US"||a.group==="UK")score+=5;
  if(a.accent&&a.accent!=="Accent not specified")score+=3;
  if(cleanSpeakerName(a.label||""))score+=3;
  if(/wikimedia|lingua libre/i.test(a.source||""))score+=2;
  if(/tatoeba/i.test(a.source||""))score+=1;
  return score;
}
function sortHumanAudio(items){
  const order={US:0,UK:1,Other:2};
  return [...items].sort((a,b)=>
    (order[a.group]??3)-(order[b.group]??3) ||
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
  list.innerHTML='<div class="empty-state small">Searching open human-recording libraries…</div>';
  let found=[];
  for(const text of sentenceCandidates()){
    const r=await fetchTatoebaRecordings(text);
    if(r.length){found.push(...r.map(x=>({...x,text})));if(found.length>=9)break}
  }
  if(found.length){
    lessonHumanRecordings=sortHumanAudio(dedupeAudio(found)).slice(0,12);
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
    lessonHumanRecordings=sortHumanAudio(commons.map(x=>({...x,text:keyword})));
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
function normalizedAudioText(s=""){
  return String(s).trim().toLowerCase().replace(/[.!?]+$/,"").replace(/\s+/g," ")
}
async function fetchTatoebaRecordings(text){
  try{
    const q=encodeURIComponent('"'+text+'"');
    const url=`https://api.tatoeba.org/v1/sentences?lang=eng&q=${q}&has_audio=yes&include=audios&limit=20`;
    const res=await fetch(url,{mode:"cors"});if(!res.ok)throw new Error("Tatoeba search failed");
    const j=await res.json();
    const rows=j.data||j.sentences||j.results||[];
    const out=[];
    for(const row of rows){
      const sentence=row.text||row.sentence||"";
      if(normalizedAudioText(sentence)!==normalizedAudioText(text))continue;
      const sentenceId=row.id||row.sentence_id;
      if(!sentenceId)continue;
      const audios=Array.isArray(row.audios)?row.audios:Array.isArray(row.audio)?row.audio:[];
      const baseUrl=`https://audio.tatoeba.org/sentences/eng/${sentenceId}.mp3`;
      if(audios.length){
        for(const a of audios){
          const accent=a.accent||a.variant||a.user?.country||a.country||"Accent not specified";
          const license=a.license||a.audio_license||a.user?.audio_license||a.user?.license||"";
          if(!license||/no license|all rights reserved/i.test(String(license)))continue;
          out.push({
            url:baseUrl,
            label:a.author||a.username||a.user?.username||a.user?.name||"",
            accent,
            group:accentGroup(accent),
            license,
            source:"Tatoeba",
            mime:"audio/mpeg",
            text:sentence
          })
        }
      }
    }
    return dedupeAudio(out)
  }catch{return []}
}
function bestCommonsPlayable(info){
  const derivatives=Array.isArray(info?.derivatives)?info.derivatives:[];
  const mp3=derivatives.find(d=>{
    const type=String(d.type||"").toLowerCase();
    const key=String(d.transcodekey||d.shorttitle||"").toLowerCase();
    const src=String(d.src||d.url||"").toLowerCase();
    return type.includes("audio/mpeg")||key.includes("mp3")||src.includes(".mp3")
  });
  if(mp3?.src||mp3?.url)return mp3.src||mp3.url;
  const source=info?.url||"";
  if(/\.(mp3|wav)(\?|$)/i.test(source))return source;
  const probe=document.createElement("audio");
  if(/\.(ogg|oga)(\?|$)/i.test(source)&&probe.canPlayType("audio/ogg"))return source;
  if(/\.flac(\?|$)/i.test(source)&&probe.canPlayType("audio/flac"))return source;
  return ""
}
async function fetchCommonsAudio(word){
  const queries=[
    `intitle:En-us-${word}`,
    `intitle:En-us-${word}-`,
    `intitle:En-uk-${word}`,
    `intitle:En-uk-${word}-`,
    `intitle:En-gb-${word}`,
    `intitle:En-au-${word}`,
    `intitle:En-ca-${word}`,
    `intitle:En-nz-${word}`,
    `intitle:LL-Q1860 ${word}`,
    `English pronunciation ${word}`
  ];
  const found=[];const seen=new Set();

  const tatoebaWord=await fetchTatoebaRecordings(word);
  for(const t of tatoebaWord){
    if(!seen.has(t.url)){seen.add(t.url);found.push(t)}
  }

  for(const q of queries){
    try{
      const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=12&prop=videoinfo&viprop=url%7Cderivatives%7Cextmetadata&format=json&origin=*`;
      const r=await fetch(url,{mode:"cors"});if(!r.ok)continue;
      const j=await r.json();const pages=Object.values(j.query?.pages||{});
      for(const p of pages){
        const info=p.videoinfo?.[0];
        if(!info)continue;
        const playable=bestCommonsPlayable(info);
        if(!playable||seen.has(playable))continue;
        const meta=info.extmetadata||{};
        const blob=`${p.title} ${stripHtml(meta.ImageDescription?.value||"")} ${stripHtml(meta.Description?.value||"")} ${stripHtml(meta.Categories?.value||"")}`.toLowerCase();
        if(/synthetic|text-to-speech|\btts\b|speech synthes/.test(blob))continue;
        const norm=word.toLowerCase().replace(/[^a-z]/g,"");
        const rawTitle=p.title.replace(/^File:/i,"").replace(/\.(ogg|oga|wav|mp3|flac)$/i,"").toLowerCase();
        const strippedTitle=rawTitle
          .replace(/^en[- _]?(us|uk|gb|au|ca|nz|ie)[- _]?/,"")
          .replace(/[- _]?\d+$/,"")
          .replace(/[^a-z]/g,"");
        const exactTitle=strippedTitle===norm;
        const descriptionText=`${stripHtml(meta.ImageDescription?.value||"")} ${stripHtml(meta.Description?.value||"")}`.toLowerCase();
        const exactDescription=new RegExp(`(^|[^a-z])${norm}([^a-z]|$)`,"i").test(descriptionText);
        if(!exactTitle&&!exactDescription)continue;
        seen.add(playable);
        let accent="Accent not specified";
        if(/en[- _]?(us)|american|united states/.test(blob))accent="American";
        else if(/en[- _]?(uk|gb)|british|united kingdom|england|scotland|wales/.test(blob))accent="British";
        else if(/en[- _]?au|austral/.test(blob))accent="Australian";
        else if(/en[- _]?ca|canad/.test(blob))accent="Canadian";
        else if(/en[- _]?nz|new zealand/.test(blob))accent="New Zealand";
        else if(/irish|ireland/.test(blob))accent="Irish";
        const source=/lingua libre|ll-q/.test(blob)?"Lingua Libre / Wikimedia":"Wikimedia Commons MP3";
        const artist=meta.AttributionName?.value||meta.Artist?.value||meta.Credit?.value||"";
        found.push({
          url:playable,
          label:cleanSpeakerName(artist),
          accent,
          group:accentGroup(accent),
          license:stripHtml(meta.LicenseShortName?.value||"Open license"),
          source,
          mime:/\.mp3(\?|$)/i.test(playable)?"audio/mpeg":"",
          text:word
        })
      }
    }catch{}
  }
  return sortHumanAudio(dedupeAudio(found)).slice(0,18)
}
function dedupeAudio(items){
  const seen=new Set();
  return items.filter(x=>{
    const key=(x.url||"")+"|"+(x.label||"")+"|"+(x.group||"");
    return x.url&&!seen.has(key)&&(seen.add(key),true)
  })
}
function updateAccentTabCounts(container,items){
  const selector=container.id==="wordAudioList"?"[data-word-accent]":"[data-accent-filter]";
  const counts={
    all:items.length,
    US:items.filter(x=>x.group==="US").length,
    UK:items.filter(x=>x.group==="UK").length,
    Other:items.filter(x=>x.group==="Other").length
  };
  const ar=state.settings.lang==="ar";
  document.querySelectorAll(selector).forEach(btn=>{
    const key=btn.dataset.wordAccent||btn.dataset.accentFilter;
    const base=ar
      ?(key==="all"?"الكل":key==="US"?"أمريكي":key==="UK"?"بريطاني":"لهجات أخرى")
      :(key==="all"?"All":key==="US"?"American":key==="UK"?"British":"Other");
    btn.textContent=`${base} ${counts[key]||0}`
  })
}
function renderAudioItems(container,items,kind){
  const sorted=sortHumanAudio(items);
  container._audioItems=sorted;
  const context=container.id==="wordAudioList"?"word":"lesson";
  const ar=state.settings.lang==="ar";
  const groups=[
    {id:"US",title:ar?"الإنجليزية الأمريكية":"American English",sub:ar?"متحدثون أمريكيون":"US speakers"},
    {id:"UK",title:ar?"الإنجليزية البريطانية":"British English",sub:ar?"متحدثون بريطانيون":"UK speakers"},
    {id:"Other",title:ar?"لهجات إنجليزية أخرى":"Other English accents",sub:ar?"أستراليا، كندا وغيرها":"Australia, Canada and more"}
  ];
  let globalIndex=0;
  container.innerHTML=groups.map(group=>{
    const groupItems=sorted.filter(a=>(a.group||accentGroup(a.accent))===group.id);
    if(!groupItems.length)return "";
    const cards=groupItems.map((a,localIndex)=>{
      const i=globalIndex++;
      const speaker=speakerDisplayName(a,localIndex);
      const accentEn=accentFullLabel(a.accent,a.group);
      const accent=ar
        ?(a.group==="US"?"American English · أمريكي":a.group==="UK"?"British English · بريطاني":accentEn+" · لهجة أخرى")
        :accentEn;
      return `
        <div class="audio-item" data-audio-group="${group.id}">
          <button class="audio-play" data-audio-url="${esc(a.url)}" aria-label="Play ${esc(speaker)}">▶</button>
          <div class="speaker-copy">
            <strong class="speaker-name">${esc(speaker)}</strong>
            <small class="speaker-accent">${esc(accent)}</small>
            <small class="speaker-license">${esc(a.source||kind)} · ${esc(a.license||"Open license")}</small>
          </div>
          <span class="audio-source">Human</span>
        </div>`
    }).join("");
    return `<section class="audio-group-section" data-audio-section="${group.id}">
      <div class="audio-group-title"><div><strong>${group.title}</strong><small>${group.sub}</small></div><span>${groupItems.length}</span></div>
      <div class="audio-group-list">${cards}</div>
    </section>`
  }).join("") || '<div class="empty-state small">No reusable human recordings were found.</div>';

  container.querySelectorAll("[data-audio-url]").forEach(b=>b.addEventListener("click",()=>playRepeated(b.dataset.audioUrl,context)));
  updateAccentTabCounts(container,sorted)
}
function applyAudioAccentFilter(group,containerId){
  const c=document.getElementById(containerId);if(!c)return;
  c.querySelectorAll("[data-audio-section]").forEach(section=>{
    section.classList.toggle("hidden",group!=="all"&&section.dataset.audioSection!==group)
  })
}
function playRepeated(url,context="lesson"){
  if(!url){toast(state.settings.lang==="ar"?"لم يتم العثور على ملف صوت صالح.":"No playable audio file was found.");return}
  if(activeAudio){activeAudio.pause();activeAudio.src="";activeAudio=null}
  const repeatId=context==="word"?"wordRepeat":"humanRepeat";
  const speedId=context==="word"?"wordSpeed":"humanSpeed";
  const repeat=+(document.getElementById(repeatId)?.value||1);
  const speed=+(document.getElementById(speedId)?.value||1);
  let count=0;
  const a=new Audio();
  activeAudio=a;
  a.preload="auto";
  a.src=url;
  a.playbackRate=speed;
  a.onended=()=>{
    count++;
    if(count<repeat){
      a.currentTime=0;
      a.playbackRate=speed;
      a.play().catch(()=>toast(state.settings.lang==="ar"?"تعذر تكرار التسجيل على هذا المتصفح.":"The browser blocked repeated playback."))
    }
  };
  a.onerror=()=>toast(state.settings.lang==="ar"?"تعذر تشغيل هذا التسجيل. جرّب متحدثًا آخر.":"This recording could not be played. Try another speaker.");
  const attempt=a.play();
  if(attempt&&typeof attempt.catch==="function"){
    attempt.catch(()=>toast(state.settings.lang==="ar"?"اضغط زر التشغيل مرة أخرى. المتصفح منع التشغيل الأول.":"Tap play again. The browser blocked the first playback."))
  }
  if(context==="lesson"){adjustSkill("listening",.3);state.attempts.listening++;saveState()}
}