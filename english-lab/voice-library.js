const VOICE_LIBRARY = {
  version: 1,
  speakers: [
    {
      id: "us-street-dvortygirl",
      group: "US",
      style: "street",
      role: "American Street",
      roleAr: "أمريكي شوارع",
      names: ["Dvortygirl"],
      quality: "Curated native US pronunciation",
      searchPrefixes: ["En-us-"],
      source: "Wikimedia Commons"
    },
    {
      id: "us-academic-treemama",
      group: "US",
      style: "academic",
      role: "American Academic 1",
      roleAr: "أمريكي أكاديمي 1",
      names: ["TreeMama"],
      quality: "Shtooka learning recording",
      searchPrefixes: ["En-us-"],
      source: "Shtooka / Wikimedia Commons"
    },
    {
      id: "us-academic-droesperanto",
      group: "US",
      style: "academic",
      role: "American Academic 2",
      roleAr: "أمريكي أكاديمي 2",
      names: ["DroEsperanto"],
      quality: "Shtooka native US recording",
      searchPrefixes: ["En-us-"],
      source: "Shtooka / Wikimedia Commons"
    },
    {
      id: "uk-street-adam470",
      group: "UK",
      style: "street",
      role: "British Street",
      roleAr: "بريطاني شوارع",
      names: ["Adam470"],
      quality: "Curated British pronunciation",
      searchPrefixes: ["En-uk-", "En-gb-"],
      source: "Wikimedia Commons"
    },
    {
      id: "uk-academic-judith",
      group: "UK",
      style: "academic",
      role: "British Academic 1",
      roleAr: "بريطاني أكاديمي 1",
      names: ["Judith Franck", "Association Shtooka, Judith Franck"],
      quality: "Shtooka London learning recording",
      searchPrefixes: ["En-uk-", "En-gb-"],
      source: "Shtooka / Wikimedia Commons"
    },
    {
      id: "uk-academic-atmarsden",
      group: "UK",
      style: "academic",
      role: "British Academic 2",
      roleAr: "بريطاني أكاديمي 2",
      names: ["ATMarsden", "Andrew Marsden"],
      quality: "Curated British pronunciation",
      searchPrefixes: ["En-uk-", "En-gb-"],
      source: "Wikimedia Commons"
    },
    {
      id: "za-academic-collager",
      group: "ZA",
      style: "academic",
      role: "South African Academic",
      roleAr: "جنوب أفريقيا أكاديمي",
      names: ["Collager"],
      quality: "Studio-recorded South African voice",
      searchPrefixes: ["En-za-"],
      source: "Wikimedia Commons"
    }
  ],
  cacheKey: "englishLabHumanVoiceLibraryV1"
};

function voiceLibrarySpeakerForArtist(raw=""){
  const artist=String(raw||"").toLowerCase();
  return VOICE_LIBRARY.speakers.find(s=>s.names.some(n=>artist.includes(String(n).toLowerCase())))||null;
}
function voiceLibraryLoadCache(){
  try{return JSON.parse(localStorage.getItem(VOICE_LIBRARY.cacheKey)||"{}")}catch{return {}}
}
function voiceLibrarySaveCache(cache){
  try{localStorage.setItem(VOICE_LIBRARY.cacheKey,JSON.stringify(cache))}catch{}
}
function voiceLibraryCacheGet(word){
  const cache=voiceLibraryLoadCache();
  const row=cache[String(word||"").toLowerCase()];
  if(!row||!Array.isArray(row.items))return null;
  if(Date.now()-(row.savedAt||0)>1000*60*60*24*30)return null;
  return row.items;
}
function voiceLibraryCacheSet(word,items){
  const cache=voiceLibraryLoadCache();
  cache[String(word||"").toLowerCase()]={savedAt:Date.now(),items:(items||[]).slice(0,24)};
  const keys=Object.keys(cache);
  if(keys.length>300){
    keys.sort((a,b)=>(cache[a].savedAt||0)-(cache[b].savedAt||0)).slice(0,keys.length-300).forEach(k=>delete cache[k]);
  }
  voiceLibrarySaveCache(cache);
}
async function voiceLibraryCacheAudio(url){
  if(!("caches" in window)||!url)return;
  try{
    const cache=await caches.open("english-human-audio-v1");
    const hit=await cache.match(url);
    if(hit)return;
    const r=await fetch(url,{mode:"cors"});
    if(r.ok)await cache.put(url,r.clone())
  }catch{}
}
