import { norm, pairKey, roomDisplayName, verifyLibrary } from './core.js';
import { MAX_TITLE_LENGTH, MAX_BODY_LENGTH, COVER_COLORS } from './config.js';
import { displayBooks, visibleShelvesFor } from './study.js';
export function planImport(db,id,items,roomName,collectionName,defaultShelf,skipDuplicates=true){
 const candidate=structuredClone(db), rn=roomName.trim(),cn=collectionName.trim(),fallback=defaultShelf.trim();
 if(!rn||!cn||!fallback)throw Error('Room, bookshelf, and default shelf are required.');
 const roomMatches=candidate.rooms.filter(x=>norm(x.name)===norm(rn)||norm(roomDisplayName(x))===norm(rn));if(roomMatches.length>1)throw Error('Multiple rooms have that course name. Use the full course name with its professor to avoid mixing instructors.');let r=roomMatches[0];if(!r){r={id:id(),name:rn};candidate.rooms.push(r)}
 let c=candidate.collections.find(x=>x.room===r.id&&norm(x.name)===norm(cn));if(!c){c={id:id(),room:r.id,name:cn};candidate.collections.push(c)}
 const existing=new Set(candidate.books.filter(b=>candidate.shelves.some(t=>t.id===b.shelf&&t.collection===c.id)).map(b=>{
  const shelf=candidate.shelves.find(t=>t.id===b.shelf);
  return norm(shelf?.name)+'\u001f'+pairKey(b.title,b.body);
 }));
 let added=0,skipped=0;
 for(const entry of items){
  const title=String(entry.title??'').trim(),body=String(entry.body??'').trim(),topic=String(entry.topic||fallback).trim(),shortLabel=String(entry.shortLabel||'').trim();
  if(!title||!body||!topic||title.length>MAX_TITLE_LENGTH||body.length>MAX_BODY_LENGTH||topic.length>160||shortLabel.length>90)throw Error('Invalid card title, definition, topic (max 160), or short label (max 90).');
  const k=norm(topic)+'\u001f'+pairKey(title,body);
  if(skipDuplicates&&existing.has(k)){skipped++;continue}
  let sh=candidate.shelves.find(t=>t.collection===c.id&&norm(t.name)===norm(topic));
  if(!sh){sh={id:id(),collection:c.id,name:topic};candidate.shelves.push(sh)}
  candidate.books.push({id:id(),shelf:sh.id,title,body,shortLabel,source:entry.source||'Imported study set',color:candidate.books.length%COVER_COLORS.length});
  existing.add(k);added++;
 }
 verifyLibrary(candidate);return {candidate,roomId:r.id,collectionId:c.id,added,skipped};
}

export const SHARE_FORMAT='memory-shelves-share',SHARE_VERSION=1;
export function snapshotExport(db,type,roomId,collectionId,clock=()=>new Date()){
 if(!['room','bookshelf'].includes(type))throw Error('Invalid sharing scope.');
 const sourceRoom=db.rooms.find(r=>r.id===roomId);if(!sourceRoom)throw Error('Room not found.');
 const cols=db.collections.filter(c=>c.room===roomId&&(type==='room'||c.id===collectionId));if(!cols.length)throw Error('No bookshelf available.');
 const collectionIds=new Set(cols.map(c=>c.id));
 const shelves=type==='room'?db.shelves.filter(sh=>collectionIds.has(sh.collection)):visibleShelvesFor(db,cols[0].id);
 const shelfIds=new Set(shelves.map(sh=>sh.id));
 const books=type==='room'?db.books.filter(b=>shelfIds.has(b.shelf)):displayBooks(db,cols[0].id);
 return {format:SHARE_FORMAT,version:SHARE_VERSION,scope:type,exportedAt:clock().toISOString(),room:{name:sourceRoom.name,professor:sourceRoom.professor||''},collections:cols.map(c=>({id:c.id,name:c.name})),shelves:shelves.map(sh=>({id:sh.id,collection:sh.collection,name:sh.name,...(type==='room'?{overview:!!sh.overview,sourceShelf:sh.sourceShelf||'',overviewShelf:sh.overviewShelf||''}:{})})),books:books.map(b=>({id:b.id,shelf:b.shelf,title:b.title,shortLabel:b.shortLabel||'',body:b.body,source:b.source||'',color:b.color??0}))};
}

export function importSharedData(db,id,input,destinationRoomId=''){
 if(!input||input.format!==SHARE_FORMAT||input.version!==SHARE_VERSION||!['room','bookshelf'].includes(input.scope))throw Error('Unrecognized shared Memory Shelves file.');
 if(!input.room||typeof input.room.name!=='string'||!input.room.name.trim()||!Array.isArray(input.collections)||!Array.isArray(input.shelves)||!Array.isArray(input.books)||!input.collections.length||input.collections.length>100||input.shelves.length>2000||input.books.length>10000)throw Error('Invalid or oversized shared file.');
 const draft=structuredClone(db),newRoomId=id(),targetRoomId=input.scope==='room'?newRoomId:destinationRoomId;
 if(input.scope==='bookshelf'&&input.collections.length!==1)throw Error('A shared bookshelf must contain exactly one bookshelf.');
 if(input.scope==='bookshelf'&&!draft.rooms.some(r=>r.id===destinationRoomId))throw Error('Select an existing destination room.');
 if(input.scope==='room')draft.rooms.push({id:newRoomId,name:input.room.name,professor:String(input.room.professor||'')});
 const collectionMap=new Map(),shelfMap=new Map();
 for(const c of input.collections){if(!c||typeof c.id!=='string'||typeof c.name!=='string'||!c.name.trim()||collectionMap.has(c.id))throw Error('Invalid or duplicate source bookshelf.');const newId=id();collectionMap.set(c.id,newId);draft.collections.push({id:newId,name:c.name,room:targetRoomId})}
 for(const sh of input.shelves){if(!sh||typeof sh.id!=='string'||typeof sh.name!=='string'||!sh.name.trim()||shelfMap.has(sh.id))throw Error('Invalid or duplicate source shelf.');if(!collectionMap.has(sh.collection)){
  // Linked-source shelves in a partial bookshelf import: copy into the imported bookshelf.
  if(input.scope!=='bookshelf')throw Error('Shelf references an unknown bookshelf.');
 }
 const newId=id();shelfMap.set(sh.id,newId);draft.shelves.push({id:newId,name:sh.name,collection:collectionMap.get(sh.collection)||[...collectionMap.values()][0],overview:!!sh.overview});}
 for(const sh of input.shelves){if(sh.overviewShelf){const mapped=draft.shelves.find(x=>x.id===shelfMap.get(sh.id));if(!shelfMap.has(sh.overviewShelf))throw Error('Overview shelf reference is missing.');mapped.overviewShelf=shelfMap.get(sh.overviewShelf)}if(sh.sourceShelf){const mapped=draft.shelves.find(x=>x.id===shelfMap.get(sh.id));if(!shelfMap.has(sh.sourceShelf))throw Error('Source shelf reference is missing.');mapped.sourceShelf=shelfMap.get(sh.sourceShelf)}}
 const bookIds=new Set();for(const b of input.books){if(!b||typeof b.id!=='string'||bookIds.has(b.id)||!shelfMap.has(b.shelf)||typeof b.title!=='string'||!b.title.trim()||typeof b.body!=='string'||!b.body.trim()||b.title.length>MAX_TITLE_LENGTH||b.body.length>MAX_BODY_LENGTH)throw Error('Invalid shared book.');bookIds.add(b.id);draft.books.push({id:id(),shelf:shelfMap.get(b.shelf),title:b.title,body:b.body,shortLabel:String(b.shortLabel||'').slice(0,90),source:String(b.source||''),color:Number.isInteger(b.color)?b.color:0})}
 // Backward compatibility for earlier share files: preserve overview links when known.
 for(const original of input.shelves){const destination=draft.shelves.find(sh=>sh.id===shelfMap.get(original.id));if(!destination.overviewShelf&&/^v13-topic-\d+-\d+$/.test(original.id)){const overviewId='exam2-overview-'+(Number(original.id.split('-')[2])+1);if(shelfMap.has(overviewId))destination.overviewShelf=shelfMap.get(overviewId);}}
 if(input.scope==='bookshelf'){
  const target=[...collectionMap.values()][0];const selected=draft.shelves.filter(sh=>sh.collection===target);
  // Earlier beta sharing bundled both visible and underlying source shelves. Flatten these in a single-bookcase import.
  const hiddenSources=new Map();for(const sh of selected){if(sh.sourceShelf)hiddenSources.set(sh.sourceShelf,sh.id);if(sh.overviewShelf)hiddenSources.set(sh.id,sh.overviewShelf);}
  for(const book of draft.books){if(hiddenSources.has(book.shelf))book.shelf=hiddenSources.get(book.shelf);}
  if(hiddenSources.size){draft.shelves=draft.shelves.filter(sh=>!hiddenSources.has(sh.id));for(const sh of draft.shelves.filter(x=>x.collection===target)){delete sh.sourceShelf;delete sh.overviewShelf;delete sh.overview;}}
 }
 verifyLibrary(draft);return {candidate:draft,roomId:targetRoomId,collectionId:[...collectionMap.values()][0],count:input.books.length};
}

// Deleting a view is different from deleting the owned content it displays.
// An overview shelf owns its grouped source topics; a linked mirror owns no source cards.
export function deletionPlan(state,type,entityId){
 if(!['room','collection','shelf'].includes(type))throw Error('Invalid deletion scope.');
 const key=type==='room'?'rooms':type==='collection'?'collections':'shelves';
 const entity=state[key].find(x=>x.id===entityId);if(!entity)throw Error('Item no longer exists.');
 const collectionIds=new Set(type==='room'?state.collections.filter(c=>c.room===entityId).map(c=>c.id):type==='collection'?[entityId]:[]);
 const shelfIds=new Set(type==='shelf'?[entityId]:state.shelves.filter(s=>collectionIds.has(s.collection)).map(s=>s.id));
 if(type==='shelf')for(const sh of state.shelves)if(sh.overviewShelf===entityId)shelfIds.add(sh.id);
 for(const sh of state.shelves)if(sh.sourceShelf&&shelfIds.has(sh.sourceShelf))shelfIds.add(sh.id);
 const affected=state.books.filter(b=>shelfIds.has(b.shelf));
 const alternatives=type==='shelf'?visibleShelvesFor(state,entity.collection).filter(sh=>!shelfIds.has(sh.id)&&!sh.sourceShelf):[];
 return {type,entity,collectionIds,shelfIds,affected,alternatives};
}
export function applyDeletion(state,plan,{destination=null}={}){
 const {type,entity,collectionIds,shelfIds,affected,alternatives}=plan;
 if(destination){if(type!=='shelf'||!alternatives.some(s=>s.id===destination))throw Error('Invalid move destination.');for(const b of state.books)if(shelfIds.has(b.shelf))b.shelf=destination;}
 else {const bids=new Set(affected.map(b=>b.id));state.books=state.books.filter(b=>!bids.has(b.id));for(const id of bids)delete state.progress[id];}
 state.shelves=state.shelves.filter(sh=>!shelfIds.has(sh.id));
 for(const sh of state.shelves)if(sh.overviewShelf&&shelfIds.has(sh.overviewShelf))delete sh.overviewShelf;
 state.collections=state.collections.filter(c=>!collectionIds.has(c.id));
 if(type==='room')state.rooms=state.rooms.filter(r=>r.id!==entity.id);
 const bookIds=new Set(state.books.map(b=>b.id));
 for(const [id,queue] of Object.entries(state.queueByCollection||{})){if(collectionIds.has(id))delete state.queueByCollection[id];else state.queueByCollection[id]=queue.filter(x=>bookIds.has(x));}
 verifyLibrary(state);
}
