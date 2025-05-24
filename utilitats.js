// Diccionari de dígrafs i caràcters ficticis
const DIGRAPH_MAP = {
    'QU': 'Û',
    'L·L': 'Ł', 'L.L': 'Ł', 'L-L': 'Ł', 'ĿL': 'Ł', 'W': 'Ł',
    'NY': 'Ý'
};
const REVERSE_DIGRAPH_MAP = {
    'Û': 'QU',
    'Ł': 'L·L',
    'Ý': 'NY'
};

// Valors de les fitxes (inclou dígrafs i escarrassos)
const letterValues = {
    '': 0,      // Escarràs (fitxa en blanc)
    A: 1, E: 1, I: 1, R: 1, S: 1, N: 1, O: 1, T: 1, L: 1, U: 1,
    C: 2, D: 2, M: 2,
    B: 3, G: 3, P: 3,
    F: 4, V: 4,
    H: 8, J: 8, Q: 8, Z: 8,
    Ç: 10, X: 10,
    L·L: 10, NY: 10, QU: 8,
    Ł: 10, Ý: 10, // dígrafs
    Û: 8,         // QU
    û: 0, ł: 0, ý: 0    // escarrassos dígraf
};


// Substitueix dígrafs per caràcter fictici (majúscula/minúscula segons cas)
function normalizeWordInput(word) {
    return word
        .replace(/L·L|L\.L|L-L|ĿL|W/gi, match => match[0] === match[0].toLowerCase() ? 'ł' : 'Ł')
        .replace(/NY/gi, match => match[0] === match[0].toLowerCase() ? 'ý' : 'Ý')
        .replace(/QU/gi, match => match[0] === match[0].toLowerCase() ? 'û' : 'Û');
}

// Mostra caràcters ficticis com a dígrafs
function displayLetter(letter) {
    const upper = letter.toUpperCase();
    if (REVERSE_DIGRAPH_MAP[upper]) {
        // Manté minúscula si és escarràs
        return letter === letter.toLowerCase()
            ? REVERSE_DIGRAPH_MAP[upper].toLowerCase()
            : REVERSE_DIGRAPH_MAP[upper];
    }
    return letter;
}

// Mostra una paraula sencera amb dígrafs humans
function displayWord(word,scraps) {

    return word.split('').map((letter, index) => {
        // Si l'índex és en l'array scraps, converteix la lletra a minúscula
        if (scraps && scraps.includes(index)) {
            return displayLetter(letter.toLowerCase());
        }
        return displayLetter(letter);
    }).join('');
}

// Divideix una paraula en fitxes (tenint en compte dígrafs)

function splitWordToTiles(word) {
    // Retorna un array on cada element és una lletra o dígraf (ja normalitzat)
    const tiles = [];
    let i = 0;
    while (i < word.length) {
        let found = false;
        for (const [digraph, replacement] of Object.entries(DIGRAPH_MAP)) {
            if (word.slice(i, i + digraph.length).toUpperCase() === digraph) {
                // Substitueix pel caràcter fictici
                const norm = normalizeWordInput(word.slice(i, i + digraph.length));
                tiles.push(norm);
                i += digraph.length;
                found = true;
                break;
            }
        }
        if (!found) {
            tiles.push(word[i]);
            i++;
        }
    }
    //console.log('Tiles:', tiles);
    return tiles;
}

// Crea un tauler buit de mida NxN (per defecte 15x15)
function createEmptyBoard(size = 15) {
    return Array.from({ length: size }, () => Array(size).fill(''));
}

// Exemple de tauler de multiplicadors (TW, DW, TL, DL, '')
const multiplierBoard = [
    ['TW', '', '', 'DL', '', '', '', 'TW', '', '', '', 'DL', '', '', 'TW'],
    ['', 'DW', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'DW', ''],
    ['', '', 'DW', '', '', '', 'DL', '', 'DL', '', '', '', 'DW', '', ''],
    ['DL', '', '', 'DW', '', '', '', 'DL', '', '', '', 'DW', '', '','DL'],
    ['', '', '', '', 'DW', '', '', '', '', '', 'DW', '', '', '', ''],
    ['', 'TL', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'TL', ''],
    ['', '', 'DL', '', '', '', 'DL', '', 'DL', '', '', '', 'DL', '', ''],
    ['TW', '', '', 'DL', '', '', '', 'DW', '', '', '', 'DL', '', '', 'TW'],
    ['', '', 'DL', '', '', '', 'DL', '', 'DL', '', '', '', 'DL', '', ''],
    ['', 'TL', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'TL', ''],
    ['', '', '', '', 'DW', '', '', '', '', '', 'DW', '', '', '', ''],
    ['DL', '', '', 'DW', '', '', '', 'DL', '', '', '', 'DW', '','', 'DL'],
    ['', '', 'DW', '', '', '', 'DL', '', 'DL', '', '', '', 'DW', '', ''],
    ['', 'DW', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'DW', ''],
    ['TW', '', '', 'DL', '', '', '', 'TW', '', '', '', 'DL', '', '', 'TW']
];

// Distribució de fitxes
const tileDistribution = {
    
    'A': 12,
    'B': 2,
    'C': 3,
    'Ç': 1,
    'D': 3,
    'E': 13,
    'F': 1,
    'G': 2,
    'H': 1,
    'I': 8,
    'J': 1,
    'L': 4,
    'Ł': 1,
    'M': 3,
    'N': 6,
    'O': 5,
    'P': 2,
    'R': 8,
    'S': 8,
    'T': 5,
    'U': 4,
    'Û': 1,
    'V': 1,
    'X': 1,
    'Ý': 1,
    'Z': 1,
    '?': 2, // Escarrassos (fitxes en blanc)
}



// Centralitza funcions compartides
export { splitWordToTiles, normalizeWordInput, displayLetter, createEmptyBoard, displayWord };

export {
    DIGRAPH_MAP,
    REVERSE_DIGRAPH_MAP,
    letterValues,
    multiplierBoard,
    tileDistribution
};