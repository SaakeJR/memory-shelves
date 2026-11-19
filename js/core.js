import { MAX_TITLE_LENGTH, MAX_BODY_LENGTH } from "./config.js";
function norm(v){return String(v??'').trim().replace(/\s+/g,' ').toLocaleLowerCase()}
function pairKey(title,body){return norm(title)+'\u001f'+norm(body)}

function cleanDefinition(book){
 const original=String(book?.body||'');const lines=original.split(/\r?\n/);const term=String(book?.title||'').trim();
 return lines.length>1&&term&&norm(lines[0])===norm(term)&&lines.slice(1).join('\n').trim()?lines.slice(1).join('\n').trimStart():original;
}
function studyDefinition(book){
 if(!book)return '';
 const original=cleanDefinition(book);
 const term=String(book.title||'').trim();
 if(term.length<3||term.length>100)return original;
 // Hide exact terms, not partial substrings (e.g. 'icon' must not modify 'iconoclasm').
 const quoted=Array.from(term).map(ch=>[36,40,41,42,43,46,63,91,92,93,94,123,124,125].includes(ch.charCodeAt(0))?String.fromCharCode(92)+ch:ch).join("");
 const re=new RegExp('(^|[^\\p{L}\\p{N}])('+quoted+')(?![\\p{L}\\p{N}])','giu');
 // Display-only exceptions remove source-provided alternate names that would spoil reverse recall.
 if(/^(seed-|quiz2-)/.test(String(book.id))){
   if(term==='Gregory the Great')return original.replace(/^Gregory I, aka “Gregory the Great” \(pope/i,'Pope');
   if(term==='Shiah or Shiites')return original.replace(/^Shiah \(aka Shiites\)\s*/i,'');
   if(term==='Florence')return original.replace(/^Florence \(aka Firenze\)/i,'______');
   if(term==='Erasmus')return original.replace(/^Desiderius Erasmus\s*/i,'');
   if(term==='Islam means “submission”')return original.replace(/Islam/gi,'______');
 }
 // Display-only exceptions: source wording supports a natural standalone definition.
 if(book.id==='seed-27'||book.id==='quiz2-27')return original.replace(/^Clovis\s+/i,'');
 // Remove a redundant term-only first line, without modifying the stored source.
 let clue=original;
 const lines=clue.split('\n');
 if(lines.length>1&&lines[0].trim().toLocaleLowerCase()===term.toLocaleLowerCase())clue=lines.slice(1).join('\n').trimStart();
 clue=clue.replace(re,(_match,prefix)=>prefix+'______');
 // A singular term must not be revealed by its regular plural, e.g. Sunni / Sunnis.
 if(/^[\p{L}]{4,}$/u.test(term)&&!term.toLocaleLowerCase().endsWith('s')){
   const plural=term+'s';
   const pluralRe=new RegExp('(^|[^\\p{L}\\p{N}])('+plural+')(?![\\p{L}\\p{N}])','giu');
   clue=clue.replace(pluralRe,(_match,prefix)=>prefix+'______');
 }
 return clue;
}

function verifyLibrary(data){
 if(!data || typeof data !== 'object' || !data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress))throw Error('Invalid progress data.');
 for(const field of ['rooms','collections','shelves','books'])if(!Array.isArray(data[field]))throw Error('Invalid '+field+' list.');
 const ids=new Set();for(const field of ['rooms','collections','shelves','books'])for(const item of data[field]){if(!item||typeof item.id!=='string'||!item.id||['__proto__','prototype','constructor'].includes(item.id)||ids.has(item.id))throw Error('Duplicate or invalid library ID: '+item?.id);ids.add(item.id)}
 const rooms=new Set(data.rooms.map(x=>x.id)),collections=new Set(data.collections.map(x=>x.id)),shelves=new Set(data.shelves.map(x=>x.id));
 for(const c of data.collections)if(!rooms.has(c.room))throw Error('Bookshelf belongs to a missing room.');
 for(const sh of data.shelves)if(!collections.has(sh.collection))throw Error('Shelf belongs to a missing bookshelf.');
 for(const book of data.books){if(!shelves.has(book.shelf))throw Error('Book belongs to a missing shelf.');if(typeof book.title!=='string'||typeof book.body!=='string'||!book.title.trim()||!book.body.trim()||book.title.length>MAX_TITLE_LENGTH||book.body.length>MAX_BODY_LENGTH)throw Error('Invalid book text.');}
 for(const sh of data.shelves){if(sh.sourceShelf&&!shelves.has(sh.sourceShelf))throw Error('Linked shelf source is missing.');if(sh.overviewShelf&&!data.shelves.some(x=>x.id===sh.overviewShelf&&x.collection===sh.collection&&!x.overviewShelf))throw Error('Overview shelf reference is invalid.');}
 for(const field of ['rooms','collections','shelves'])for(const item of data[field])if(typeof item.name!=='string'||!item.name.trim())throw Error('Invalid '+field+' name.');
 for(const [key,value] of Object.entries(data.progress)){if(['__proto__','prototype','constructor'].includes(key)||!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid progress record.');if(value.attempts!==undefined&&(!Number.isInteger(value.attempts)||value.attempts<0))throw Error('Invalid placement attempts.');}
 if(data.queueByCollection!==undefined){if(!data.queueByCollection||typeof data.queueByCollection!=='object'||Array.isArray(data.queueByCollection))throw Error('Invalid study queue.');for(const [key,queue] of Object.entries(data.queueByCollection))if(['__proto__','prototype','constructor'].includes(key)||!Array.isArray(queue)||queue.some(x=>typeof x!=='string'))throw Error('Invalid study queue.');}

}

function parseQuizletText(text,delimiter='tab',records='line',customSeparator=''){
 const sep=delimiter==='tab'?'\t':delimiter==='comma'?',':delimiter==='dash'?' - ':customSeparator;
 const result=[],errors=[];
 if(!sep){errors.push('Custom term separator cannot be empty.');return {result,errors}}
 const normalized=String(text).replace(/\r\n?/g,'\n');
 const lines=records==='blank'?normalized.split(/\n[ \t]*\n+/):normalized.split('\n');
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  const cut=line.indexOf(sep);if(cut<1){errors.push('Record '+(i+1)+' needs a term and a definition.');continue}
  const title=line.slice(0,cut).trim(),tail=line.slice(cut+sep.length);
  // Optional third tab-delimited topic for one-line exports.
  let body=tail.trim(),topic='';
  if(records==='line'&&sep==='\t'){const topicCut=tail.lastIndexOf('\t');if(topicCut!==-1){body=tail.slice(0,topicCut).trim();topic=tail.slice(topicCut+1).trim()}}
  if(!title||!body){errors.push('Record '+(i+1)+' has an empty term or definition.');continue}
  if(title.length>MAX_TITLE_LENGTH){errors.push('Record '+(i+1)+': term/question is '+title.length+' characters (maximum '+MAX_TITLE_LENGTH+').');continue}
  if(body.length>MAX_BODY_LENGTH){errors.push('Record '+(i+1)+': definition is '+body.length+' characters (maximum '+MAX_BODY_LENGTH+').');continue}
  if(topic.length>160){errors.push('Record '+(i+1)+': topic exceeds 160 characters.');continue}
  result.push({title,body,topic});
 }return {result,errors}
}

function roomDisplayName(r){if(!r)return 'Your library';const name=String(r.name||'').trim();const prof=String(r.professor||'').trim();return prof&&!name.includes('('+prof+')')?name+' ('+prof+')':name}
export { norm, pairKey, studyDefinition, cleanDefinition, verifyLibrary, parseQuizletText, roomDisplayName };
