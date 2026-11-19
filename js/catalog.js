import { verifyLibrary } from './core.js';
export async function loadDatasets(base = new URL('../data/', import.meta.url), fetcher = fetch) {
  const read = async file => {
    if (!/^[a-z0-9-]+\.json$/.test(file)) throw Error('Invalid catalog path.');
    const response = await fetcher(new URL(file, base));
    if (!response.ok) throw Error('Could not load course data: ' + file);
    return response.json();
  };
  const manifest = await read('catalog.json');
  if(manifest.version!==1 || !Array.isArray(manifest.courses))throw Error('Invalid course catalog.');
  const seen=new Set();const files=await Promise.all(manifest.courses.map(async entry=>{
    if(!entry.roomId||seen.has(entry.roomId)||!['legacy','room'].includes(entry.format))throw Error('Invalid or repeated catalog course.');seen.add(entry.roomId);return read(entry.file);
  }));
  const datasets={catalogEntries:manifest.courses,catalogBundles:[]};
  for(let i=0;i<files.length;i++){if(manifest.courses[i].format==='legacy')Object.assign(datasets,files[i]);else datasets.catalogBundles.push(files[i]);}
  return datasets;
}
export function extendCatalog(starter,datasets){
  let result=structuredClone(starter);
  for(const bundle of datasets.catalogBundles||[]){verifyLibrary(bundle);for(const key of ['rooms','collections','shelves','books'])result[key].push(...structuredClone(bundle[key]));}
  if(datasets.FINAL_EXAM_DATA){
    const final=datasets.FINAL_EXAM_DATA;
    const collection={id:'wh1-final-exam',room:'world',name:'Final Exam'};
    result.collections.push(collection);
    result.shelves.push(...final.shelves.map(sh=>({id:'wh1-final-'+sh.id,collection:collection.id,name:sh.name})));
    result.books.push(...final.books.map((b,i)=>({id:'world-final-'+b.id,shelf:'wh1-final-'+b.shelf,title:b.term,body:b.definition,source:'World History I final exam packet, printed p. '+b.page,color:i%7,requiredDate:b.date===true})));
  }
  verifyLibrary(result);return result;
}
export function emptyLibrary() { return { rooms: [], collections: [], shelves: [], books: [], progress: {}, queueByCollection: {}, version: 12, stableSchema: 1 }; }
export function installCourse(library, starter, roomId) {
  const room = starter.rooms.find(r => r.id === roomId);
  if (!room) throw Error('Unknown course.');
  if (library.rooms.some(r => r.id === roomId)) throw Error('Course already installed.');
  const collections = starter.collections.filter(c => c.room === roomId);
  const cids = new Set(collections.map(c => c.id));
  const shelves = starter.shelves.filter(s => cids.has(s.collection));
  const sids = new Set(shelves.map(s => s.id));
  const books = starter.books.filter(b => sids.has(b.shelf));
  const candidate = structuredClone(library);
  for (const [key,items] of Object.entries({ rooms:[room], collections, shelves, books })) candidate[key].push(...structuredClone(items));
  if(candidate.hiddenDefaults){candidate.hiddenDefaults.rooms=(candidate.hiddenDefaults.rooms||[]).filter(x=>x!==roomId);candidate.hiddenDefaults.collections=(candidate.hiddenDefaults.collections||[]).filter(x=>!cids.has(x));}
  verifyLibrary(candidate);
  return candidate;
}

// Opt-in addition to an already installed course; never replace existing books or progress.
export function installBookshelf(library, starter, collectionId){
  const collection=starter.collections.find(c=>c.id===collectionId);
  if(!collection||!library.rooms.some(r=>r.id===collection.room))throw Error('Install the course first.');
  if(library.collections.some(c=>c.id===collectionId))throw Error('Bookshelf already installed.');
  const shelves=starter.shelves.filter(s=>s.collection===collectionId);
  const ids=new Set(shelves.map(s=>s.id));
  const books=starter.books.filter(b=>ids.has(b.shelf));
  const candidate=structuredClone(library);
  candidate.collections.push(structuredClone(collection));
  candidate.shelves.push(...structuredClone(shelves));candidate.books.push(...structuredClone(books));
  if(candidate.hiddenDefaults)candidate.hiddenDefaults.collections=(candidate.hiddenDefaults.collections||[]).filter(id=>id!==collectionId);
  verifyLibrary(candidate);return candidate;
}
