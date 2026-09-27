async function openLesson(id){
  currentUnit=UNITS.find(u=>u.id===id); if(!currentUnit)return;
  setView("lesson");
  document.getElementById("lessonLevelBadge").textContent=currentUnit.level; document.getElementById("lessonTitle").textContent=currentUnit.title; document.getElementById("lessonSubtitle").textContent=currentUnit.topic;
  document.getElementById("lessonStepBar").innerHTML="<i></i>".repeat(7);
  renderPassage(); renderVocab(); renderGrammar(); renderQuiz(); renderSpeakWrite(); renderShadow(); populateSystemVoices();
  document.getElementById("humanAudioList").innerHTML='<div class="empty-state small">Tap “Find recordings” to search open human recordings.</div>';
  document.getElementById("passageArabic").textContent=currentUnit.arabic;document.getElementById("passageArabic").classList.add("hidden");
  loadLessonImage(currentUnit.imageQuery);
  readingStart=Date.now(); clearInterval(readingTick);readingTick=setInterval(updateReadingTimer,1000);
}
function renderPassage(){
  const el=document.getElementById("passageText"); const parts=currentUnit.passage.split(/(\b[A-Za-z][A-Za-z'-]*\b)/g);
  el.innerHTML=parts.map(p=>/^[A-Za-z][A-Za-z'-]*$/.test(p)?`<span class="word-token" tabindex="0" data-word="${esc(p.toLowerCase())}">${esc(p)}</span>`:esc(p)).join("");
  el.querySelectorAll(".word-token").forEach(w=>{w.addEventListener("click",()=>openWord(w.dataset.word));w.addEventListener("keydown",e=>{if(e.key==="Enter")openWord(w.dataset.word)})});
}
function updateReadingTimer(){if(!readingStart)return;const s=Math.floor((Date.now()-readingStart)/1000);document.getElementById("readingTimer").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function renderVocab(){
  document.getElementById("vocabGrid").innerHTML=currentUnit.vocab.map(([w,ar])=>`<article class="vocab-card"><h3>${w}</h3><div class="ar" dir="rtl">${ar}</div><p>Tap the word for recordings, examples and reminders.</p><div class="vocab-actions"><button class="small-btn" data-vword="${w}">🔊 Voices</button><button class="small-btn" data-vsave="${w}">+ Review</button><button class="small-btn" data-vhard="${w}">Hard</button></div></article>`).join("");
  document.querySelectorAll("[data-vword]").forEach(b=>b.addEventListener("click",()=>openWord(b.dataset.vword)));
  document.querySelectorAll("[data-vsave]").forEach(b=>b.addEventListener("click",()=>addReviewWord(b.dataset.vsave,meaningFor(b.dataset.vsave))));
  document.querySelectorAll("[data-vhard]").forEach(b=>b.addEventListener("click",()=>{state.hardWords[b.dataset.vhard]=true;addReviewWord(b.dataset.vhard,meaningFor(b.dataset.vhard),true);toast("Marked as hard")}));
}
function renderGrammar(){
  document.getElementById("grammarCard").innerHTML=`<h3>${currentUnit.grammar.title}</h3><p>${currentUnit.grammar.tip}</p><div class="grammar-example">${currentUnit.grammar.example}</div>`;
  const example=currentUnit.grammar.example.split(" "); const shuffled=[...example].sort(()=>Math.random()-.5); const sb=document.getElementById("sentenceBuilder");
  sb.innerHTML=`<h3>Sentence builder</h3><p class="muted">Tap the words in the correct order.</p><div id="builderLine" class="builder-line"></div><div class="word-bank">${shuffled.map((w,i)=>`<button data-build="${i}">${esc(w)}</button>`).join("")}</div><button id="checkBuilderBtn" class="small-btn">Check</button>`;
  let built=[]; sb.querySelectorAll("[data-build]").forEach(b=>b.addEventListener("click",()=>{built.push(b.textContent);b.disabled=true;document.getElementById("builderLine").textContent=built.join(" ")}));
  document.getElementById("checkBuilderBtn").onclick=()=>{const norm=s=>s.toLowerCase().replace(/[^a-z' ]/g,"").replace(/\s+/g," ").trim();if(norm(built.join(" "))===norm(currentUnit.grammar.example)){toast("Correct sentence ✓");addXP(5);adjustSkill("writing",1)}else{toast("Not quite. Reset and try again.");built=[];document.getElementById("builderLine").textContent="";sb.querySelectorAll("[data-build]").forEach(b=>b.disabled=false)}};
}
function renderQuiz(){
  const q=currentUnit.quiz; const el=document.getElementById("quizCard");el.innerHTML=`<h3>${q.q}</h3>${q.options.map((o,i)=>`<button class="quiz-option" data-qopt="${i}">${esc(o)}</button>`).join("")}<div id="quizFeedback"></div>`;
  el.querySelectorAll("[data-qopt]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.qopt;el.querySelectorAll(".quiz-option").forEach(x=>x.disabled=true);b.classList.add(i===q.answer?"correct":"wrong");if(i!==q.answer)el.querySelector(`[data-qopt="${q.answer}"]`)?.classList.add("correct");const ok=i===q.answer;document.getElementById("quizFeedback").textContent=ok?"Correct. Nice work.":"Not quite. Read the passage once more and look for the key detail.";state.quizHistory.push({unit:currentUnit.id,ok,at:Date.now()});adjustSkill("reading",ok?2:-1);addXP(ok?8:2);saveState()}));
}
function renderSpeakWrite(){
  document.getElementById("speakingPrompts").innerHTML=currentUnit.speaking.map((p,i)=>`<p><strong>${i+1}.</strong> ${p}</p>`).join(""); document.getElementById("writingPrompt").textContent=currentUnit.writing;document.getElementById("writingInput").value="";document.getElementById("writingFeedback").textContent="";
}
function renderShadow(){const sentence=currentUnit.passage.split(/(?<=[.!?])\s+/)[0];document.getElementById("shadowSentence").textContent=sentence;document.getElementById("shadowResult").textContent="Your result will appear here."}

function populateSystemVoices(){
  const sel=document.getElementById("systemVoiceSelect"); const fill=()=>{const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));sel.innerHTML=vs.length?vs.map((v,i)=>`<option value="${i}">${esc(v.name)} · ${esc(v.lang)}</option>`).join(""):'<option>No English system voices found</option>';sel._voices=vs}; fill();speechSynthesis.onvoiceschanged=fill;
}
function systemSpeak(text){
  if(!("speechSynthesis" in window)){toast("System speech is not supported here.");return}
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const sel=document.getElementById("systemVoiceSelect");if(sel?._voices?.length)u.voice=sel._voices[+sel.value]||sel._voices[0];u.rate=1;speechSynthesis.speak(u);
}

async function findHumanLessonAudio(){
  const list=document.getElementById("humanAudioList");list.innerHTML='<div class="empty-state small">Searching open human recordings…</div>';
  const first=currentUnit.passage.split(/(?<=[.!?])\s+/)[0];
  const recordings=await fetchTatoebaRecordings(first);
  if(recordings.length){renderAudioItems(list,recordings,"tatoeba");return}
  const keyword=currentUnit.vocab[0][0]; const commons=await fetchCommonsAudio(keyword); if(commons.length){list.innerHTML='<div class="empty-state small">No exact sentence recording found. Showing human word recordings from this lesson instead.</div>';const box=document.createElement("div");list.appendChild(box);renderAudioItems(box,commons,"commons");return}
  list.innerHTML='<div class="empty-state small">No licensed human recording was found for this lesson. Use the clearly labelled system voice fallback, or open a vocabulary word to search more recordings.</div>';
}
async function fetchTatoebaRecordings(text){
  try{
    const url=`https://api.tatoeba.org/v1/sentences?lang=eng&q=${encodeURIComponent('="'+text+'"')}&has_audio=yes&include=audios&limit=10`;
    const res=await fetch(url); if(!res.ok)throw 0; const j=await res.json();const rows=j.data||j.sentences||j.results||[];const out=[];
    for(const row of rows){const sentence=row.text||row.sentence||"";if(sentence.trim().toLowerCase()!==text.trim().toLowerCase())continue;for(const a of (row.audios||row.audio||[])){const id=a.id||a.audio_id;if(!id&&!a.url)continue;out.push({url:a.url||`https://tatoeba.org/audio/download/${id}`,label:a.author||a.username||a.user||"Tatoeba contributor",accent:a.accent||a.variant||"Accent not specified",license:a.license||"See Tatoeba attribution",source:"Tatoeba human recording"})}}
    return out.slice(0,9)
  }catch{return []}
}
async function fetchCommonsAudio(word){
  const queries=[`intitle:En-us-${word}`,`intitle:En-uk-${word}`,`intitle:En-gb-${word}`,`${word} pronunciation English`];const found=[];const seen=new Set();
  for(const q of queries){
    try{const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url%7Cextmetadata&format=json&origin=*`;const r=await fetch(url);if(!r.ok)continue;const j=await r.json();const pages=Object.values(j.query?.pages||{});
      for(const p of pages){const info=p.imageinfo?.[0];if(!info?.url||seen.has(info.url)||!(/\.(ogg|oga|wav|mp3)$/i.test(info.url)))continue;const meta=info.extmetadata||{};const blob=`${p.title} ${stripHtml(meta.ImageDescription?.value||"")} ${stripHtml(meta.Description?.value||"")}`.toLowerCase();if(blob.includes("synthetic")||blob.includes("text-to-speech")||blob.includes("tts"))continue;const norm=word.toLowerCase().replace(/[^a-z]/g,"");if(!p.title.toLowerCase().replace(/[^a-z]/g,"").includes(norm))continue;seen.add(info.url);let accent="Other/unspecified";if(/en[- _]?(us)|american/.test(blob))accent="US";else if(/en[- _]?(uk|gb)|british/.test(blob))accent="UK";else if(/en[- _]?au|austral/.test(blob))accent="Australian";else if(/en[- _]?ca|canad/.test(blob))accent="Canadian";found.push({url:info.url,label:stripHtml(meta.Artist?.value||p.title.replace(/^File:/,"")),accent,license:stripHtml(meta.LicenseShortName?.value||"Wikimedia Commons"),source:"Wikimedia human recording"})}
    }catch{}
  }
  return found.slice(0,12)
}
function renderAudioItems(container,items,kind){
  container.innerHTML=items.map((a,i)=>`<div class="audio-item"><button class="audio-play" data-audio-i="${i}">▶</button><div><strong>${esc(a.label)}</strong><small>${esc(a.accent)} · ${esc(a.license)}</small></div><span class="audio-source">${kind==="commons"?"Human · Commons":"Human · Tatoeba"}</span></div>`).join("");
  container.querySelectorAll("[data-audio-i]").forEach(b=>b.addEventListener("click",()=>playRepeated(items[+b.dataset.audioI].url)));
}
function playRepeated(url){
  if(activeAudio){activeAudio.pause();activeAudio=null} const repeat=+(document.getElementById("humanRepeat")?.value||1);const speed=+(document.getElementById("humanSpeed")?.value||1);let count=0;
  const play=()=>{const a=new Audio(url);activeAudio=a;a.playbackRate=speed;a.onended=()=>{count++;if(count<repeat)play()};a.play().catch(()=>toast("This recording could not be played in your browser."))};play();adjustSkill("listening",.3);state.attempts.listening++;saveState();
}