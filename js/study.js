export function visibleShelvesFor(state,collectionId){return state.shelves.filter(s=>s.collection===collectionId&&!s.overviewShelf);}
export function displayBooks(state,collectionId){
 const shelves=state.shelves.filter(s=>s.collection===collectionId);
 const destinations=new Map(shelves.map(s=>[s.id,s.overviewShelf||s.id]));
 for(const sh of shelves)if(sh.sourceShelf)destinations.set(sh.sourceShelf,sh.id);
 return state.books.filter(b=>destinations.has(b.shelf)).map(b=>({...b,shelf:destinations.get(b.shelf)}));
}
export function booksForCollection(state,collectionId){const ids=new Set(displayBooks(state,collectionId).map(b=>b.id));return state.books.filter(b=>ids.has(b.id));}
export function validQueue(candidate,collectionId){
 const ids=new Set(canonicalBookOrder(collectionId,candidate).filter(id=>!candidate.progress[id]?.placed));
 const old=candidate.queueByCollection?.[collectionId]||[],result=[],seen=new Set();
 for(const key of [...old,...ids])if(ids.has(key)&&!seen.has(key)){result.push(key);seen.add(key)}
 return result;
}
export function canonicalBookOrder(collectionId,state){
 const shelfIndex=new Map(visibleShelvesFor(state,collectionId).map((s,i)=>[s.id,i]));
 return displayBooks(state,collectionId).sort((a,b)=>(shelfIndex.get(a.shelf)??999999)-(shelfIndex.get(b.shelf)??999999)).map(b=>b.id);
}

export function recordPlacement(state,collectionId,bookId,destination,{automatic=false,now=Date.now}={}){
 const book=displayBooks(state,collectionId).find(b=>b.id===bookId);
 if(!book)return {error:'Book is outside the selected bookshelf.'};
 if(!automatic&&!visibleShelvesFor(state,collectionId).some(s=>s.id===destination))return {error:'Choose a valid destination shelf.'};
 const p=state.progress[bookId]||{placed:false,attempts:0};
 if(p.placed)return {error:'Book already placed.'};
 const correct=automatic||destination===book.shelf;
 if(automatic){p.autoPlaced=(p.autoPlaced||0)+1;}else{p.attempts=(p.attempts||0)+1;}
 if(correct){p.placed=true;p.placementMethod=automatic?'auto':'manual';p.placementHistory=[...(p.placementHistory||[]),{type:p.placementMethod,at:now(),...(automatic?{}:{attempts:p.attempts})}];}
 state.progress[bookId]=p;state.queueByCollection ||= {};state.queueByCollection[collectionId]=validQueue(state,collectionId);
 return {ok:true,correct};
}
export function deferBook(state,collectionId,bookId,kind,random=Math.random){
 const queue=validQueue(state,collectionId);
 if(!queue.includes(bookId))return {error:'Only unshelved books can be deferred.'};
 const rest=queue.filter(id=>id!==bookId);if(!rest.length)return {error:'No other unshelved book is available.'};
 const position=kind==='random'&&rest.length>1?1+Math.floor(random()*rest.length):rest.length;
 rest.splice(position,0,bookId);state.queueByCollection ||= {};state.queueByCollection[collectionId]=rest;return {ok:true};
}

export function returnBook(state,collectionId,bookId,now=Date.now){
 if(!displayBooks(state,collectionId).some(b=>b.id===bookId)||!state.progress[bookId]?.placed)return {error:'Only a placed book can be returned.'};
 const p=state.progress[bookId];p.placementHistory=[...(p.placementHistory||[]),{type:'reset',at:now(),previousAttempts:p.attempts||0,previousMethod:p.placementMethod||'legacy'}];p.placed=false;p.attempts=0;p.placementMethod=null;
 state.queueByCollection ||= {};for(const c of state.collections){if(booksForCollection(state,c.id).some(b=>b.id===bookId)){state.queueByCollection[c.id]=[...validQueue(state,c.id).filter(id=>id!==bookId),bookId];}}
 return {ok:true};
}

export function reorderShelves(state,collectionId,ids){
 const current=visibleShelvesFor(state,collectionId).map(s=>s.id);
 if(!Array.isArray(ids)||ids.length!==current.length||new Set(ids).size!==current.length||ids.some(id=>!current.includes(id)))throw Error('Invalid shelf order.');
 const collection=state.collections.find(c=>c.id===collectionId);if(!collection)throw Error('Bookshelf not found.');
 const byId=new Map(state.shelves.map(s=>[s.id,s]));let i=0;const visible=new Set(current);
 state.shelves=state.shelves.map(s=>visible.has(s.id)?byId.get(ids[i++]):s);
 collection.shelfOrderCustomized=true;
 state.queueByCollection ||= {};state.queueByCollection[collectionId]=canonicalBookOrder(collectionId,state).filter(id=>!state.progress[id]?.placed);
}
