


import { APP_VERSION, KEY, PREF_KEY, MAX_TITLE_LENGTH, MAX_BODY_LENGTH, LAYOUT_PREF_KEY, RECOVERY_KEY, COVER_COLORS as colors, THEMES, THEME_OPTIONS, LAYOUTS } from './config.js';
import { norm, studyDefinition, cleanDefinition, verifyLibrary, parseQuizletText, roomDisplayName } from './core.js';
import { validQueue as queueFor, booksForCollection, canonicalBookOrder, displayBooks, visibleShelvesFor, recordPlacement, deferBook, returnBook, reorderShelves } from './study.js';
import { migrateLegacy } from './migrations.js';
import { planImport as planContentImport, snapshotExport as shareSnapshot, importSharedData as planSharedImport, deletionPlan, applyDeletion } from './library.js';
import { loadDatasets, installCourse, installBookshelf, extendCatalog } from './catalog.js';
import { createLibraryRepository, normalizeLibrary } from './storage.js';
export async function startApp({datasets:providedDatasets}={}) {
const datasets = providedDatasets || await loadDatasets();
const catalogStarter = extendCatalog(normalizeLibrary(migrateLegacy(null,datasets),datasets),datasets);
const repository = createLibraryRepository(localStorage,datasets);
let db = repository.initial;
function validQueue(candidate,collectionId=coll){return queueFor(candidate,collectionId)}
function defaultBookOrder(collectionId=coll,state=db){return canonicalBookOrder(collectionId,state)}
function planImport(...args){return planContentImport(db,id,...args)}
function snapshotExport(...args){return shareSnapshot(db,...args)}
function importSharedData(...args){return planSharedImport(db,id,...args)}
let editMode=false, editBookId="";

const $=id=>document.getElementById(id);

let stackCollapsed=false;
let studyLayout='flashcard';
try{const saved=localStorage.getItem(LAYOUT_PREF_KEY);if(LAYOUTS.includes(saved))studyLayout=saved;}catch(e){}
function applyStudyLayout(value){
 studyLayout=LAYOUTS.includes(value)?value:'bookshelf';
 const layout=document.getElementById('studyLayout');
 const toggle=document.getElementById('layoutToggle');
 if(layout)layout.classList.toggle('flashcard-layout',studyLayout==='flashcard'||window.matchMedia('(max-width:720px)').matches);
 if(toggle){toggle.setAttribute('aria-checked',String(studyLayout==='flashcard'));toggle.title=studyLayout==='flashcard'?'Flashcard layout selected. Switch to bookshelf layout.':'Bookshelf layout selected. Switch to flashcard layout.';}
 const select=document.getElementById('layoutSel');if(select)select.value=studyLayout;
 try{localStorage.setItem(LAYOUT_PREF_KEY,studyLayout)}catch(e){}
}
const CHANGELOG=[{version:'1.0.0',date:'Initial launch',items:['Spatial study with rooms, bookshelves and interactive books','Four study methods and two responsive layouts','Course library and personal study sets','Quizlet and JSON import, sharing and backups','Three wood themes, local progress and feedback']}];
let theme='birch';try{let saved=localStorage.getItem(PREF_KEY);if(THEMES.includes(saved))theme=saved}catch(e){}
function applyTheme(v){theme=THEMES.includes(v)?v:'birch';document.documentElement.dataset.theme=theme;document.querySelectorAll('[data-wood-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.woodTheme===theme)));const settingsTheme=document.getElementById('themeSel');if(settingsTheme)settingsTheme.value=theme;try{localStorage.setItem(PREF_KEY,theme)}catch(e){}}
applyTheme(theme);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);


let room='world',coll=db.collections.find(c=>c.id==='exam2-world-history')?.id||db.collections[0]?.id||'',mode='place',selected=null,showBody=false,filterShelf='',feedback='',noticeClass='',view='home';let order=[];let lastStudyMethod='place';
function safeCommit(candidate,{recovery=null}={}){
 try{candidate.stableSchema=1;repository.save(candidate,{recovery});db=candidate;return true}
 catch(e){feedback='Unable to save: browser storage is full, blocked or changed in another tab. No changes were saved. Back up your library, reload if another tab changed it, or free storage space.';noticeClass='error';render();alert(feedback);return false}
}
function completeImport(plan){
 if(!plan.added){feedback='No new books to import. All '+plan.skipped+' books already exist in this bookshelf.';noticeClass='';closeModal();render();return}
 if(!safeCommit(plan.candidate))return;
 room=plan.roomId;coll=plan.collectionId;view='study';mode='place';selected=null;filterShelf='';setOrder();closeModal();feedback='Imported '+plan.added+' books'+(plan.skipped?', skipped '+plan.skipped+' exact duplicates':'')+'.';noticeClass='success';render();
}
function save(){try{repository.save(db);return true}catch(e){feedback='Storage is full or blocked. Export your data now.';noticeClass='error';return false}}

function visibleShelves(){return visibleShelvesFor(db,coll)}
function sourceShelfId(bookId){return db.books.find(b=>b.id===bookId)?.shelf}
function commitStudyAction(action){
 const candidate=structuredClone(db);candidate.queueByCollection ||= {};
 const result=action(candidate);
 if(!result?.ok){feedback=result?.error||'Study action was rejected.';noticeClass='error';render();return false}
 try{repository.save(candidate)}
 catch(e){feedback='Unable to save this study action. Your previous progress is unchanged.';noticeClass='error';render();return false}
 db=candidate;order=validQueue(db);return result;
}
function nextFromQueue(){selected=null;showBody=false}
function autoPlace(){
 const book=getActive();
 if(!book||view!=='study'||mode==='browse')return;
 const result=commitStudyAction(candidate=>recordPlacement(candidate,coll,book.id,book.shelf,{automatic:true}));
 if(!result)return;
 nextFromQueue();feedback='Marked known and automatically placed on '+(db.shelves.find(s=>s.id===sourceShelfId(book.id))?.name||'its assigned shelf')+'.';noticeClass='success';render();
}
function deferSelected(kind){
 const book=getActive();if(!book||view!=='study'||mode==='browse')return;
 const result=commitStudyAction(candidate=>deferBook(candidate,coll,book.id,kind));
 if(!result)return;
 nextFromQueue();feedback=kind==='bottom'?'Book moved to the bottom of the stack.':'Book deferred deeper into the stack.';noticeClass='success';render();
}
function resetSelectedShelf(shelfId=filterShelf){
 if(mode==='browse')return;
 if(!shelfId){feedback='Select a topic shelf before resetting it.';noticeClass='error';render();return}
 const names=visibleShelves(),shelf=names.find(s=>s.id===shelfId);
 if(!shelf)return;
 const affected=collBooks().filter(b=>b.shelf===shelfId&&db.progress[b.id]?.placed);
 if(!affected.length){feedback='No placed books on this shelf to reset.';noticeClass='';render();return}
 if(!confirm('Return '+affected.length+' books from "'+shelf.name+'" to the unshelved stack? Shared books will also appear unshelved in other views. Previous recall history will be kept.'))return;
 const result=commitStudyAction(candidate=>{
  for(const book of affected){
   const p=candidate.progress[book.id];if(!p?.placed)continue;
   p.placementHistory=[...(p.placementHistory||[]),{type:'reset',at:Date.now(),previousAttempts:p.attempts||0,previousMethod:p.placementMethod||'legacy'}];
   p.placed=false;p.attempts=0;p.placementMethod=null;
  }
  candidate.queueByCollection[coll]=validQueue(candidate,coll);
  return {ok:true};
 });
 if(!result)return;
 nextFromQueue();feedback='Reset '+affected.length+' books on '+shelf.name+'.';noticeClass='success';render();
}
// Stable study order: visible shelf order first, original insertion order within a shelf.
// Never use the randomized/deferred queue for Browse navigation.
function resetRemainingOrder(){
 if(mode==='browse')return;
 const result=commitStudyAction(candidate=>{
  const eligible=new Set(booksForCollection(candidate,coll).filter(b=>!candidate.progress[b.id]?.placed).map(b=>b.id));
  candidate.queueByCollection[coll]=defaultBookOrder(coll,candidate).filter(id=>eligible.has(id));
  return {ok:true};
 });
 if(!result)return;
 selected=null;showBody=false;feedback='Remaining books restored to the current shelf order.';noticeClass='success';render();
}
function shuffleRemaining(){
 if(mode==='browse')return;
 const result=commitStudyAction(candidate=>{
  const q=validQueue(candidate,coll);
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]]}
  candidate.queueByCollection[coll]=q;return {ok:true};
 });if(!result)return;nextFromQueue();feedback='Remaining books shuffled.';noticeClass='success';render();
}
function collBooks(){return displayBooks(db,coll)}
function currentProgress(b){return db.progress[b.id]||{placed:false,attempts:0}}function remainingBooks(){return collBooks().filter(b=>!currentProgress(b).placed)}function setOrder(){order=validQueue(db)}function getActive(){return collBooks().find(b=>b.id===selected)}
function switchRoom(){editBookId='';const arr=db.collections.filter(c=>c.room===room);if(!arr.some(c=>c.id===coll))coll=arr[0]?.id||'';filterShelf='';selected=null;showBody=false;setOrder();render()}
function renderHome(){
 $('homeRooms').innerHTML=db.rooms.map(r=>{const n=db.collections.filter(c=>c.room===r.id).length;return `<button class="room-tile" data-enter-room="${esc(r.id)}" type="button"><span class="room-illustration" aria-hidden="true">▥</span><strong>${esc(roomDisplayName(r))}</strong><span>${n} ${n===1?'bookshelf':'bookshelves'}</span><span class="room-enter">Enter room</span></button>`}).join('')+`<button class="room-tile create-room-tile" id="homeCreateRoom" type="button"><span class="room-illustration" aria-hidden="true">+</span><strong>Create a room</strong><span>Start a new course</span></button>`;
}
function showCatalog(){
 openModal(`<h2>Course library</h2><p class="smalltext">Add the course you need. Your existing library is unchanged.</p><div id="catalogList">${catalogStarter.rooms.map(r=>`<div class="catalog-entry"><strong>${esc(roomDisplayName(r))}</strong><p class="smalltext">${esc(datasets.catalogEntries?.find(x=>x.roomId===r.id)?.term||'Fall 2026')} · Study material</p><button class="btn" type="button" data-install-course="${esc(r.id)}" ${db.rooms.some(x=>x.id===r.id)?'disabled':''}>${db.rooms.some(x=>x.id===r.id)?'Already added':'Add course'}</button>${r.id==='world'&&db.rooms.some(x=>x.id==='world')&&!db.collections.some(x=>x.id==='wh1-final-exam')&&catalogStarter.collections.some(x=>x.id==='wh1-final-exam')?'<button class="btn" type="button" data-install-final>Add Final Exam bookshelf</button>':''}</div>`).join('')}</div><button class="btn" id="closeModal">Close</button>`);
 $('catalogList').onclick=e=>{if(e.target.closest('[data-install-final]')){try{if(safeCommit(installBookshelf(db,catalogStarter,'wh1-final-exam'))){closeModal();room='world';coll='wh1-final-exam';openRoom('world')}}catch(error){alert(error.message)}return}const button=e.target.closest('[data-install-course]');if(!button)return;try{const candidate=installCourse(db,catalogStarter,button.dataset.installCourse);if(safeCommit(candidate)){closeModal();openRoom(button.dataset.installCourse)}}catch(error){alert(error.message)}};
}
function feedbackDialog(){
 const diagnostic={version:APP_VERSION,browser:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},theme,layout:studyLayout,studyMode:mode};
 openModal(`<h2>Feedback and contributions</h2><p>Report a bug, request a feature, or suggest a study-content correction through the public GitHub project. GitHub requires an account for issue submission. Studying never requires an account.</p><p><a href="https://github.com/SaakeJR/memory-shelves/issues/new/choose" target="_blank" rel="noopener noreferrer">Open feedback on GitHub</a></p><details><summary>Optional diagnostic details</summary><p>Review before including in a report. No books, progress or personal data are included automatically.</p><textarea class="field" id="feedbackDiagnostic" readonly rows="8">${esc(JSON.stringify(diagnostic,null,2))}</textarea><button class="btn" type="button" id="downloadDiagnostic">Download diagnostics</button></details><h3>Contribute a course</h3><p>Submit only study material you have permission to redistribute. Include course, instructor, academic term and source information. Contributions require maintainer review and are never published automatically.</p><button class="btn" type="button" id="contributeExport" ${db.rooms.length?'':'disabled'}>Export a room for contribution</button><p><a href="https://github.com/SaakeJR/memory-shelves/issues/new/choose" target="_blank" rel="noopener noreferrer">Propose a course on GitHub</a></p><button class="btn" id="closeModal">Close</button>`);
 $('downloadDiagnostic').onclick=()=>downloadJsonFile(diagnostic,'memory-shelves-diagnostics.json');$('contributeExport').onclick=exportScopeDialog;
}
function showHome(){editMode=false;view='home';render();window.scrollTo({top:0,behavior:'instant'});}
function openRoom(roomId){room=roomId;view='study';switchRoom();window.scrollTo({top:0,behavior:'instant'});}

function render(){
 const shelfScroll=new Map([...document.querySelectorAll('#shelves .bookrow')].map(row=>[row.closest('[data-shelf]').dataset.shelf,row.scrollLeft]));
 $('homeScreen').hidden=view!=='home';$('studyLayout').hidden=view==='home';
 $('homeTab').classList.toggle('active',view==='home');
 renderHome();
if(!db.rooms.some(r=>r.id===room))room=db.rooms[0]?.id||'';if(!db.collections.some(c=>c.id===coll&&c.room===room))coll=db.collections.find(c=>c.room===room)?.id||'';const current=db.collections.find(c=>c.id===coll),shelfList=visibleShelves(),all=collBooks(),placed=all.filter(b=>currentProgress(b).placed).length,correct=all.filter(b=>currentProgress(b).placed&&currentProgress(b).placementMethod!=='auto'&&currentProgress(b).attempts===1).length,attempted=all.filter(b=>currentProgress(b).attempts>0).length;$('studyTab').classList.toggle('active',view==='study');$('editLibraryBtn').hidden=view==='home';$('editLibraryBtn').setAttribute('aria-pressed',String(editMode));$('editLibraryBtn').textContent=editMode?'Done editing':'Edit library';$('studyLayout').classList.toggle('editing-library',editMode);$('quickEditRoom').disabled=!room;$('quickAddCollection').disabled=!room;$('quickEditCollection').disabled=!coll;$('quickAddShelf').disabled=!coll;$('reorderShelvesBtn').disabled=shelfList.length<2;$('quickEditShelf').disabled=!filterShelf||!shelfList.some(sh=>sh.id===filterShelf);$('quickAddBook').disabled=!shelfList.length;$('quickEditBook').disabled=!all.length;$('roomSel').innerHTML=db.rooms.map(r=>`<option value="${esc(r.id)}">${esc(roomDisplayName(r))}</option>`).join('');$('roomSel').value=room;$('collectionSel').innerHTML=db.collections.filter(c=>c.room===room).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('collectionSel').value=coll;document.querySelectorAll('[data-study-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.studyMode===mode)));$('roomTitle').textContent=roomDisplayName(db.rooms.find(r=>r.id===room));$('subtitle').textContent=current?.name||'Add a bookshelf to begin';$('cabinetTitle').textContent=current?.name.replace(/^(Exam 2|Quiz 2): /,'')||'Bookshelf';$('prog').textContent=placed+'/'+all.length;$('progbar').style.width=(all.length?placed/all.length*100:0)+'%';$('accuracy').textContent='First-attempt placements: '+correct+' of '+attempted+' attempted';// The all-shelves control is always first. Individual topic views also filter the unsorted stack.
if(filterShelf&&!shelfList.some(s=>s.id===filterShelf))filterShelf='';$('quickEditShelf').disabled=!filterShelf;
const shelfOptions=[{id:'',name:'Show all shelves'},...shelfList];
$('shelfNav').innerHTML=shelfOptions.map(s=>`<button class="item ${filterShelf===s.id?'active':''}" data-filter="${esc(s.id)}" aria-pressed="${filterShelf===s.id}">${esc(s.name)}${s.id?` <span class="muted tiny">(${all.filter(b=>b.shelf===s.id).length})</span>`:''}</button>`).join('');
$('mobileShelfSel').innerHTML=shelfOptions.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}${s.id?' ('+all.filter(b=>b.shelf===s.id).length+')':''}</option>`).join('');
$('mobileShelfSel').value=filterShelf;
$('bookSel').innerHTML='<option value="">Choose a book</option>'+all.filter(b=>!filterShelf||b.shelf===filterShelf).map(b=>`<option value="${esc(b.id)}">${esc(b.title.slice(0,90))}</option>`).join('');$('bookSel').value=all.some(b=>b.id===editBookId)?editBookId:'';
$('shelves').innerHTML=shelfList.filter(s=>!filterShelf||s.id===filterShelf).map((s)=>{const books=all.filter(b=>b.shelf===s.id&&(mode==='browse'||currentProgress(b).placed));return`<section class="shelf" data-shelf="${esc(s.id)}" tabindex="0" role="group" aria-label="Shelf ${esc(s.name)}. Press Enter to place the selected book"><div class="bookrow" tabindex="0" role="region" aria-label="Books on ${esc(s.name)}. Scroll sideways for more books.">${books.map((b,i)=>bookHTML(b,false)).join('')}</div><div class="shelfplank"></div><div class="shelfname"><span class="shelf-title-text">${esc(s.name)}</span><button type="button" class="shelf-reset-btn" ${mode==='browse'?'hidden':''} data-reset-shelf="${esc(s.id)}" aria-label="Reset shelf ${esc(s.name)}" title="Reset this shelf" ${all.some(b=>b.shelf===s.id&&currentProgress(b).placed)?'':'disabled'}>↺ <span class="shelf-reset-caption">Reset</span></button></div></section>`}).join('')||'<div class="empty">No shelves yet. Add a shelf to start.</div>';
for(const row of document.querySelectorAll('#shelves .bookrow'))row.scrollLeft=shelfScroll.get(row.closest('[data-shelf]').dataset.shelf)||0;
const remaining=remainingBooks();
const scopedRemaining=remaining.filter(b=>!filterShelf||b.shelf===filterShelf);
const scopedAll=all.filter(b=>!filterShelf||b.shelf===filterShelf);
const displayedPool=(mode==='browse')?scopedAll:scopedRemaining;
// A selected book must always belong to the currently displayed group.
if(selected&&!displayedPool.some(b=>b.id===selected)){selected=null;showBody=false}
if(!selected&&scopedRemaining.length&&mode!=='browse'&&view==='study')selected=order.find(bid=>scopedRemaining.some(b=>b.id===bid))||scopedRemaining[0].id;
if(!selected&&mode==='browse'&&view==='study'&&scopedAll.length){const initialOrder=defaultBookOrder();selected=[...scopedAll].sort((a,b)=>initialOrder.indexOf(a.id)-initialOrder.indexOf(b.id))[0].id;}
$('rightHeading').textContent=(mode==='browse'?'Your books':'Unsorted book stack')+(filterShelf?' · '+(shelfList.find(s=>s.id===filterShelf)?.name||''):'');
$('remaining').textContent=scopedRemaining.length+' remaining'+(filterShelf?' on this shelf':'');
$('cardEyebrow').textContent=mode==='browse'&&view==='study'?'CURRENT BOOK':'CURRENT STUDY CARD';
$('prevBtn').hidden=mode!=='browse'||view!=='study';
$('prevBtn').disabled=mode!=='browse'||view!=='study'||!scopedAll.length;
$('nextBtn').disabled=!(mode==='browse'?scopedAll.length:scopedRemaining.length);
const browsing=(mode==='browse');
const listOrder=browsing?defaultBookOrder():order;
const position=new Map(listOrder.map((id,i)=>[id,i]));
let shown=[...displayedPool].sort((a,b)=>(browsing?0:(a.id===selected?-1:b.id===selected?1:0))||(position.get(a.id)??999999)-(position.get(b.id)??999999));$('deck').innerHTML=shown.map(b=>bookHTML(b,true)).join('')||`<div class="empty">${filterShelf?'No remaining books for this shelf. Choose Show all shelves to study another topic.':'All books placed, or no books in this bookshelf.'}</div>`;
$('feedback').innerHTML=feedback?`<div class="notice ${noticeClass}">${esc(feedback)}</div>`:'';const active=getActive();for(const id of ['resetBtn','shuffleBtn','resetOrderBtn'])$(id).disabled=mode==='browse';const reverse=mode==='reverse'&&view==='study',bodyVisible=reverse||showBody||mode==='place'||mode==='browse';
$('detail').innerHTML=active?`<article class="card"><div class="source">${esc(active.source||'Custom study card')}</div>${reverse&&!showBody?'<div class="hidden-term-note">Term hidden</div>':`<h3>${esc(active.title)}</h3>`}${bodyVisible?`<p class="definition-text">${esc(reverse&&!showBody?studyDefinition({...active,body:displayBody(active)}):cleanDefinition({...active,body:displayBody(active)}))}</p>`:'<p>Recall the definition before revealing it.</p>'}${(mode==='recall'||mode==='reverse')?`<button class="btn primary card-reveal" id="revealBtn" type="button" ${showBody?'disabled':''}>${showBody?'Answer revealed':'Reveal answer'}</button>`:''}</article>`:'<div class="empty">Select a book to view its details.</div>';

$('activeBookDock').innerHTML=active&&view==='study'&&mode!=='browse'&&!currentProgress(active).placed?`<div class="active-book-dock-label"><strong>Current book, ready to place</strong><span>Drag this spine or tap its destination shelf.</span></div>${bookHTML(active,true)}`:'';
$('activeBookDock').hidden=!active||view!=='study'||mode==='browse'||!!(active&&currentProgress(active).placed);
$('stackToggle').textContent=stackCollapsed?'Expand stack':'Collapse stack';$('stackToggle').setAttribute('aria-expanded',String(!stackCollapsed));$('deck').hidden=stackCollapsed;
$('studyLayout').querySelector('.study-desk')?.classList.toggle('stack-collapsed',stackCollapsed);
$('revealActions').innerHTML='';
if(active&&view==='study'&&mode!=='browse'&&!currentProgress(active).placed){
 $('revealActions').insertAdjacentHTML('beforeend',`<div class="quick-actions" role="group" aria-label="Study queue actions"><button class="btn primary" id="autoPlaceBtn" type="button" >Auto Place (I know it)</button><button class="btn" id="deferBottomBtn" type="button">Bottom of Stack (Keep studying)</button><button class="btn" id="deferRandomBtn" type="button">Shuffle Back (Keep studying)</button></div>`);
}

if(remaining.length===0&&all.length>0&&view==='study'&&mode!=='browse')$('feedback').innerHTML='<div class="notice success">Completed. All books are on their shelves. Reset bookshelf to practice again.</div>';
}
function bookHTML(b,stack){let color=colors[b.color%colors.length]||colors[0],hide=stack&&mode==='reverse'&&view==='study'&&!(showBody&&selected===b.id);let display=String(b.shortLabel||b.title);let label=hide?'Unknown term':stack?(display.length>32?display.slice(0,31).trimEnd()+'…':display):(display.length>29?display.slice(0,27)+'…':display);return`<button class="book ${stack?'unplaced':''} ${selected===b.id?'selected':''}" data-book="${esc(b.id)}" style="--cover:${color};${stack?'':'height:'+(52+b.id.length%30)+'px;width:'+(20+b.id.length%13)+'px'}" ${hide?'':`title="${esc(b.title.length>180?b.title.slice(0,179)+'…':b.title)}"`} aria-label="${hide?'Select an unidentified book to recall its term':'Open book '+esc(b.title.length>180?b.title.slice(0,179)+'…':b.title)}" draggable="${stack&&mode!=='browse'}"><span>${esc(label)}</span></button>`}

function pickBook(bookId){const book=collBooks().find(b=>b.id===bookId);if(!book)return;if(mode!=='browse'&&currentProgress(book).placed){openModal(`<h2>${esc(book.title)}</h2><p class="restudy-definition">${esc(cleanDefinition({...book,body:displayBody(book)}))}</p><p class="smalltext">${esc(book.source||'Custom study card')}</p><div class="row"><button class="btn primary" id="restudyBook" type="button">Return to Unsorted (Restudy)</button><button class="btn" id="closeModal" type="button">Close</button></div>`);$('restudyBook').onclick=()=>{if(mode==='browse')return;if(!commitStudyAction(candidate=>returnBook(candidate,coll,book.id)))return;closeModal();feedback='Book returned to the bottom of the unsorted stack.';noticeClass='success';render()};return}if(selected===bookId)return;selected=bookId;showBody=false;feedback='';render();$('detail').scrollTop=0;}function place(sid){
 const b=getActive();if(!b){feedback='Select a book first.';render();return}
 if(mode==='browse'||currentProgress(b).placed)return;
 const result=commitStudyAction(candidate=>recordPlacement(candidate,coll,b.id,sid));
 if(!result)return;
 if(result.correct){nextFromQueue();feedback='Correct. Book placed on its assigned shelf.';noticeClass='success'}
 else{feedback='Not this shelf. Review and try again.';noticeClass='error'}
 render();
}
let modalOpener=null;
function openModal(html){
 if(!$('backdrop'))modalOpener=document.activeElement;
 $('modalHost').innerHTML=`<div class="modal-bg" id="backdrop"><div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
 const modal=$('modalHost').querySelector('.modal');const title=modal.querySelector('h2');if(title){title.id='dialogTitle';modal.setAttribute('aria-labelledby','dialogTitle')}
 $('closeModal')?.addEventListener('click',closeModal);$('backdrop').addEventListener('click',e=>{if(e.target===$('backdrop'))closeModal()});modal.focus();
 modal.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);if(!items.length){e.preventDefault();return}const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modal)){e.preventDefault();first.focus()}});
}
function closeModal(){$('modalHost').innerHTML='';$('addSetBtn').classList.remove('active');if(modalOpener?.isConnected)modalOpener.focus();modalOpener=null;}function inputField(name,label,value='',kind='input'){const optional=/\boptional\b/i.test(label);return`<label>${label}${kind==='textarea'?`<textarea class="field" name="${name}" rows="5" required>${esc(value)}</textarea>`:`<input class="field" name="${name}" value="${esc(value)}" ${optional?'':'required'}>`}</label>`}
function displayBody(book){return ['theology-quiz4-049','theology-quiz4-050'].includes(book.id)?book.body.replace('click Manage in the top bar, then Edit selected card.','click Edit library in the top bar, select the verse in Books, then Edit book.'):book.body;}
function bookForm(edit=false,bookId=selected){let b=edit?db.books.find(x=>x.id===bookId):null;const options=db.shelves.filter(s=>db.collections.find(c=>c.id===s.collection)?.room===room);openModal(`<h2>${edit?'Edit book':'Add a book'}</h2><form id="bookForm" class="formgrid">${inputField('title','Full term or question',b?.title||'')}${inputField('shortLabel','Optional short spine label (max 90)',b?.shortLabel||'')}${`<label>Shelf<select class="field" name="shelf">${options.map(s=>`<option value="${esc(s.id)}" ${s.id===(b?.shelf||filterShelf||options.find(s=>s.collection===coll)?.id||options[0]?.id)?'selected':''}>${esc(db.collections.find(c=>c.id===s.collection)?.name)} / ${esc(s.name)}</option>`).join('')}</select></label>`}<div class="full">${inputField('body','Inside of book / facts',b?displayBody(b):'','textarea')}</div>${inputField('source','Source or reference (optional)',b?.source||'Personal entry')}<label>Cover color<select class="field" name="color"><option value="auto" ${!edit?'selected':''}>Auto (cycle through 7 styles)</option>${colors.map((c,i)=>`<option value="${i}" ${edit&&i===b?.color?'selected':''}>Style ${i+1}</option>`).join('')}</select></label><div class="full row"><button class="btn primary" type="submit">Save book</button>${edit?'<button class="btn warn" id="deleteBookFromEditor" type="button">Delete book</button>':''}<button type="button" class="btn" id="closeModal">Cancel</button></div></form>`);$('closeModal').onclick=closeModal;$('bookForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);let book={id:b?.id||id(),title:String(fd.get('title')).trim(),shortLabel:String(fd.get('shortLabel')||'').trim(),body:String(fd.get('body')).trim(),shelf:String(fd.get('shelf')),source:String(fd.get('source')).trim(),color:fd.get('color')==='auto'?null:Number(fd.get('color'))};if(!book.title||!book.body||!book.shelf)return;if(book.title.length>MAX_TITLE_LENGTH||book.body.length>MAX_BODY_LENGTH||book.shortLabel.length>90){alert('Book title must be at most '+MAX_TITLE_LENGTH+' characters and content at most '+MAX_BODY_LENGTH+' characters, with a short label no longer than 90 characters. Title: '+book.title.length+', content: '+book.body.length+'.');return}book.shelf=db.shelves.find(s=>s.id===book.shelf)?.sourceShelf||book.shelf;const ok=libraryTransaction(draft=>{if(book.color===null)book.color=draft.books.length%colors.length;if(b){const original=draft.books.find(x=>x.id===b.id);if(original)Object.assign(original,book)}else draft.books.push(book)});if(!ok)return;closeModal();selected=book.id;showBody=true;render()};if(edit)$('deleteBookFromEditor').onclick=()=>{if(!b||!confirm('Delete the book '+b.title+' and its saved progress?'))return;const ok=libraryTransaction(draft=>{draft.books=draft.books.filter(x=>x.id!==b.id);delete draft.progress[b.id]},{destructive:true});if(ok){selected=null;closeModal();render()}}}
function libraryTransaction(change,{destructive=false}={}){
 const previous=structuredClone(db),draft=structuredClone(db);
 try{
  change(draft);
  verifyLibrary(draft);
  // A failed write never replaces the currently loaded library.
  repository.save(draft,{recovery:destructive?previous:null});
  db=draft;setOrder();render();return true;
 }catch(error){alert('Change not saved: '+error.message);return false}
}
function getLibrarySelection(type){
 if(type==='room')return db.rooms.find(x=>x.id===room);
 if(type==='collection')return db.collections.find(x=>x.id===coll);
 if(type==='shelf')return db.shelves.find(x=>x.id===filterShelf&&x.collection===coll);
 if(type==='book')return db.books.find(x=>x.id===editBookId)||getActive();
}
function reorderShelvesDialog(){
 if(!editMode||visibleShelves().length<2)return;
 const collectionId=coll, shelves=visibleShelves(), names=new Map(shelves.map(s=>[s.id,s.name]));
 let proposed=shelves.map(s=>s.id);
 openModal(`<h2>Reorder shelves</h2><p>Move shelves up or down. Saving restores the remaining books to this order without clearing placement progress.</p><div id="shelfOrderList"></div><p class="row"><button class="btn primary" id="saveShelfOrder" type="button">Save order</button><button class="btn" id="closeModal" type="button">Cancel</button></p>`);
 function paint(focusId,delta){
  $('shelfOrderList').innerHTML=proposed.map((key,i)=>`<div class="row" style="margin-block:8px"><span style="flex:1">${i+1}. ${esc(names.get(key))}</span><button type="button" class="btn" data-order-index="${i}" data-delta="-1" aria-label="Move ${esc(names.get(key))} up" ${i===0?'disabled':''}>↑</button><button type="button" class="btn" data-order-index="${i}" data-delta="1" aria-label="Move ${esc(names.get(key))} down" ${i===proposed.length-1?'disabled':''}>↓</button></div>`).join('');
  if(focusId){const i=proposed.indexOf(focusId);const target=$('shelfOrderList').querySelector(`[data-order-index="${i}"][data-delta="${delta}"]:not(:disabled)`)||$('shelfOrderList').querySelector(`[data-order-index="${i}"]:not(:disabled)`);target?.focus();}
 }
 $('shelfOrderList').onclick=e=>{const b=e.target.closest('[data-order-index]');if(!b)return;const i=Number(b.dataset.orderIndex),d=Number(b.dataset.delta),j=i+d;if(j<0||j>=proposed.length)return;const key=proposed[i];[proposed[i],proposed[j]]=[proposed[j],proposed[i]];paint(key,d);};
 $('closeModal').onclick=closeModal;$('saveShelfOrder').onclick=()=>{if(proposed.every((key,i)=>key===shelves[i].id)){closeModal();return;}if(libraryTransaction(draft=>reorderShelves(draft,collectionId,proposed))){selected=null;showBody=false;feedback='Shelf order saved.';noticeClass='success';closeModal();render();}};paint();
}
$('reorderShelvesBtn').onclick=reorderShelvesDialog;
function quickEditor(type,edit=false){
 if(type==='book'){
  if(edit){const b=getLibrarySelection('book');if(!b){alert('Choose a book first.');return}bookForm(true,b.id)}else bookForm(false);
  return;
 }
 const entity=edit?getLibrarySelection(type):null;
 if(edit&&!entity){alert('Choose a '+(type==='collection'?'bookshelf':type)+' first.');return}
 const noun={room:'room',collection:'bookshelf',shelf:'shelf'}[type];
 const currentName=entity?.name||'';
 openModal(`<h2>${edit?'Edit':'Create'} ${noun}</h2><form id="quickEditorForm"><label>${noun[0].toUpperCase()+noun.slice(1)} name<input class="field" name="name" required maxlength="160" value="${esc(currentName)}"></label>${type==='room'?`<label>Professor (optional)<input class="field" name="professor" maxlength="160" value="${esc(entity?.professor||'')}"></label>`:''}<p class="row"><button class="btn primary" type="submit">${edit?'Save changes':'Create '+noun}</button>${edit?'<button class="btn warn" id="quickDelete" type="button">Delete '+noun+'</button>':''}<button class="btn" id="closeModal" type="button">Cancel</button></p></form>`);
 $('closeModal').onclick=closeModal;
 $('quickEditorForm').onsubmit=e=>{e.preventDefault();const form=new FormData(e.target);const name=String(form.get('name')||'').trim(),professor=String(form.get('professor')||'').trim();if(!name)return;
  const nextId=entity?.id||id();if(!edit&&type!=='room'&&!(type==='collection'?room:coll)){alert('Select a parent '+(type==='collection'?'room':'bookshelf')+' first.');return}
  const ok=libraryTransaction(state=>{
   if(edit){const list=type==='room'?state.rooms:type==='collection'?state.collections:state.shelves;const target=list.find(x=>x.id===nextId);target.name=name;if(type==='room')target.professor=professor}
   else if(type==='room')state.rooms.push({id:nextId,name,professor});
   else if(type==='collection')state.collections.push({id:nextId,room,name});
   else state.shelves.push({id:nextId,collection:coll,name});
  });if(ok){if(type==='room'){room=nextId;coll=db.collections.find(c=>c.room===room)?.id||'';view='study';editMode=true;}if(type==='collection'){coll=nextId;filterShelf=''}if(type==='shelf')filterShelf=nextId;closeModal();setOrder();render()}
 };
 if(edit)$('quickDelete').onclick=()=>deleteLibraryEntity(type,entity);
}
function deleteLibraryEntity(type,entity){
 const plan=deletionPlan(db,type,entity.id);
 const {collectionIds,shelfIds,affected,alternatives}=plan;
 if(type==='shelf'&&affected.length){
  const options=alternatives.map(sh=>`<option value="${esc(sh.id)}">${esc(sh.name)}</option>`).join('');
  openModal(`<h2>Delete populated shelf?</h2><p>This shelf contains <strong>${affected.length} books</strong>. Move them to another shelf first. Deleting without moving permanently removes these books from the entire bookshelf and any linked views.</p><label>Move books to<select class="field" id="moveDestination"><option value="">Choose another shelf</option>${options}</select></label><p class="row"><button id="moveThenDelete" type="button" class="btn primary" ${alternatives.length?'':'disabled'}>Move books and delete shelf</button><button id="eraseShelf" type="button" class="btn warn">Permanently delete ${affected.length} books and shelf</button><button id="closeModal" class="btn" type="button">Cancel</button></p>`);
  $('closeModal').onclick=closeModal;
  $('moveThenDelete').onclick=()=>{const destination=$('moveDestination').value;if(!destination){alert('Choose another shelf.');return}if(!confirm('Move '+affected.length+' books to the selected shelf and delete the empty shelf?'))return;const ok=libraryTransaction(draft=>applyDeletion(draft,plan,{destination}),{destructive:true});if(ok){filterShelf=destination;closeModal();render()}};
  $('eraseShelf').onclick=()=>confirmFinalDelete(plan);
  return;
 }
 confirmFinalDelete(plan);
}
function confirmFinalDelete(plan){
 const {type,entity,affected}=plan;
 const noun={room:'room',collection:'bookshelf',shelf:'shelf'}[type];
 const scope=type==='room'?`Every bookshelf, shelf, book and progress record in this room will be deleted.`:type==='collection'?`Every shelf, book and progress record owned by this bookshelf will be deleted. Linked views of those shelves will also be removed.`:entity.sourceShelf?'This is a linked view. Its original source books remain in their owning bookshelf.':`${affected.length} books and their progress will be deleted, including their presence in linked views.`;
 openModal(`<h2>Delete ${noun}?</h2><p><strong>${esc(entity.name)}</strong></p><p>${scope}</p><p><strong>${affected.length} books</strong> affected. You can download a backup first from Settings. This cannot be automatically synchronized or undone on another device.</p><label>Type DELETE to confirm<input class="field" id="typeDelete" autocomplete="off"></label><p class="row"><button class="btn warn" id="confirmDeleteEntity" disabled type="button">Delete permanently</button><button class="btn" id="closeModal" type="button">Cancel</button></p>`);
 $('closeModal').onclick=closeModal;$('typeDelete').oninput=()=>{$('confirmDeleteEntity').disabled=$('typeDelete').value!=='DELETE'};
 $('confirmDeleteEntity').onclick=()=>{if($('typeDelete').value!=='DELETE')return;const ok=libraryTransaction(draft=>applyDeletion(draft,plan),{destructive:true});if(ok){if(type==='room'){room=db.rooms[0]?.id||'';coll=db.collections.find(c=>c.room===room)?.id||''}else if(type==='collection'){coll=db.collections.find(c=>c.room===room)?.id||''}filterShelf='';selected=null;closeModal();render()}
 };
}
// Share files have a distinct envelope and NEVER include placement progress or other rooms.
function downloadJsonFile(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportScopeDialog(){openModal(`<h2>Export a room or bookshelf</h2><p class="smalltext">Share a copy of study material. Personal progress and other rooms are excluded.</p><label>Export scope<select class="field" id="shareScope"><option value="room">One complete room</option><option value="bookshelf">One bookshelf</option></select></label><label>Room<select class="field" id="shareRoom">${db.rooms.map(r=>`<option value="${esc(r.id)}">${esc(roomDisplayName(r))}</option>`).join('')}</select></label><label id="shareCollectionWrap">Bookshelf<select class="field" id="shareCollection"></select></label><p class="row"><button class="btn primary" type="button" id="shareDownload">Download shared JSON</button><button class="btn" id="closeModal" type="button">Cancel</button></p>`);
 $('closeModal').onclick=closeModal;$('shareRoom').value=db.rooms.some(r=>r.id===room)?room:db.rooms[0]?.id||'';
 const refresh=()=>{$('shareCollectionWrap').hidden=$('shareScope').value!=='bookshelf';$('shareCollection').innerHTML=db.collections.filter(c=>c.room===$('shareRoom').value).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')};
 $('shareRoom').onchange=refresh;$('shareScope').onchange=refresh;refresh();
 $('shareDownload').onclick=()=>{try{const data=snapshotExport($('shareScope').value,$('shareRoom').value,$('shareCollection').value);downloadJsonFile(data,`memory-shelves-${data.scope}-${data.room.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`)}catch(e){alert(e.message)}};
}
function sharedImportDialog(){openModal(`<h2>Import a shared room or bookshelf</h2><p class="smalltext">Imports add independent copies. No progress is imported and existing study material is not replaced.</p><label>Shared Memory Shelves JSON<input id="sharedImportFile" class="field" type="file" accept=".json,application/json"></label><div id="sharedImportStatus" role="status"></div><div id="sharedDestination" hidden><label>Destination room for shared bookshelf<select class="field" id="sharedTargetRoom">${db.rooms.map(r=>`<option value="${esc(r.id)}">${esc(roomDisplayName(r))}</option>`).join('')}</select></label></div><p class="row"><button class="btn primary" id="confirmSharedImport" disabled type="button">Import copy</button><button class="btn" id="closeModal" type="button">Cancel</button></p>`);
 $('closeModal').onclick=closeModal;let input=null;
 $('sharedImportFile').onchange=async e=>{input=null;$('confirmSharedImport').disabled=true;try{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024)throw Error('File exceeds 5 MB.');const candidate=JSON.parse(await file.text());const preview=importSharedData(candidate,db.rooms[0]?.id);input=candidate;$('sharedDestination').hidden=input.scope!=='bookshelf';$('sharedTargetRoom').value=room;$('sharedImportStatus').textContent=`Ready to import ${input.scope}: ${input.room.name}, ${input.collections.length} bookshelves and ${preview.count} books.`;$('confirmSharedImport').disabled=false}catch(err){$('sharedImportStatus').textContent='Import rejected: '+err.message}};
 $('confirmSharedImport').onclick=()=>{if(!input)return;try{const plan=importSharedData(input,input.scope==='bookshelf'?$('sharedTargetRoom').value:'');if(!safeCommit(plan.candidate))return;room=plan.roomId;coll=plan.collectionId;selected=null;filterShelf='';view='study';setOrder();closeModal();render()}catch(e){alert('Import rejected: '+e.message)}};
}
function fullRestoreDialog(){openModal(`<h2>Restore full library backup</h2><p><strong>Warning:</strong> This replaces every room, bookshelf, book, and progress record on this device. Download a full backup first.</p><label>Choose backup JSON<input type="file" accept=".json,application/json" class="field" id="restoreFile"></label><label>Type RESTORE to confirm<input id="restorePhrase" class="field" autocomplete="off"></label><p class="row"><button id="restoreConfirm" class="btn warn" type="button">Replace library</button><button id="closeModal" class="btn" type="button">Cancel</button></p>`);$('closeModal').onclick=closeModal;$('restoreConfirm').onclick=async()=>{if($('restorePhrase').value!=='RESTORE'){alert('Type RESTORE to proceed.');return}const f=$('restoreFile').files?.[0];if(!f)return;try{if(f.size>10*1024*1024)throw Error('Backup exceeds 10 MB.');const input=JSON.parse(await f.text());const restored=normalizeLibrary(input,datasets);const old=structuredClone(db);if(!safeCommit(restored,{recovery:old}))return;room=db.rooms[0]?.id||'';coll=db.collections.find(c=>c.room===room)?.id||'';filterShelf='';selected=null;closeModal();setOrder();render()}catch(e){alert('Restore failed: '+e.message)}}}
function recoverPreviousLibrary(){const raw=localStorage.getItem(RECOVERY_KEY);if(!raw){alert('No recovery snapshot is available.');return}try{const prior=normalizeLibrary(JSON.parse(raw),datasets);if(!confirm('Restore the last recovery snapshot? This replaces the current local library.'))return;if(!safeCommit(prior,{recovery:structuredClone(db)}))return;room=db.rooms[0]?.id||'';coll=db.collections.find(c=>c.room===room)?.id||'';closeModal();render()}catch(e){alert('Recovery failed: '+e.message)}}

$('roomSel').onchange=e=>{room=e.target.value;switchRoom()};$('mobileShelfSel').onchange=e=>{filterShelf=e.target.value;selected=null;showBody=false;feedback='';render()};$('collectionSel').onchange=e=>{editBookId='';coll=e.target.value;filterShelf='';selected=null;setOrder();render()};$('homeTab').onclick=showHome;$('studyTab').onclick=()=>{if(!db.rooms.length){showCatalog();return}view='study';mode=lastStudyMethod;selected=null;showBody=false;render()};for(const [button,type,edit] of [['quickAddRoom','room',false],['quickEditRoom','room',true],['quickAddCollection','collection',false],['quickEditCollection','collection',true],['quickAddShelf','shelf',false],['quickEditShelf','shelf',true],['quickAddBook','book',false],['quickEditBook','book',true]])$(button).onclick=()=>quickEditor(type,edit);$('bookSel').onchange=e=>{editBookId=e.target.value;};$('shuffleBtn').onclick=shuffleRemaining;$('resetOrderBtn').onclick=resetRemainingOrder;$('stackToggle').onclick=()=>{stackCollapsed=!stackCollapsed;render()};$('resetBtn').onclick=()=>{if(mode==='browse')return;if(!confirm('Reset placements and attempt counts for this bookshelf? Your facts will remain saved.'))return;const ids=collBooks().map(b=>b.id);if(!commitStudyAction(candidate=>{for(const bid of ids)delete candidate.progress[bid];return {ok:true}}))return;selected=null;feedback='Bookshelf progress reset.';noticeClass='';setOrder();render()};function navigateBook(direction){
 const browsing=mode==='browse';
 if(direction<0&&!browsing)return;
 const pool=(browsing?collBooks():remainingBooks())
  .filter(b=>!filterShelf||b.shelf===filterShelf);
 if(!pool.length)return;
 const ids=browsing?defaultBookOrder():order;
 const positions=new Map(ids.map((id,i)=>[id,i]));
 pool.sort((a,b)=>(positions.get(a.id)??Number.MAX_SAFE_INTEGER)-(positions.get(b.id)??Number.MAX_SAFE_INTEGER));
 const index=pool.findIndex(b=>b.id===selected);
 selected=pool[(index<0?(direction>0?0:pool.length-1):(index+direction+pool.length)%pool.length)].id;
 showBody=false;feedback='';render();$('detail').scrollTop=0;
}
$('nextBtn').onclick=()=>navigateBook(1);
$('prevBtn').onclick=()=>navigateBook(-1);
$('expandBtn').onclick=()=>{const active=getActive();if(!active)return;const visible=showBody||mode==='place'||mode==='browse'||mode==='reverse';const reverseHidden=mode==='reverse'&&!showBody;const heading=reverseHidden?'':active.title;const overlay=document.createElement('div');overlay.className='expanded-book';overlay.id='expandedBook';overlay.innerHTML=`<div class="expanded-paper" role="dialog" aria-modal="true" aria-label="Expanded book"><div class="expanded-top"><span class="source">${esc(active.source||'Custom study card')}</span><button class="btn primary" id="closeExpanded">Close</button></div><div class="expanded-body">${reverseHidden?`<div class="hidden-term-note">Term hidden</div><p class="definition-text">${esc(studyDefinition({...active,body:displayBody(active)}))}</p>`:`<h2>${esc(heading)}</h2><p class="definition-text">${visible?esc(cleanDefinition({...active,body:displayBody(active)})):'Recall the facts associated with this title before revealing them.'}</p>`}</div></div>`;document.body.append(overlay);overlay.querySelector('#closeExpanded').onclick=()=>overlay.remove();overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});overlay.querySelector('#closeExpanded').focus()};
document.addEventListener('click',e=>{const reset=e.target.closest('[data-reset-shelf]');if(reset){resetSelectedShelf(reset.dataset.resetShelf);return}const book=e.target.closest('[data-book]');if(book){pickBook(book.dataset.book);return}const shelf=e.target.closest('[data-shelf]');if(shelf){place(shelf.dataset.shelf);return}const nav=e.target.closest('[data-filter]');if(nav){filterShelf=nav.dataset.filter;selected=null;showBody=false;feedback='';render();return}if(e.target.id==='autoPlaceBtn'){autoPlace();return}if(e.target.id==='deferBottomBtn'){deferSelected('bottom');return}if(e.target.id==='deferRandomBtn'){deferSelected('random');return}if(e.target.id==='revealBtn'){showBody=true;render()}});
document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-shelf]')){e.preventDefault();place(e.target.dataset.shelf);}if(e.key==='Escape'){document.getElementById('expandedBook')?.remove();closeModal()}});document.addEventListener('dragstart',e=>{const book=e.target.closest('[data-book]');if(book&&e.dataTransfer)e.dataTransfer.setData('text/plain',book.dataset.book)});document.addEventListener('dragover',e=>{const shelf=e.target.closest('[data-shelf]');if(shelf&&mode!=='browse'){e.preventDefault();shelf.classList.add('target')}});document.addEventListener('dragleave',e=>{const shelf=e.target.closest('[data-shelf]');if(shelf)shelf.classList.remove('target')});document.addEventListener('drop',e=>{const shelf=e.target.closest('[data-shelf]');if(shelf){e.preventDefault();document.querySelectorAll('.target').forEach(x=>x.classList.remove('target'));const dragged=e.dataTransfer.getData('text/plain');if(mode==='browse'||!collBooks().some(b=>b.id===dragged&&!currentProgress(b).placed&&(!filterShelf||b.shelf===filterShelf)))return;selected=dragged;place(shelf.dataset.shelf)}});

const STUDY_PROMPT=`I am creating a study set for Memory Shelves, a browser-based spatial memorization application. The app has rooms (courses), bookshelves (specific exams or units), topic shelves within each bookshelf, and books (one study card per fact or question). Each book has a title (the term, keyword, or complete exam question), a body (the definition, answer, or supporting facts), and an optional source reference. Students can practice either with the title shown and body hidden, or with the body shown and title hidden. Therefore both sides must be meaningful and avoid directly revealing the other side. Preserve the source definition in full, even if it repeats the term; Memory Shelves masks repeated answers during definition-first recall. Do not invent alternate wording. A brief optional shortLabel may help lengthy questions fit visually on book spines, but never shorten the full title or remove essential facts.

Using ONLY the notes I paste below, produce a single valid JSON object that can be imported into Memory Shelves. Return ONLY JSON, without markdown fences, preamble, comments, or explanatory text. The exact expected schema is:
{
  "room": "Course name",
  "bookshelf": "Exam or unit name",
  "shelves": [
    {
      "name": "Distinct, specific topic name",
      "books": [
        {
          "title": "Complete term or study question",
          "shortLabel": "Optional concise spine preview",
          "body": "Answer or definition, using original note wording",
          "source": "Optional source page or reference"
        }
      ]
    }
  ]
}

Limits: 1 to 100 shelves, at most 500 books per shelf and 1,000 books total; titles 1 to 2,000 characters, definitions 1 to 10,000 characters, topic names 1 to 160 characters, and optional shortLabel at most 90 characters. Each book requires title and body.

Rules: Preserve terminology, wording, names, and dates from my material as closely as possible. Do not introduce facts, quotations, interpretations, or assumptions not supported by the notes. Do not silently resolve ambiguities or fill missing answers. Group books into clearly distinct shelves based on content; prefer about 3–8 nonoverlapping topics when the material supports it. Avoid shelves with nearly identical titles, redundant copies of the same fact, and a single overfilled shelf. Keep every examinable fact. Books must remain useful for both title-first and definition-first recall: do not simply restate the title in the body. If a term is itself the answer to a question, preserve the actual question as the title and its answer as the body. Optional shortLabel is only for display, not a substitute for the complete title. If the provided notes have marked inclusion or exclusion rules, follow those exactly. Use JSON escaping properly and do not use trailing commas.

Here are my study notes:
[PASTE NOTES HERE]`;
function promptViewer(){
 openModal(`<h2>ChatGPT study-set prompt</h2><p class="smalltext">1. Select and copy the complete prompt below. 2. Paste it into ChatGPT with your own notes. 3. Copy the JSON response. 4. Return to Memory Shelves and choose <b>Create / Import</b>.</p><textarea id="visiblePrompt" class="field prompt-textarea" readonly aria-label="Complete study-set prompt">${esc(STUDY_PROMPT)}</textarea><div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" id="copyPromptVisible" type="button">Copy prompt</button><button class="btn" id="closeModal" type="button">Close</button></div>`);
 $('closeModal').onclick=closeModal;
 $('copyPromptVisible').onclick=()=>copyStudyPrompt('copyPromptVisible');
}
async function copyStudyPrompt(buttonId){
 const btn=$(buttonId);
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(STUDY_PROMPT);btn.textContent='Copied to clipboard'}
 catch(e){promptViewer();const area=$('visiblePrompt');area.focus();area.select();$('copyPromptVisible').textContent='Select all, then copy (Ctrl+C or Cmd+C)'}
}

const QUIZLET_PDF_PROMPT=STUDY_PROMPT.replace('Here are my study notes:\n[PASTE NOTES HERE]',`The source is the Quizlet printable PDF attached to this conversation. Extract EVERY term-definition pair shown in the actual PDF, preserving the author's wording and original pairing. Do not invent, correct, or supplement definitions. Remove only page headers, footers, page numbers, and interface controls, not study material. If a line is wrapped across pages, join it without changing the meaning. Group into distinct meaningful topic shelves without losing or duplicating cards. Check the final number of JSON books against the number of term-definition pairs in the PDF and report any unreadable, missing, or ambiguous items separately instead of guessing. Return ONLY the import JSON object and nothing else. If you cannot read the source or validate the count, say so instead of inventing content.`);
function printedQuizletPrompt(){openModal(`<h2>Convert a printable Quizlet PDF</h2><p class="smalltext">Attach the downloaded PDF in a new AI conversation, then paste this complete prompt. Review all terms, definitions, and the card count before importing.</p><textarea id="visiblePrintPrompt" class="field prompt-textarea" readonly>${esc(QUIZLET_PDF_PROMPT)}</textarea><div class="row"><button class="btn primary" id="copyPrintPrompt" type="button">Copy conversion prompt</button><button class="btn" id="closeModal" type="button">Close</button></div>`);$('closeModal').onclick=closeModal;$('copyPrintPrompt').onclick=async()=>{try{await navigator.clipboard.writeText(QUIZLET_PDF_PROMPT);$('copyPrintPrompt').textContent='Copied'}catch(e){const a=$('visiblePrintPrompt');a.focus();a.select();$('copyPrintPrompt').textContent='Selected: copy manually'}};}

function tutorial(){
const topics=[
 ['Getting started',`Open <b>Course library</b> to install a course. If World History I is already installed, use Add Final Exam bookshelf to add the final without replacing existing study progress. In <b>Study</b>, select a room (course), bookshelf (exam), and topic shelf, or Show all shelves. Each book is a study card.`],
 ['Study modes',`<b>Placement:</b> both sides visible. <b>Hide Definition:</b> recall the answer. <b>Hide Term:</b> recall the term (repeated answers may be masked). Reveal when ready. <b>Browse:</b> all books appear on shelves; click a book or use Previous / Next. Browse does not change placements.`],
 ['Sorting and progress',`Drag the current book onto a shelf, or tap the shelf itself (keyboard: focus the shelf and press Enter). Wrong choices leave it unsorted. <b>Auto Place (I know it)</b> sorts it for you. <b>Shuffle Back</b> defers it; <b>Bottom of Stack</b> sends it to the end. Click a placed book and choose Return to Unsorted (Restudy) to practice it again. Shuffle remaining mixes the queue; Reset order follows the current shelf sequence. Reset bookshelf or a shelf clears placements. Browse is read-only.`],
 ['Layouts and themes',`Switch Bookshelf / Flashcard in the header; phones use the card-first layout. Use the palette button or Settings for Birch, Cherry or Dark Oak. Scroll shelves sideways. Expand opens the current card.`],
 ['Create and edit',`Turn on Edit library to add, edit or delete rooms, bookshelves, shelves and books using the adjacent controls. Select an item before editing it. Reorder shelves changes their top-to-bottom sequence and restores the unsorted queue to that order without clearing placements. Spine labels and cover colors are optional. Edit a theology verse book to add your own verse.`],
 ['Import study sets',`Open <b>Create / Import</b>. For notes, use Prompt for notes below, then paste the generated JSON into JSON study set and choose Add to my library. For your own Quizlet set, use More → Export → Copy text, then Quizlet text; enter room, bookshelf and topic, set separators (Tab and new line are defaults), paste text, choose Preview import, then Import checked books. If export is unavailable and you have permission, use More → Print, save a PDF and use the Quizlet PDF prompt. For shared files use Shared room / bookshelf and select the JSON file. Check source content and counts before importing.`],
 ['Save, share and recover',`Progress and edits save in this browser only. In Settings, use Export room or bookshelf, choose the scope and download shared JSON; friends import it via Create / Import → Shared room / bookshelf. Copies do not sync. Export for Quizlet lets you choose a room, bookshelf and topic, then copy or download text. Download full library backup before clearing browser data or switching devices. Restore library backup replaces the entire library; follow the confirmation prompt. Recover previous library snapshot restores the saved recovery copy.`],
 ['Troubleshooting',`Check the same browser and device if progress is missing. On phones use Practice shelf. If a set is incomplete, compare its count with the source. Use Feedback for issues and Settings → Changelog for release details.`]
];
openModal(`<h2>Help and tutorial</h2><p><button class="btn" id="showWelcomeAgain" type="button">Read welcome guide again</button></p><p class="smalltext">Open a topic for step-by-step guidance.</p><div class="guide-body">${topics.map((t,i)=>`<details class="help-section" ${i===0?'open':''}><summary>${esc(t[0])}</summary><div>${t[1]}</div></details>`).join('')}</div><div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" id="viewPrompt" type="button">Prompt for notes</button><button class="btn" id="copyPrompt" type="button">Copy notes prompt</button><button class="btn" id="printPrompt" type="button">Prompt for Quizlet PDF</button><button class="btn" id="closeModal" type="button">Close</button></div>`);
$('closeModal').onclick=closeModal;$('showWelcomeAgain').onclick=()=>showWelcomeGuide(true);$('viewPrompt').onclick=promptViewer;$('printPrompt').onclick=printedQuizletPrompt;$('copyPrompt').onclick=()=>copyStudyPrompt('copyPrompt');
}
function settings(){
openModal(`<h2>Settings <span class="app-version">V${APP_VERSION}</span></h2><div class="guide-body"><h3>Appearance</h3><label for="layoutSel">Study layout</label><select id="layoutSel" class="field"><option value="bookshelf">Bookshelf View (spatial sorting)</option><option value="flashcard">Flashcard View (default; mobile view)</option></select><p class="smalltext">Choose your preferred desktop layout. Mobile always uses the card-first arrangement. This changes appearance only and never changes book placement or progress.</p><label for="themeSel">Wood theme</label><select id="themeSel" class="field">${THEME_OPTIONS.map(t=>`<option value="${t.id}">${t.label}</option>`).join('')}</select><p class="smalltext">Appearance only. Theme changes never affect books, shelf placement or scores.</p><h3>Study data</h3><p class="smalltext">Edits and progress save in this browser only. Sharing a backup or exported study set sends a copy as it existed when exported; later edits do not sync. Make a backup before changing devices or clearing browsing data.</p><div class="settings-actions"><button class="btn primary" id="settingsExport" type="button">Download full library backup</button><button class="btn" id="settingsRestore" type="button">Restore library backup</button><button class="btn" id="quizletExport" type="button">Export for Quizlet</button><button class="btn" id="shareExport" type="button">Export room or bookshelf</button><button class="btn" id="shareImportSettings" type="button">Import shared room or bookshelf</button><button class="btn" id="recoverLibrary" type="button">Recover previous library snapshot</button></div><h3>Changelog</h3><div class="release-list">${CHANGELOG.map(release=>`<details class="release-entry"><summary>V${release.version} · ${release.date}</summary><ul>${release.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></details>`).join('')}</div></div><p><button class="btn" id="closeModal" type="button">Close</button></p>`);
$('closeModal').onclick=closeModal;$('themeSel').value=theme;$('themeSel').onchange=e=>applyTheme(e.target.value);$('layoutSel').value=studyLayout;$('layoutSel').onchange=e=>applyStudyLayout(e.target.value);
$('settingsExport').onclick=()=>$('exportBtn').click();$('shareExport').onclick=exportScopeDialog;$('shareImportSettings').onclick=sharedImportDialog;$('recoverLibrary').onclick=recoverPreviousLibrary;$('quizletExport').onclick=quizletExportDialog;
$('settingsRestore').onclick=fullRestoreDialog;
}
function addStudySet(){
 openModal(`<h2>Create / Import</h2><p class="smalltext">Create items manually by opening Edit library in the Study screen and using the New buttons beside the library selectors, or import a set below.</p><div class="import-tabs row"><button class="btn" type="button" id="sharedImportTab">Shared room / bookshelf</button><button class="btn" type="button" id="fullRestoreTab">Full backup restore</button><button class="btn active" type="button" id="jsonImportTab">JSON study set</button><button class="btn" type="button" id="quizletImportTab">Quizlet text</button></div><div class="create-export"><h3>Export and share</h3><p class="smalltext">Download a personal backup or a shareable copy of one room or bookshelf. Shared copies do not include your study progress.</p><div class="row"><button class="btn" type="button" id="createExportRoom">Export room / bookshelf</button><button class="btn" type="button" id="createExportQuizlet">Export for Quizlet</button><button class="btn" type="button" id="createExportBackup">Full library backup</button></div></div><hr><p class="smalltext">Paste structured JSON. Matching rooms/bookshelves are reused; exact duplicates are skipped unless you opt to keep them.</p><form id="studySetForm"><label for="studySetJson">Study set JSON</label><textarea id="studySetJson" class="field" rows="11" required placeholder='{"room":"Philosophy","bookshelf":"Exam 1","shelves":[{"name":"Ethics","books":[{"title":"Virtue ethics","body":"Character-based ethics"}]}]}'></textarea><label class="inline-checkbox"><input type="checkbox" id="jsonKeepDuplicates"> Import duplicate cards too</label><p class="row"><button class="btn primary" type="submit">Add to my library</button><button class="btn" type="button" id="closeModal">Cancel</button></p></form>`);
 $('addSetBtn').classList.add('active');$('createExportRoom').onclick=exportScopeDialog;$('createExportQuizlet').onclick=quizletExportDialog;$('createExportBackup').onclick=()=>$('exportBtn').click();$('closeModal').onclick=closeModal;$('quizletImportTab').onclick=quizletImportDialog;$('sharedImportTab').onclick=sharedImportDialog;$('fullRestoreTab').onclick=fullRestoreDialog;
 $('studySetForm').onsubmit=e=>{e.preventDefault();try{
 const data=JSON.parse($('studySetJson').value);
 if(!data||typeof data.room!=='string'||typeof data.bookshelf!=='string'||!Array.isArray(data.shelves)||!data.shelves.length||data.shelves.length>100)throw Error('Expected room, bookshelf, and 1 to 100 shelves.');
 const items=[];for(const sh of data.shelves){if(!sh||typeof sh.name!=='string'||!sh.name.trim()||!Array.isArray(sh.books)||sh.books.length>500)throw Error('Each shelf needs a name and at most 500 books.');for(const b of sh.books){if(!b||typeof b.title!=='string'||typeof b.body!=='string')throw Error('Every book requires a text title and definition.');items.push({...b,topic:sh.name,source:b.source||'Personal study set'})}}
 if(!items.length||items.length>1000)throw Error('Study sets must contain 1 to 1,000 books.');
 const plan=planImport(items,data.room,data.bookshelf,data.shelves[0].name,!$('jsonKeepDuplicates').checked);completeImport(plan)
 }catch(err){alert('Could not add study set: '+err.message)}}
}
document.addEventListener('click',e=>{const entry=e.target.closest('[data-enter-room]');if(entry){openRoom(entry.dataset.enterRoom);return}if(e.target.closest('#homeCreateRoom')){editMode=true;quickEditor('room');}if(e.target.closest('#homeCatalog'))showCatalog();});
function quizletImportDialog(){
 openModal(`<h2>Import Quizlet-compatible text</h2><p class="smalltext">Paste term-definition pairs. For different topic shelves, optionally append a third TAB-separated topic to each row. Use blank-line records for multiline definitions. Nothing is written until confirmation succeeds.</p><form id="quizletForm" class="quizlet-form"><div class="formgrid"><label>Room<input class="field" id="qiRoom" required value="${esc(db.rooms.find(r=>r.id===room)?.name||'My course')}"></label><label>Bookshelf<input class="field" id="qiCollection" required value="Imported Quizlet set"></label><label>Default topic shelf<input class="field" id="qiShelf" required value="Imported terms"></label><label>Term separator<select class="field" id="qiDelimiter"><option value="tab">Tab (recommended)</option><option value="comma">Comma</option><option value="dash">Dash ( - )</option><option value="custom">Custom</option></select></label><label>Record separator<select class="field" id="qiRecords"><option value="line">New line per book</option><option value="blank">Blank line between books (multiline content)</option></select></label><label>Custom term separator<input class="field" id="qiCustom" placeholder="Example: |||" disabled></label></div><label for="qiText">Terms and definitions</label><textarea id="qiText" class="field" rows="8" required placeholder="Term[TAB]Definition[TAB]Optional topic"></textarea><label class="inline-checkbox"><input type="checkbox" id="qiKeepDuplicates"> Import exact duplicate cards too (default is skip)</label><p class="row"><button class="btn" type="button" id="qiPreviewBtn">Preview import</button><button class="btn primary" type="submit" id="qiConfirm" disabled>Import checked books</button><button class="btn" type="button" id="closeModal">Cancel</button></p><div id="qiPreview" role="status" aria-live="polite" class="import-preview"></div></form>`);
 $('closeModal').onclick=closeModal;let parsed=null;
 const check=()=>{
  parsed=parseQuizletText($('qiText').value,$('qiDelimiter').value,$('qiRecords').value,$('qiCustom').value);
  const errors=[...parsed.errors];let plan=null;
  if(parsed.result.length>1000)errors.push('A maximum of 1,000 cards can be imported at once.');
  if(!errors.length&&parsed.result.length){try{plan=planImport(parsed.result,$('qiRoom').value,$('qiCollection').value,$('qiShelf').value,!$('qiKeepDuplicates').checked)}catch(e){errors.push(e.message)}}
  $('qiConfirm').disabled=!!errors.length||!parsed.result.length;
  $('qiPreview').innerHTML=`<p>${parsed.result.length} valid books${errors.length?', '+errors.length+' errors':''}${plan?', '+plan.added+' new and '+plan.skipped+' exact duplicates':''}</p>${errors.map(s=>`<p class="error-line">${esc(s)}</p>`).join('')}<div class="preview-rows">${parsed.result.slice(0,30).map((b,i)=>`<div><strong>${i+1}. ${esc(b.title)}</strong><span>${esc(b.body)}</span><label>Topic for book ${i+1}<input class="field" data-qi-topic="${i}" maxlength="160" value="${esc(b.topic||$('qiShelf').value)}"></label></div>`).join('')}</div>${parsed.result.length>30?'<p class="smalltext">Showing the first 30 books. For remaining cards, add a third TAB-separated topic column to the source text.</p>':''}`;
  $('qiPreview').querySelectorAll('[data-qi-topic]').forEach(input=>input.addEventListener('input',()=>{parsed.result[Number(input.dataset.qiTopic)].topic=input.value;$('qiConfirm').disabled=!input.value.trim()}));
 };
 $('qiPreviewBtn').onclick=check;
 for(const key of ['qiText','qiRoom','qiCollection','qiShelf','qiCustom'])$(key).addEventListener('input',()=>{$('qiConfirm').disabled=true});
 for(const key of ['qiDelimiter','qiRecords','qiKeepDuplicates'])$(key).addEventListener('change',()=>{$('qiConfirm').disabled=true;if(key==='qiDelimiter')$('qiCustom').disabled=$('qiDelimiter').value!=='custom'});
 $('quizletForm').onsubmit=e=>{e.preventDefault();if($('qiConfirm').disabled)return;
  try{const plan=planImport(parsed.result,$('qiRoom').value,$('qiCollection').value,$('qiShelf').value,!$('qiKeepDuplicates').checked);completeImport(plan)}catch(err){alert('Import failed: '+err.message)}
 };
}
function quizletExportDialog(){const cols=db.collections.filter(c=>c.room===room);openModal(`<h2>Export for Quizlet</h2><p class="smalltext">Export term-definition text from a bookshelf. Quizlet import uses tab-separated terms and definitions, one card per line. Images and progress are not included.</p><label>Room<select id="qeRoom" class="field">${db.rooms.map(r=>`<option value="${esc(r.id)}">${esc(roomDisplayName(r))}</option>`).join('')}</select></label><label>Bookshelf<select id="qeCollection" class="field">${cols.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Topic<select class="field" id="qeShelf"></select></label><label>Export format<select class="field" id="qeFormat"><option value="line">Single line per card (Quizlet default)</option><option value="blank">Blank line between cards (preserve multiline content)</option></select></label><textarea id="qeText" class="field prompt-textarea" readonly aria-label="Quizlet-compatible export text"></textarea><div class="row"><button class="btn primary" type="button" id="qeCopy">Copy text</button><button class="btn" type="button" id="qeDownload">Download text</button><button class="btn" type="button" id="closeModal">Close</button></div>`);$('closeModal').onclick=closeModal;$('qeRoom').value=room;$('qeCollection').value=coll;
 const update=()=>{const c=$('qeCollection').value;const previousCollection=coll;coll=c;const list=visibleShelves();coll=previousCollection;$('qeShelf').innerHTML=`<option value="">All topics</option>`+list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');makeText();};
 const makeText=()=>{const originalColl=coll;coll=$('qeCollection').value;const pool=collBooks();coll=originalColl;const sid=$('qeShelf').value;$('qeText').value=pool.filter(b=>!sid||b.shelf===sid).map(b=>b.title.replace(/[\t\r\n]+/g,' ')+'\t'+($('qeFormat').value==='blank'?b.body.replace(/\t/g,' '):b.body.replace(/[\t\r\n]+/g,' '))).join($('qeFormat').value==='blank'?'\n\n':'\n')};
 $('qeRoom').onchange=()=>{const roomId=$('qeRoom').value;const roomCollections=db.collections.filter(c=>c.room===roomId);$('qeCollection').innerHTML=roomCollections.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');update()};$('qeCollection').onchange=update;$('qeShelf').onchange=makeText;$('qeFormat').onchange=makeText;$('qeCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('qeText').value);$('qeCopy').textContent='Copied'}catch(e){$('qeText').focus();$('qeText').select();$('qeCopy').textContent='Selected: press Ctrl+C'}};$('qeDownload').onclick=()=>{const blob=new Blob([$('qeText').value],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='memory-shelves-quizlet-export.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};update();
}

const WELCOME_KEY='memory-shelves-welcome-v150';
function showWelcomeIfFirstVisit(force=false){let seen=false;try{seen=localStorage.getItem(WELCOME_KEY)==='1'}catch(e){}if(seen&&!force)return;
 const markSeen=()=>{try{localStorage.setItem(WELCOME_KEY,'1')}catch(e){}};
 openModal(`<h2>Welcome to Memory Shelves</h2><div class="welcome-summary"><p>Memory Shelves helps you remember what you learn by connecting information to a place. Think of each book as a flashcard and each shelf as a topic.</p><h3>Start studying</h3><p>Open Course library to add a course, or choose an existing room in The Study. Select a bookshelf (your exam or unit), then choose a study method.</p><h3>Recall, sort, repeat</h3><p>Use Placement to read both sides, Hide Definition to recall the answer, or Hide Term to recall the term. Reveal the answer when ready. Drag the book onto its topic shelf or tap the shelf. Use Auto Place for known books and the two Keep studying buttons for another try. Click any placed book to return it for restudy.</p><p>Browse lets you explore the full bookshelf without changing study progress. Switch layouts or wood themes in the header.</p><p>Your progress saves in this browser. You can also create, import, and share your own study sets. Open Help any time for step-by-step instructions.</p></div><div class="row"><button class="btn primary" id="welcomeStart" type="button">Start studying</button><button class="btn" id="welcomeHelp" type="button">Open Help</button></div>`);
 const modal=$('modalHost').querySelector('.modal');modal?.setAttribute('aria-labelledby','welcomeHeading');const heading=modal?.querySelector('h2');if(heading)heading.id='welcomeHeading';
 $('welcomeStart').onclick=()=>{markSeen();closeModal()};$('welcomeHelp').onclick=()=>{markSeen();tutorial()};$('backdrop').addEventListener('click',markSeen);$('welcomeStart').focus();
}
function showWelcomeGuide(force=false){showWelcomeIfFirstVisit(force)}
function initializeQuickTheme(){const btn=$('paletteBtn'),menu=$('paletteMenu');if(!btn||!menu)return;
 menu.innerHTML=THEME_OPTIONS.map(t=>`<button type="button" class="palette-option" data-wood-theme="${t.id}"><span class="palette-swatch" style="background:${t.swatch}"></span>${t.label}</button>`).join('');
 const close=()=>{menu.hidden=true;btn.setAttribute('aria-expanded','false')};
 btn.onclick=()=>{menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));};
 menu.querySelectorAll('[data-wood-theme]').forEach(b=>b.onclick=()=>{applyTheme(b.dataset.woodTheme);close();btn.focus()});
 document.addEventListener('click',e=>{if(!e.target.closest('#paletteWrap'))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){close();btn.focus()}});
 applyTheme(theme);
}
$('editLibraryBtn').onclick=()=>{editMode=!editMode;render()};$('catalogBtn').onclick=showCatalog;$('feedbackBtn').onclick=feedbackDialog;document.querySelectorAll('[data-study-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.studyMode;lastStudyMethod=mode;selected=null;showBody=false;feedback='';render()});
$('layoutToggle').onclick=()=>applyStudyLayout(studyLayout==='bookshelf'?'flashcard':'bookshelf');applyStudyLayout(studyLayout);$('helpBtn').onclick=tutorial;$('settingsBtn').onclick=settings;$('addSetBtn').onclick=addStudySet;
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='memory-shelves-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
setOrder();if(!save())throw Error('Browser storage could not be saved.');render();initializeQuickTheme();window.addEventListener('resize',()=>{const layout=$('studyLayout');if(layout)layout.classList.toggle('flashcard-layout',studyLayout==='flashcard'||window.matchMedia('(max-width:720px)').matches)});showWelcomeIfFirstVisit();
}
