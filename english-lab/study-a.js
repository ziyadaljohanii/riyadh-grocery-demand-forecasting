const LEXICON={}; for(const u of UNITS)for(const [w,ar] of u.vocab)LEXICON[w.toLowerCase()]=ar;
function meaningFor(word){return LEXICON[word.toLowerCase()]||""}
async function openWord(word){
  currentWord=word.toLowerCase();state.selectedWords[currentWord]=(state.selectedWords[currentWord]||0)+1;if(state.selectedWords[currentWord]>=3)state.hardWords[currentWord]=true;saveState();
  document.getElementById("wordTitle").textContent=currentWord;document.getElementById("wordType").textContent="WORD";document.getElementById("wordIpa").textContent="Loading pronunciation…";document.getElementById("wordMeaning").textContent=meaningFor(currentWord)||"جارٍ جلب معنى عربي سريع…";document.getElementById("wordExample").textContent="Loading example…";document.getElementById("wordAudioList").innerHTML='<div class="empty-state small">Tap “Search voices” for open human recordings.</div>';document.getElementById("reminderOptions").classList.add("hidden");
  document.getElementById("wordDialog").showModal();
  document.getElementById("wordPracticeBox")?.classList.add("hidden");
  const practiceInput=document.getElementById("wordPracticeInput");if(practiceInput)practiceInput.value="";
  const practiceFeedback=document.getElementById("wordPracticeFeedback");if(practiceFeedback){practiceFeedback.classList.add("hidden");practiceFeedback.textContent=""}
  const practiceLabel=document.getElementById("wordPracticeLabel");if(practiceLabel)practiceLabel.textContent=currentWord;
  document.querySelectorAll("[data-word-accent]").forEach(b=>b.classList.toggle("active",b.dataset.wordAccent==="all"));
  setTimeout(()=>loadWordAudio(true),120);
  const info=await fetchWordInfo(currentWord);if(info.ipa)document.getElementById("wordIpa").textContent=info.ipa;else document.getElementById("wordIpa").textContent="IPA not found";if(info.example)document.getElementById("wordExample").innerHTML=`<strong>Example</strong><br>${esc(info.example)}`;else document.getElementById("wordExample").textContent="No dictionary example found.";
  if(!meaningFor(currentWord)){const ar=await quickArabicTranslation(currentWord);document.getElementById("wordMeaning").textContent=ar||"لم يتم العثور على ترجمة عربية تلقائيًا. يمكنك حفظ الكلمة ومراجعتها لاحقًا."} else document.getElementById("wordMeaning").textContent=meaningFor(currentWord);
}
async function fetchWordInfo(word){
  try{const r=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);if(!r.ok)throw 0;const j=await r.json();const e=j[0]||{};const ipa=(e.phonetic||e.phonetics?.find(p=>p.text)?.text||"");let example="",part="";for(const m of (e.meanings||[])){part=part||m.partOfSpeech;for(const d of (m.definitions||[])){if(d.example){example=d.example;break}}if(example)break}document.getElementById("wordType").textContent=(part||"WORD").toUpperCase();return {ipa,example}}catch{return {}}
}
async function quickArabicTranslation(text){
  try{const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en%7Car`);if(!r.ok)throw 0;const j=await r.json();return j.responseData?.translatedText||""}catch{return ""}
}
async function loadWordAudio(silent=false){
  const list=document.getElementById("wordAudioList");
  list.innerHTML='<div class="empty-state small">Searching real human recordings…</div>';
  const items=await fetchCommonsAudio(currentWord);
  if(items.length){
    renderAudioItems(list,items,"commons");
    applyAudioAccentFilter("all","wordAudioList");
    if(!silent)toast(`${items.length} human recording${items.length===1?"":"s"} found`);
  }else{
    list.innerHTML='<div class="empty-state small">No reusable human recording was found for this word. Synthetic speech is disabled.</div>';
    if(!silent)toast("No human recording found for this word");
  }
}
function addReviewWord(word,meaning,hard=false){
  const key=word.toLowerCase();const old=state.reviews[key]||{};state.reviews[key]={id:key,text:word,meaning:meaning||old.meaning||"",type:"word",due:Date.now(),interval:old.interval||0,ease:old.ease||2.4,correct:old.correct||0,wrong:old.wrong||0,known:false,hard:hard||old.hard||false};saveState();toast("Added to review queue")
}
function scheduleWord(ms){if(!currentWord)return;addReviewWord(currentWord,document.getElementById("wordMeaning").textContent);state.reviews[currentWord].due=Date.now()+ms;saveState();toast("Reminder saved. It will appear in your review queue.");tryNotifyPermission()}
function tryNotifyPermission(){if("Notification" in window&&Notification.permission==="default")Notification.requestPermission().catch(()=>{})}
function checkDueNotifications(){if(!("Notification" in window)||Notification.permission!=="granted")return;const due=dueReviews().filter(r=>!r.notified);if(due.length){new Notification("English review is ready",{body:`${due.length} word${due.length>1?"s":""} waiting for review.`});due.forEach(r=>r.notified=true);saveState()}}
function downloadICS(word,when){
  const dt=new Date(when);const pad=n=>String(n).padStart(2,"0");const stamp=`${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//My English Lab//EN\nBEGIN:VEVENT\nUID:${Date.now()}@englishlab\nDTSTART:${stamp}\nDTEND:${stamp}\nSUMMARY:Review English word: ${word}\nDESCRIPTION:Open My English Lab and review ${word}.\nEND:VEVENT\nEND:VCALENDAR`;const blob=new Blob([ics],{type:"text/calendar"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`review-${word}.ics`;a.click();URL.revokeObjectURL(a.href)
}
function openWordPractice(){
  if(!currentWord)return;
  const box=document.getElementById("wordPracticeBox");
  const label=document.getElementById("wordPracticeLabel");
  if(label)label.textContent=currentWord;
  box?.classList.remove("hidden");
  setTimeout(()=>document.getElementById("wordPracticeInput")?.focus(),60)
}
function checkWordPractice(){
  if(!currentWord)return;
  const input=document.getElementById("wordPracticeInput");
  const feedback=document.getElementById("wordPracticeFeedback");
  const text=(input?.value||"").trim();
  if(!text){toast("Write a sentence first.");return}
  const tokens=text.toLowerCase().replace(/[^a-z\x27 -]/g," ").split(/\s+/).filter(Boolean);
  const used=tokens.includes(currentWord.toLowerCase());
  const words=tokens.length;
  feedback?.classList.remove("hidden");
  if(used&&words>=4){
    feedback.innerHTML="<strong>Nice use of the word.</strong><br><small>You used <b>"+esc(currentWord)+"</b> in a complete sentence. This check looks for usage and sentence length, not full grammar accuracy.</small>";
    addXP(4);adjustSkill("vocabulary",.6)
  }else if(!used){
    feedback.innerHTML="<strong>Use the target word.</strong><br><small>Write a sentence that includes <b>"+esc(currentWord)+"</b>.</small>"
  }else{
    feedback.innerHTML="<strong>Add a little more.</strong><br><small>Try a sentence of at least four words.</small>"
  }
}