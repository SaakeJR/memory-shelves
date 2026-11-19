import { verifyLibrary } from "./core.js";
export function migrateLegacy(input, datasets) {
const {QUIZ2_DATA, SEED_DATA, THEOLOGY_QUIZ4_DATA, PHILOSOPHY_EXAM2_DATA, EXAM_PARTS, V13_TOPIC_IDS, V13_LEGACY_TOPIC_DEST, V13_BUILTIN_TOPIC_DEST} = datasets;
function makeDefault(){
 const rooms=[{id:'world',name:'World History I'}];
 const collections=[{id:'exam2-world-history',room:'world',name:'Exam 2'}];
 const shelves=[];
 const topics=new Map();
 for(const item of SEED_DATA){const [group,topic]=item.shelf.split(' / '),label=group+' · '+topic;if(!topics.has(label)){const sid='exam2-topic-'+topics.size;topics.set(label,sid);shelves.push({id:sid,collection:'exam2-world-history',name:label})}}
 const books=SEED_DATA.map(b=>({...b,shelf:topics.get(b.shelf.replace(' / ',' · '))}));
 return {rooms,collections,shelves,books,progress:{},version:2}
}
let db = input ? structuredClone(input) : makeDefault();
function ensureChristianTheologyQuiz4(){
 if(!Array.isArray(db.rooms)||!Array.isArray(db.collections)||!Array.isArray(db.shelves)||!Array.isArray(db.books))return;
 let r=db.rooms.find(x=>x.id==='christian-theology-i')||db.rooms.find(x=>String(x.name).trim().toLowerCase()==='christian theology i');
 if(!r){r={id:'christian-theology-i',name:'Christian Theology I'};db.rooms.push(r)}
 let c=db.collections.find(x=>x.id==='theology-quiz4'&&x.room===r.id)||db.collections.find(x=>x.room===r.id&&String(x.name).trim().toLowerCase()==='quiz 4');
 if(!c){c={id:'theology-quiz4',room:r.id,name:'Quiz 4'};db.collections.push(c)}
 const names=['Quiz 1 Vocabulary','Quiz 2 Vocabulary','Quiz 3 Vocabulary','Quiz 4 Vocabulary','Memory Verses'];
 const originalNames=['God: Nature & Attributes','Christ: Person & Salvation','Holy Spirit','Angels & Demons','Scripture: Authority & Qualities'];
 if(!db.theologyQuiz4Regrouped){
  const oldShelfIds=new Set(db.shelves.filter(sh=>sh.collection===c.id&&originalNames.includes(sh.name)).map(sh=>sh.id));
  const builtInIds=new Set(THEOLOGY_QUIZ4_DATA.map(card=>card.id));
  const customCards=db.books.filter(book=>oldShelfIds.has(book.shelf)&&!builtInIds.has(book.id));
  if(customCards.length){
   const customShelfId='theology-quiz4-personal';
   if(!db.shelves.some(sh=>sh.id===customShelfId))db.shelves.push({id:customShelfId,collection:c.id,name:'Personal Cards (previous grouping)'});
   for(const book of customCards)book.shelf=customShelfId;
  }
  db.theologyQuiz4Regrouped=true;
 }
 const destinations={};
 for(let i=0;i<names.length;i++){
  const sid='theology-quiz4-topic-'+(i+1);
  let sh=db.shelves.find(x=>x.collection===c.id&&x.id===sid);
  if(!sh){sh={id:sid,collection:c.id,name:names[i]};db.shelves.push(sh)}
  // Only rename original built-in shelves; preserve user-customized labels.
  if(sh.name===originalNames[i]||sh.name===names[i])sh.name=names[i];
  destinations[sid]=sh.id;
 }
 const knownIds=new Set(THEOLOGY_QUIZ4_DATA.map(x=>x.id));
 const existingCollectionShelves=new Set(db.shelves.filter(x=>x.collection===c.id).map(x=>x.id));
 const exactPairs=new Set(db.books.filter(x=>existingCollectionShelves.has(x.shelf)).map(x=>String(x.title)+'\u001f'+String(x.body)));
 for(const card of THEOLOGY_QUIZ4_DATA){
  let existing=db.books.find(x=>x.id===card.id);
  if(existing){
   // Preserve edits to content, but migrate the source card to its quiz's assigned shelf.
   existing.shelf=destinations[card.shelf];
   if((card.id==='theology-quiz4-049'||card.id==='theology-quiz4-050')&&
      /^Chose Your Own Verse [12]$/.test(String(existing.body)))existing.body=card.body;
  }else{
   const pair=card.title+'\u001f'+card.body;
   if(!exactPairs.has(pair))db.books.push({...card,shelf:destinations[card.shelf]});
   exactPairs.add(pair);
  }
 }
 // Preserve any user-created cards; only remove obsolete empty source shelves.
 const referenced=new Set(db.books.map(b=>b.shelf));
 db.shelves=db.shelves.filter(sh=>sh.collection!==c.id||destinations[sh.id]||referenced.has(sh.id));
}

function ensurePhilosophyExam2(){
 // Add to both fresh and existing browser libraries; never overwrite user-edited cards.
 let r=db.rooms.find(x=>x.id==='essentials-philosophy')||db.rooms.find(x=>String(x.name).trim().toLowerCase()==='essentials of philosophy');
 if(!r){r={id:'essentials-philosophy',name:'Essentials of Philosophy'};db.rooms.push(r)}
 let c=db.collections.find(x=>x.id==='philosophy-exam2'&&x.room===r.id)||db.collections.find(x=>x.room===r.id&&String(x.name).trim().toLowerCase()==='exam 2');
 if(!c){c={id:'philosophy-exam2',room:r.id,name:'Exam 2'};db.collections.push(c)}
 const sections=['Descartes','Locke','Kant','Nietzsche'];
 const destination={};
 for(const name of sections){
  let s=db.shelves.find(x=>x.collection===c.id&&x.id==='philosophy-'+name.toLowerCase())||db.shelves.find(x=>x.collection===c.id&&x.name===name);
  if(!s){s={id:'philosophy-'+name.toLowerCase(),collection:c.id,name};db.shelves.push(s)}
  destination[name.toLowerCase()]=s.id;
 }
 const collectionShelfIds=new Set(db.shelves.filter(x=>x.collection===c.id).map(x=>x.id));
 const matchingBooks=new Set(db.books.filter(x=>collectionShelfIds.has(x.shelf)).map(x=>String(x.title)+'\u001f'+String(x.body)));
 for(const record of PHILOSOPHY_EXAM2_DATA){
  const key=record.title+'\u001f'+record.body;
  if(db.books.some(x=>x.id===record.id)||matchingBooks.has(key))continue;
  db.books.push({...record,shelf:destination[record.shelf.replace('philosophy-','')]});
  matchingBooks.add(key);
 }
}
const BUILTIN_PROFESSORS={'world':'Prof. Jensen','essentials-philosophy':'Prof. Suzuki','christian-theology-i':'Dr. Gifford'};
function ensureProfessors(){for(const r of db.rooms||[]){if(BUILTIN_PROFESSORS[r.id]&&!r.professor)r.professor=BUILTIN_PROFESSORS[r.id]}}
function migrateLibrary(){
 ensurePhilosophyExam2();
 ensureChristianTheologyQuiz4();
 const legacyMaps=new Set(db.collections.filter(c=>c.name==='Exam 2: Political Maps'||c.name==='Political Maps').map(c=>c.id));
 const legacyShelves=new Set(db.shelves.filter(s=>legacyMaps.has(s.collection)).map(s=>s.id));
 db.books=db.books.filter(b=>!legacyShelves.has(b.shelf)&&!String(b.id).startsWith('map-'));
 db.shelves=db.shelves.filter(s=>!legacyMaps.has(s.collection));
 db.collections=db.collections.filter(c=>!legacyMaps.has(c.id));
 for(const key of Object.keys(db.progress||{}))if(String(key).startsWith('map-'))delete db.progress[key];
 for(const s of db.shelves){if(s.id==='quiz2-topic-6'||s.name==='Franks & Charlemagne'||s.name==='The Frands and Charlemagne')s.name='The Franks & “Christendom”';if(s.id==='quiz2-topic-0')s.name='Chronology: Pages 33 & 41';if(s.id==='quiz2-topic-2')s.name='Church, Papacy & the Medieval World';if(s.id==='quiz2-topic-3')s.name='RCC Religious Practices'}
 // Consolidate the four original Exam 2 sections into one bookshelf without changing book IDs or progress.
 const examGroups=['Exam 2: Byzantium & Orthodoxy','Exam 2: Islamic World','Exam 2: Medieval Europe','Exam 2: Late Medieval & Renaissance'];
 const oldExam=db.collections.filter(c=>c.room==='world'&&examGroups.includes(c.name));
 let target=db.collections.find(c=>c.id==='exam2-world-history');
 if(oldExam.length){
  if(!target){target={id:'exam2-world-history',room:'world',name:'Exam 2'};db.collections.push(target)}
  for(const old of oldExam){
   const section=old.name.slice('Exam 2: '.length);
   for(const sh of db.shelves.filter(s=>s.collection===old.id)){
    sh.collection=target.id;
    // Preserve labels and make repeated names (e.g. Chronology) distinguishable.
    if(!sh.name.startsWith(section+' · '))sh.name=section+' · '+sh.name;
   }
  }
  const oldIds=new Set(oldExam.map(c=>c.id));
  db.collections=db.collections.filter(c=>!oldIds.has(c.id));
 }
 if(target)target.name='Exam 2 - Complete Except Maps';
 const isUpgrade=Number(db.version||0)<8;
 if(!db.rooms.some(r=>r.id==='world'))return;
 const collectionId='quiz2-world-history';
 if(!db.collections.some(c=>c.id===collectionId))db.collections.push({id:collectionId,room:'world',name:'Quiz 2: Pages 33–41 & 46–51'});
 else db.collections.find(c=>c.id===collectionId).name='Quiz 2: Pages 33–41 & 46–51';
 const topics=['Chronology: Pages 33 & 41','Byzantium','Church, Papacy & the Medieval World','RCC Religious Practices','Islam','Medieval Terms','The Franks & “Christendom”'];
 for(let i=0;i<topics.length;i++){const sid='quiz2-topic-'+i;const present=db.shelves.find(s=>s.id===sid);if(present)present.name=topics[i];else db.shelves.push({id:sid,collection:collectionId,name:topics[i]})}
 const included=new Set(QUIZ2_DATA.map(x=>x.id));
 if(isUpgrade)db.books=db.books.filter(b=>!String(b.id).startsWith('quiz2-')||included.has(b.id));
 for(const t of QUIZ2_DATA){const s=db.shelves.find(s=>s.collection===collectionId&&s.name===t.shelf);const existing=db.books.find(b=>b.id===t.id);if(existing){if(isUpgrade){existing.body=t.body;existing.source=t.source}existing.shelf=s.id}else if(isUpgrade)db.books.push({...t,shelf:s.id})}
 if(isUpgrade)for(const key of Object.keys(db.progress||{}))if(String(key).startsWith('quiz2-')&&!included.has(key))delete db.progress[key];
 // Preserve the student's own cards and progress. Existing starter text is corrected from highlights.
 const auditUpgrade=Number(db.version||0)<8;
 if(auditUpgrade){
  for(const template of SEED_DATA){
   const targetLabel=template.shelf.replace(' / ',' · ');
   let targetShelf=db.shelves.find(s=>s.collection==='exam2-world-history'&&s.name===targetLabel);
   if(!targetShelf){const sid='exam2-audit-'+db.shelves.length;targetShelf={id:sid,collection:'exam2-world-history',name:targetLabel};db.shelves.push(targetShelf)}
   const existing=db.books.find(b=>b.id===template.id);
   if(existing){existing.title=template.title;existing.body=template.body;existing.source=template.source;existing.shelf=targetShelf.id}
   else if(template.id.startsWith('a-'))db.books.push({...template,shelf:targetShelf.id});
  }
 }
 // Seven topic views share canonical books, original source shelves, and progress.
 // The detailed source shelves and their book IDs are retained unchanged.

 // V1.3.0: classify canonical Exam 2 books into distinct, memory-friendly topic shelves.
 // Source titles/definitions/references and all book IDs remain unchanged.
 const oldTopicDest=V13_LEGACY_TOPIC_DEST;
 const builtinTopicDest=V13_BUILTIN_TOPIC_DEST;
 const targetShelfIds={};
 for(const [key,label] of Object.entries(V13_TOPIC_IDS)){
  let s=db.shelves.find(x=>x.id===label.id);
  if(!s){s={id:label.id,collection:'exam2-world-history',name:label.name};db.shelves.push(s)}
  else {s.collection='exam2-world-history';s.name=label.name}
  targetShelfIds[label.name]=s.id;
 }
 for(const b of db.books){
  if(builtinTopicDest[b.id] && db.shelves.some(s=>s.id===b.shelf&&s.collection==='exam2-world-history')){
   // Built-in cards change grouping only. The user may have edited their content, so do not overwrite it.
   b.shelf=targetShelfIds[builtinTopicDest[b.id]];
  }else{
   const s=db.shelves.find(x=>x.id===b.shelf);
   if(s&&oldTopicDest[s.name]&&s.collection==='exam2-world-history')b.shelf=targetShelfIds[oldTopicDest[s.name]];
  }
 }
 // Remove redundant empty canonical topics. Do not remove custom shelves with books.
 const v13Targets=new Set(Object.values(targetShelfIds));
 db.shelves=db.shelves.filter(s=>s.collection!=='exam2-world-history'||s.overview||v13Targets.has(s.id)||db.books.some(b=>b.shelf===s.id));
 const expectedGroups=EXAM_PARTS;
 const oldPartIds=new Set(db.collections.filter(c=>c.room==='world'&&/^exam2-section-/.test(c.id)).map(c=>c.id));
 // Any books users manually added to a former mirror shelf are moved to its source shelf
 // BEFORE the mirror shelf changes collection. This preserves user-added cards.
 for(const mirror of db.shelves.filter(s=>oldPartIds.has(s.collection)&&s.sourceShelf)){
  for(const book of db.books.filter(b=>b.shelf===mirror.id))book.shelf=mirror.sourceShelf;
 }
 const expectedNames=new Set(expectedGroups.flatMap(group=>group.sourceShelves));
 for(let i=0;i<expectedGroups.length;i++){
  const group=expectedGroups[i], cid='exam2-section-'+(i+1);
  const name='Exam 2 - '+group.name+' '+(i+1)+' of '+expectedGroups.length;
  let section=db.collections.find(c=>c.id===cid);
  if(!section){section={id:cid,room:'world',name};db.collections.push(section)}
  else {section.room='world';section.name=name}
  for(const sourceName of group.sourceShelves){
   const mainShelf=db.shelves.find(sh=>sh.collection==='exam2-world-history'&&sh.name===sourceName);
   if(!mainShelf)continue;
   const sid='section-'+mainShelf.id;
   let mirror=db.shelves.find(sh=>sh.id===sid);
   const topicName=sourceName.split(' · ').slice(1).join(' · ');
   if(!mirror){mirror={id:sid,collection:cid,name:topicName,sourceShelf:mainShelf.id};db.shelves.push(mirror)}
   else {mirror.collection=cid;mirror.name=topicName;mirror.sourceShelf=mainShelf.id}
  }
 }
 const currentSectionIds=new Set(expectedGroups.map((_,i)=>'exam2-section-'+(i+1)));
 db.collections=db.collections.filter(c=>!oldPartIds.has(c.id)||currentSectionIds.has(c.id));
 const activeMirrors=new Set(db.shelves.filter(s=>currentSectionIds.has(s.collection)&&s.sourceShelf&&expectedNames.has(db.shelves.find(src=>src.id===s.sourceShelf)?.name)).map(s=>s.id));
 // Remove obsolete mirror shelves only when no books depend on them.
 db.shelves=db.shelves.filter(s=>!(oldPartIds.has(s.collection)&&s.sourceShelf&&!activeMirrors.has(s.id)&&!db.books.some(b=>b.shelf===s.id)));
 for(let i=0;i<expectedGroups.length;i++){
  const sid='exam2-overview-'+(i+1),name=expectedGroups[i].name;
  let overview=db.shelves.find(sh=>sh.id===sid);
  if(!overview){overview={id:sid,collection:'exam2-world-history',name,overview:true};db.shelves.push(overview)}
  else {overview.name=name;overview.collection='exam2-world-history';overview.overview=true}
 }
 // Old overview shelves and detailed source shelves are not visible as extra physical shelves.
 db.shelves=db.shelves.filter(sh=>!/^exam2-overview-/.test(sh.id)||expectedGroups.some((_,i)=>sh.id==='exam2-overview-'+(i+1)));
 const rank=new Map([['exam2-world-history',0],...expectedGroups.map((_,i)=>['exam2-section-'+(i+1),i+1]),['quiz2-world-history',8]]);
 db.collections.sort((a,b)=>((a.room==='world'?rank.get(a.id)??100:200)-(b.room==='world'?rank.get(b.id)??100:200)));
 db.queueByCollection=db.queueByCollection||{};
 db.version=12;
}
migrateLibrary();
ensurePhilosophyExam2();
ensureChristianTheologyQuiz4();
ensureProfessors();
// Respect explicit deletion of default rooms and bookshelves on subsequent visits.
if(db.hiddenDefaults){const excludedRooms=new Set(db.hiddenDefaults.rooms||[]),excludedCols=new Set(db.hiddenDefaults.collections||[]);db.collections=db.collections.filter(c=>!excludedRooms.has(c.room)&&!excludedCols.has(c.id));const keptCols=new Set(db.collections.map(c=>c.id));db.rooms=db.rooms.filter(r=>!excludedRooms.has(r.id));db.shelves=db.shelves.filter(sh=>keptCols.has(sh.collection));const keptShelves=new Set(db.shelves.map(sh=>sh.id));db.books=db.books.filter(b=>keptShelves.has(b.shelf))}

verifyLibrary(db); return db;
}
