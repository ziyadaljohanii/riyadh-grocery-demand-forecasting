const PLACEMENT = [
  {level:"A1",q:"Choose the correct sentence:",options:["She are tired.","She is tired.","She tired is."],a:1},
  {level:"A2",q:"I ___ to the clinic yesterday.",options:["go","went","gone"],a:1},
  {level:"B1",q:"If it rains, we ___ inside.",options:["stay","will stay","stayed"],a:1},
  {level:"B1",q:"I have lived here ___ 2024.",options:["for","since","during"],a:1},
  {level:"B2",q:"By the time we arrived, the meeting ___.",options:["started","had started","has started"],a:1},
  {level:"B2",q:"Which is the most natural?",options:["I suggest to change it.","I suggest changing it.","I suggest change it."],a:1},
  {level:"C1",q:"Choose the best hedged statement:",options:["This is always wrong.","This may be less effective in some contexts.","This cannot work."],a:1},
  {level:"C2",q:"What does “albeit” most closely mean?",options:["because","although","therefore"],a:1}
];

const defaultState = {
  onboarded:false, level:"A2", xp:0, streak:0, lastStudyDate:null,
  completed:{}, progressByLevel:{A1:0,A2:0,B1:0,B2:0,C1:0,C2:0},
  skills:{listening:32,reading:35,speaking:28,writing:26,vocabulary:31},
  reviews:{}, hardWords:{}, selectedWords:{}, quizHistory:[], attempts:{pronunciation:0,listening:0,reading:0,speaking:0,writing:0},
  settings:{lang:"ar",theme:"dark",selectedLevel:"A2"}
};
