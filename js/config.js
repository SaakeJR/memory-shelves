export const APP_VERSION = "1.0.0";
export const SCHEMA_VERSION = 12;
export const MAX_TITLE_LENGTH = 2000;
export const MAX_BODY_LENGTH = 10000;
export const KEY = "memory-shelves-v1";
export const PREF_KEY = "memory-shelves-appearance";
export const LAYOUT_PREF_KEY = "memory-shelves-study-layout";
export const RECOVERY_KEY = "memory-shelves-v160-recovery";
export const COVER_COLORS = ['#7b4433','#244b51','#655034','#5b4773','#33604c','#80472c','#364d71'];
// Display order is light to dark. Insert future themes by visual lightness.
export const THEME_OPTIONS = Object.freeze([
 {id:'birch',label:'Birch',swatch:'#dfc397'},
 {id:'cherry',label:'Cherry',swatch:'#87473b'},
 {id:'dark-oak',label:'Dark Oak',swatch:'#684227'}
]);
export const THEMES = THEME_OPTIONS.map(theme=>theme.id);
export const LAYOUTS = ['bookshelf','flashcard'];
