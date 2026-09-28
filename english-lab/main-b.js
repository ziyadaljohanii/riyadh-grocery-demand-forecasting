function setupEvents(){
  document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.nav)));
  document.querySelectorAll("[data-close-dialog]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.closeDialog).close()));

  document.getElementById("continueBtn").onclick=()=>startRecommended(weakestSkill());
  document.getElementById("quickSpeakingBtn").onclick=()=>startRecommended("speaking");
  document.getElementById("retakePlacementBtn").onclick=openPlacement;
  document.getElementById("lessonPrevBtn").onclick=()=>showLessonStep(lessonStepIndex-1);
  document.getElementById("lessonNextBtn").onclick=()=>showLessonStep(lessonStepIndex+1);
  document.getElementById("openCoachBtn").onclick=()=>document.getElementById("coachDialog").showModal();
  document.getElementById("coachSendBtn").onclick=()=>{
    const i=document.getElementById("coachInput");
    if(i.value.trim()){askCoach(i.value.trim());i.value=""}
  };
  document.getElementById("coachInput").addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();document.getElementById("coachSendBtn").click()}
  });

  document.getElementById("findHumanAudioBtn").onclick=()=>findHumanLessonAudio(false);
  document.querySelectorAll("[data-accent-filter]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-accent-filter]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    applyAudioAccentFilter(b.dataset.accentFilter,"humanAudioList");
    applyAudioAccentFilter(b.dataset.accentFilter,"lessonWordAudio");
  });
  document.querySelectorAll("[data-word-accent]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-word-accent]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    applyAudioAccentFilter(b.dataset.wordAccent,"wordAudioList");
  });

  document.getElementById("toggleTranslationBtn").onclick=()=>document.getElementById("passageArabic").classList.toggle("hidden");
  document.getElementById("readingFocusBtn").onclick=()=>document.body.classList.toggle("focus-mode");
  document.getElementById("playShadowBtn").onclick=playShadowHuman;
  document.getElementById("recordShadowBtn").onclick=startShadowAttempt;
  document.getElementById("stopShadowBtn").onclick=()=>{try{recognition?.stop()}catch{}};
  document.getElementById("practiceSpeakingBtn").onclick=startSpeakingAttempt;
  document.getElementById("checkWritingBtn").onclick=checkWriting;
  document.getElementById("completeLessonBtn").onclick=completeLesson;

  document.getElementById("wordAudioRefresh").onclick=()=>loadWordAudio(false);
  document.getElementById("addReviewBtn").onclick=()=>addReviewWord(currentWord,document.getElementById("wordMeaning").textContent);
  document.getElementById("openReminderBtn").onclick=()=>document.getElementById("reminderOptions").classList.toggle("hidden");
  document.querySelectorAll("[data-reminder]").forEach(b=>b.onclick=()=>{
    const m={"10m":600000,"1h":3600000,"1d":86400000,"3d":259200000,"7d":604800000}[b.dataset.reminder];
    scheduleWord(m)
  });
  document.getElementById("calendarReminderBtn").onclick=()=>{
    if(!currentWord)return;
    downloadICS(currentWord,Date.now()+86400000);
    toast("Calendar reminder created")
  };
  document.getElementById("wordKnowBtn").onclick=()=>{
    if(currentWord&&state.reviews[currentWord])state.reviews[currentWord].known=true;
    saveState();toast("Marked as known")
  };

  document.querySelectorAll("[data-review-filter]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-review-filter]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");renderReview(b.dataset.reviewFilter)
  });
  document.getElementById("exportBtn").onclick=exportProgress;
  document.getElementById("importInput").onchange=e=>{if(e.target.files[0])importProgress(e.target.files[0])};

  document.getElementById("themeBtn").onclick=()=>{
    state.settings.theme=state.settings.theme==="light"?"dark":"light";
    applySettings();saveState()
  };
  document.getElementById("langBtn").onclick=()=>{
    state.settings.lang=state.settings.lang==="ar"?"en":"ar";
    applySettings();saveState()
  };
}
function applySettings(){
  const ar=state.settings.lang==="ar";
  document.body.classList.toggle("light",state.settings.theme==="light");
  document.documentElement.dir=ar?"rtl":"ltr";
  document.documentElement.lang=state.settings.lang;
  document.getElementById("langBtn").textContent=ar?"EN":"ع";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",state.settings.theme==="light"?"#f5f7fb":"#11151d");

  const set=(sel,en,arabic)=>{const el=document.querySelector(sel);if(el)el.textContent=ar?arabic:en};
  set('[data-i18n="welcome"]','Welcome back','مرحبًا بعودتك');
  set('#view-learn .page-head h1','Choose your level','اختر مستواك');
  set('#view-learn .page-head p','Each lesson follows the same clear learning flow from listening to speaking.','كل درس يتبع مسارًا واضحًا من الاستماع حتى التحدث.');
  set('#view-review .page-head h1','Your memory queue','قائمة المراجعة');
  set('#view-review .page-head p','Only the words and sentences that need attention come back here.','تعود هنا فقط الكلمات والجمل التي تحتاج إلى مراجعة.');
  set('#view-games .page-head h1','Short review games','ألعاب مراجعة قصيرة');
  set('#view-games .page-head p','Simple games built from the vocabulary you actually need to remember.','ألعاب بسيطة مبنية على الكلمات التي تحتاج إلى تذكرها.');
  set('#view-progress .page-head h1','Your learning map','خريطة تقدمك');
  set('#view-progress .page-head p','See your current estimate and which skills need the next push.','شاهد مستواك الحالي والمهارات التي تحتاج إلى تركيز أكبر.');

  const nav=[['Home','الرئيسية'],['Learn','تعلم'],['Review','مراجعة'],['Games','ألعاب'],['Progress','التقدم']];
  document.querySelectorAll('.nav-item').forEach((b,i)=>{
    const sm=b.querySelector('small');if(sm)sm.textContent=ar?nav[i][1]:nav[i][0]
  });

  set('#openCoachBtn','Ask','اسأل');
  set('#continueBtn','Continue','أكمل');
  set('#retakePlacementBtn','Level check','اختبار مستوى');
  set('#findHumanAudioBtn','Find voices','ابحث عن أصوات بشرية');
  set('#toggleTranslationBtn','Show Arabic','إظهار الترجمة');
  set('#readingFocusBtn','Focus','تركيز');
  set('#playShadowBtn','▶ Human model','▶ صوت بشري');
  set('#recordShadowBtn','🎙 Record attempt','🎙 سجل محاولتك');
  set('#completeLessonBtn','Complete lesson ✓','إكمال الدرس ✓');
  set('#addReviewBtn','+ Add to review','+ أضف للمراجعة');
  set('#openReminderBtn','⏰ Reminder','⏰ تذكير');
  set('#wordAudioRefresh','Find voices','ابحث عن أصوات');
}
function applyDesignMigration(){
  if(localStorage.getItem("englishLabDesignV2"))return;
  state.settings.theme="light";
  localStorage.setItem("englishLabDesignV2","1");
  saveState()
}

applyDesignMigration();
setupEvents();
applySettings();
detectAIStatus();
renderHome();
renderLearn();
renderReview();
renderGames();
renderProgress();
updateBadges();
checkDueNotifications();
setInterval(checkDueNotifications,60000);
if(!state.onboarded)setTimeout(openPlacement,450);
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
