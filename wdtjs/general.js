// --- VALIDACIÓ DE PARAULES SCRABBLE ---
// Paràmetre per activar/desactivar la validació de paraules
const ENABLE_WORD_VALIDATION = true;

// Diccionari i funcions de validació
var actdict = "disc";
var dicts = {};
var caches_size = 100;

// Mapes per normalitzar paraules
var wp2wcMap = {};
wp2wcMap.diac = {
  À: "A",
  Á: "A",
  Ä: "A",
  È: "E",
  É: "E",
  Ë: "E",
  Í: "I",
  Ì: "I",
  Ï: "I",
  Ö: "O",
  Ó: "O",
  Ò: "O",
  Ù: "U",
  Ú: "U",
  Ü: "U",
};
wp2wcMap.toC = {
  'QU': "Q",Û: "Q",
  'Ç': "1",
  "L·L": "2",
  "L\2xEL": "2",
  'ĿL': "2",
  "L-L": "2",
  'NY': "3",
 ' Ñ': "3",
  
  'Ł': "2",
  'ł': "2",
  'Ý': "3",
  'ý': "3",
};
wp2wcMap.toND = {
  'ĿL': "L·L",
  "L\2xEL": "L·L",
  "L-L": "L·L",
  'Ñ': "NY",
  'Û': "QU",
  'Ł': "L·L",
  'Ý': "NY",
};
wp2wcMap.toP = { Q: "QU", 1: "Ç", 2: "L·L", 3: "NY" };

// Normalitza una paraula per consulta
function normalizeWord(str) {
  var nw = str.toUpperCase();
  nw = nw.replace(/[^A-Z0-9 \-\.·]/g, function (chr) {
    return wp2wcMap.diac[chr] || chr;
  });
  for (let k in wp2wcMap.toC)
    nw = nw.replace(new RegExp(k, "gm"), wp2wcMap.toC[k]);
  return nw;
}

// Normalitza per consulta sense diacrítics
function normalizeWordND(str) {
  var nw = str.toUpperCase();
  nw = nw.replace(/[^A-Z0-9 \-\.·]/g, function (chr) {
    return wp2wcMap.diac[chr] || chr;
  });
  for (let k in wp2wcMap.toND)
    nw = nw.replace(new RegExp(k, "gm"), wp2wcMap.toND[k]);
  return nw;
}

// Consulta una paraula al diccionari actiu
function isWordValid(word) {
  if (!ENABLE_WORD_VALIDATION) return true;
  const d = actdict;
  if (!dicts[d]) return false;
  const nd = normalizeWordND(word);
  // Consulta a la cache
  if (dicts[d].cacheOK && dicts[d].cacheOK.indexOf(nd) > -1) return true;
  if (dicts[d].cacheKO && dicts[d].cacheKO.indexOf(nd) > -1) return false;
  // Consulta trie
  const c = normalizeWord(word);
  const valid = !/Q(?!U)/gi.test(nd) && dicts[d].frozen.lookup(c);
  // Actualitza cache
  const okko = valid ? "OK" : "KO";
  if (dicts[d]["cache" + okko].length === caches_size)
    dicts[d]["cache" + okko].shift();
  dicts[d]["cache" + okko].push(nd);
  return valid;
}

// Inicialitza el diccionari (només si cal)
function getDict(dict) {
  if (typeof dicts[dict] == "undefined" && typeof eval(dict) != "undefined") {
    dicts[dict] = {};
    dicts[dict].cacheOK = [];
    dicts[dict].cacheKO = [];
    dicts[dict].frozen = new FrozenTrie(
      eval(dict + ".trie"),
      eval(dict + ".directory"),
      eval(dict + ".nodeCount")
    );
  }
  return true;
}

// --- VALIDACIÓ DE PARAULES DE JUGADA SCRABBLE ---
// Aquesta funció s'ha de cridar des de tauler.js/calculateFullPlayScore abans de puntuar/afegir la jugada
/**
 * Valida totes les paraules formades en una jugada.
 * @param {Array<{word: string}>} allWords - Totes les paraules formades (principal i secundàries)
 * @returns {boolean} - true si totes són vàlides, false si alguna no ho és
 */
function validateAllWords(allWords) {
  if (!ENABLE_WORD_VALIDATION) return true;
  for (let i = 0; i < allWords.length; i++) {
    if (!isWordValid(allWords[i].word)) {
      console.warn(`[VALIDACIÓ] Paraula invàlida: "${allWords[i].word}"`);
      return false;
    }
  }
  return true;
}

// Exporta la funció per a ús des de tauler.js/calculateFullPlayScore
window.validateAllWords = validateAllWords;
window.getDict = getDict;

// --- INICIALITZACIÓ ---
jQuery(function ($) {
  getDict("disc");
  //console.log("window.validateAllWords:", window.validateAllWords);
});
