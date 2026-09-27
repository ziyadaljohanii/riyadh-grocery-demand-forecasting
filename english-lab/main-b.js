function setupEvents(){
  document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.nav)));
  document.querySelectorAll("[data-close-dialog]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.closeDialog).close()));
  document.getElementById("continueBtn").onclick=()=>startRecommended(weakestSkill());document.getElementById("retakePlacementBtn").onclick=openPlacement;document.getElementById("openCoachBtn").onclick=()=>document.getElementById("coachDialog").showModal();document.getElementById("coachSendBtn").onclick=()=>{const i=document.getElementById("coachInput");if(i.value.trim()){askCoach(i.value.trim());i.value=""}};document.getElementById("coachInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();document.getElementById("coachSendBtn").click()}});
  document.getElementById("findHumanAudioBtn").onclick=findHumanLessonAudio;document.getElementById("playSystemBtn").onclick=()=>systemSpeak(currentUnit?.passage||"");document.getElementById("toggleTranslationBtn").onclick=()=>document.getElementById("passageArabic").classList.toggle("hidden");document.getElementById("readingFocusBtn").onclick=()=>document.body.classList.toggle("focus-mode");document.getElementById("playShadowBtn").onclick=()=>{const s=document.getElementById("shadowSentence").textContent;systemSpeak(s)};document.getElementById("recordShadowBtn").onclick=startShadowAttempt;document.getElementById("stopShadowBtn").onclick=()=>{try{recognition?.stop()}catch{}};document.getElementById("practiceSpeakingBtn").onclick=startSpeakingAttempt;document.getElementById("checkWritingBtn").onclick=checkWriting;document.getElementById("completeLessonBtn").onclick=completeLesson;
  document.getElementById("wordAudioRefresh").onclick=loadWordAudio;document.getElementById("addReviewBtn").onclick=()=>addReviewWord(currentWord,document.getElementById("wordMeaning").textContent);document.getElementById("openReminderBtn").onclick=()=>document.getElementById("reminderOptions").classList.toggle("hidden");document.querySelectorAll("[data-reminder]").forEach(b=>b.onclick=()=>{const m={"10m":600000,"1h":3600000,"1d":86400000,"3d":259200000,"7d":604800000}[b.dataset.reminder];scheduleWord(m)});document.getElementById("calendarReminderBtn").onclick=()=>{if(!currentWord)return;downloadICS(currentWord,Date.now()+86400000);toast("Calendar reminder file created")};document.getElementById("wordKnowBtn").onclick=()=>{if(currentWord&&state.reviews[currentWord])state.reviews[currentWord].known=true;saveState();toast("Marked as known")};
  document.querySelectorAll("[data-review-filter]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-review-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderReview(b.dataset.reviewFilter)});document.getElementById("exportBtn").onclick=exportProgress;document.getElementById("importInput").onchange=e=>{if(e.target.files[0])importProgress(e.target.files[0])};
  document.getElementById("themeBtn").onclick=()=>{state.settings.theme=state.settings.theme==="light"?"dark":"light";applySettings();saveState()};document.getElementById("langBtn").onclick=()=>{state.settings.lang=state.settings.lang==="ar"?"en":"ar";applySettings();saveState()};
}
function applySettings(){
  const ar=state.settings.lang==="ar";
  document.body.classList.toggle("light",state.settings.theme==="light");
  document.documentElement.dir=ar?"rtl":"ltr";document.documentElement.lang=state.settings.lang;document.getElementById("langBtn").textContent=ar?"EN":"ع";
  const set=(sel,en,arabic)=>{const el=document.querySelector(sel);if(el)el.textContent=ar?arabic:en};
  set('[data-i18n="welcome"]','Welcome back','مرحبًا بعودتك');
  set('#view-learn .page-head h1','Choose your path','اختر مسارك');
  set('#view-learn .page-head p','Every level includes listening, pronunciation, shadowing, reading, vocabulary, grammar, speaking, writing and review.','كل مستوى يشمل الاستماع والنطق والشادووينق والقراءة والمفردات والقواعد والتحدث والكتابة والمراجعة.');
  set('#view-review .page-head h1','Review queue','قائمة المراجعة');
  set('#view-review .page-head p','Words and sentences return when your memory needs them.','تعود الكلمات والجمل في الوقت الذي تحتاج فيه ذاكرتك إلى مراجعتها.');
  set('#view-games .page-head h1','Practice games','ألعاب التدريب');
  set('#view-games .page-head p','Short rounds built from your weak and recently saved vocabulary.','جولات قصيرة مبنية على الكلمات الصعبة والمحفوظة حديثًا.');
  set('#view-progress .page-head h1','Your learning map','خريطة تقدمك');
  set('#view-progress .page-head p','Not just a level. See which skills are moving and which need attention.','ليس مجرد مستوى واحد؛ شاهد المهارات التي تتقدم والمهارات التي تحتاج اهتمامًا.');
  const nav=[['home','الرئيسية'],['learn','تعلم'],['review','مراجعة'],['games','ألعاب'],['progress','تقدم']];
  document.querySelectorAll('.nav-item').forEach((b,i)=>{const sm=b.querySelector('small');if(sm)sm.textContent=ar?nav[i][1]:nav[i][0][0].toUpperCase()+nav[i][0].slice(1)});
  set('#openCoachBtn','Ask the coach','اسأل المدرب الذكي');
  set('#continueBtn','Continue today’s plan →','أكمل خطة اليوم ←');
  set('#retakePlacementBtn','Quick level check','اختبار مستوى سريع');
  set('#findHumanAudioBtn','Find recordings','ابحث عن تسجيلات بشرية');
  set('#toggleTranslationBtn','Show Arabic','إظهار الترجمة العربية');
  set('#readingFocusBtn','Focus mode','وضع التركيز');
  set('#recordShadowBtn','🎙 Start attempt','🎙 ابدأ المحاولة');
  set('#completeLessonBtn','Complete lesson ✓','إكمال الدرس ✓');
  set('#addReviewBtn','+ Add to review','+ أضف للمراجعة');
  set('#openReminderBtn','⏰ Reminder','⏰ تذكير');
}

setupEvents();applySettings();detectAIStatus();renderHome();renderLearn();renderReview();renderGames();renderProgress();updateBadges();checkDueNotifications();setInterval(checkDueNotifications,60000);
if(!state.onboarded)setTimeout(openPlacement,450);
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});