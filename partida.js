// Firebase refs
const gameInfoRef = database.ref('gameInfo');
const historyRef = database.ref('gameInfo/history');
const masterPlaysRef = database.ref('gameInfo/masterPlays');
const responsesRef = database.ref('rounds');

// DOM refs
const gestioForm = document.getElementById('gestioForm');
const roundNumberInput = document.getElementById('roundNumber');
const currentRackInput = document.getElementById('currentRack');
const gestioMessage = document.getElementById('gestio-message');
const finalitzaRondaBtn = document.getElementById('closeRoundBtn');
const finalitzaMessage = document.getElementById('finalitza-message');
const boardContainer = document.getElementById('board-container');
const rondaActualSpan = document.getElementById('ronda-actual');
const faristolActualSpan = document.getElementById('faristol-actual');
const responsesAccordion = document.getElementById('responsesAccordion');

// Estat local
//let currentBoard = createEmptyBoard(15); // Aquesta funció ve de tauler.js
let masterPlay = null;
let masterPlayTemp = null;
let boardBeforeMasterPlay = null;

// Carrega l'estat inicial de la partida
function loadGameState() {
    gameInfoRef.once('value', (snapshot) => {
        const info = snapshot.val();
        if (info) {
            if (info.currentRound) {
                roundNumberInput.value = info.currentRound;
                rondaActualSpan.textContent = `Ronda: ${info.currentRound}`;
            }
            if (info.currentRack) {
                currentRackInput.value = info.currentRack;
                faristolActualSpan.textContent = `Faristol: ${info.currentRack}`;
            }
            if (info.currentBoard) {
                currentBoard = info.currentBoard;
            } else {
                currentBoard = createEmptyBoard(15);
            }
            renderBoard(currentBoard); // Aquesta funció ve de tauler.js
        }
    });
}
// Importar les funcions saveWordsToBoard i calculateScore si calcul.js és un mòdul
// import { saveWordsToBoard, calculateScore } from './calcul.js';

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

// Amplia letterValues per als caràcters ficticis i escarrassos
const letterValues = {
    '': 0,      // Escarràs (fitxa en blanc)
    A: 1, E: 1, I: 1, R: 1, S: 1, N: 1, O: 1, T: 1, L: 1, U: 1,
    C: 2, D: 2, M: 2,
    B: 3, G: 3, P: 3,
    F: 4, V: 4,
    H: 8, J: 8, Û: 8, Z: 8,
    Ç: 10, X: 10,
    Ł: 10, Ý: 10, // dígrafs
    û: 0, ł: 0, ý: 0    // escarrassos dígraf
};

// Funció per normalitzar la paraula d'entrada (substitueix dígrafs per caràcter fictici)
function normalizeWordInput(word) {
    // Substitueix tots els dígrafs pel seu caràcter fictici (majúscula/minúscula segons cas)
    return word
        .replace(/L·L|L\.L|L-L|ĿL|W/gi, match => match[0] === match[0].toLowerCase() ? 'ł' : 'Ł')
        .replace(/NY/gi, match => match[0] === match[0].toLowerCase() ? 'ý' : 'Ý')
        .replace(/QU/gi, match => match[0] === match[0].toLowerCase() ? 'û' : 'Û');
}

// Funció per desnormalitzar (mostrar) caràcters ficticis com a dígrafs
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

// Definir multiplierBoard (o importar-lo)
const multiplierBoard = [
    ['TW', '', '', 'DL', '', '', '', 'TW', '', '', '', 'DL', '', '', 'TW'],
    ['', 'DW', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'DW', ''],
    ['', '', 'DW', '', '', '', 'DL', '', 'DL', '', '', '', 'DW', '', ''],
    ['DL', '', '', 'DW', '', '', '', 'DL', '', '', '', 'DW', '', '', 'DL'],
    ['', '', '', '', 'DW', '', '', '', '', '', 'DW', '', '', '', ''],
    ['', 'TL', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'TL', ''],
    ['', '', 'DL', '', '', '', 'DL', '', 'DL', '', '', '', 'DL', '', ''],
    ['TW', '', '', 'DL', '', '', '', 'DW', '', '', '', 'DL', '', '', 'TW'],
    ['', '', 'DL', '', '', '', 'DL', '', 'DL', '', '', '', 'DL', '', ''],
    ['', 'TL', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'TL', ''],
    ['', '', '', '', 'DW', '', '', '', '', '', 'DW', '', '', '', ''],
    ['DL', '', '', 'DW', '', '', '', 'DL', '', '', '', 'DW', '', '', 'DL'],
    ['', '', 'DW', '', '', '', 'DL', '', 'DL', '', '', '', 'DW', '', ''],
    ['', 'DW', '', '', '', 'TL', '', '', '', 'TL', '', '', '', 'DW', ''],
    ['TW', '', '', 'DL', '', '', '', 'TW', '', '', '', 'DL', '', '', 'TW']
];

// Funció per crear un tauler buit
function createEmptyBoard(size) {
    const board = [];
    for (let i = 0; i < size; i++) {
        board.push(new Array(size).fill(''));
    }
    return board;
}

// Funció per renderitzar el tauler a l'HTML
function renderBoard(board, newTiles = []) {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('board-table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th'));
    for (let i = 0; i < board.length; i++) {
        const th = document.createElement('th');
        th.textContent = i + 1;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < board.length; i++) {
        const row = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = String.fromCharCode(65 + i);
        row.appendChild(th);

        for (let j = 0; j < board[i].length; j++) {
            const cell = document.createElement('td');
            cell.classList.add('board-cell');
            let display = displayLetter(board[i][j]);
            cell.textContent = display;

            // Multiplicadors visuals
            const mult = multiplierBoard[i][j];
            if (mult === 'TW') cell.classList.add('tw');
            else if (mult === 'DW') cell.classList.add('dw');
            else if (mult === 'TL') cell.classList.add('tl');
            else if (mult === 'DL') cell.classList.add('dl');

            // Si la cel·la té lletra, afegeix el valor
            if (board[i][j] && board[i][j] !== '') {
                const valueSpan = document.createElement('span');
                valueSpan.className = 'tile-value';
                // Si és minúscula (escarràs), mostra 0
                const isScrap = board[i][j] === board[i][j].toLowerCase();
                valueSpan.textContent = isScrap ? '0' : (letterValues[board[i][j].toUpperCase()] ?? '');
                cell.appendChild(valueSpan);
            }

            if (board[i][j] && board[i][j] !== '') {
                cell.classList.add('filled');
            }

            if (board[i][j] && board[i][j] === board[i][j].toLowerCase()) {
                cell.classList.add('blank-tile');
            }

            // --- NOVETAT: Marca fitxes noves ---
            if (newTiles.some(([rowIdx, colIdx]) => rowIdx === i && colIdx === j)) {
                cell.classList.add('new');
            }
            // --- FI NOVETAT ---

            // Click per escriure coordenada
            cell.addEventListener('click', () => {
                const dir = directionInput.value || 'horizontal';
                if (dir === 'horizontal') {
                    coordinatesInput.value = `${String.fromCharCode(65 + i)}${j + 1}`;
                } else {
                    coordinatesInput.value = `${j + 1}${String.fromCharCode(65 + i)}`;
                }
                coordinatesInput.dispatchEvent(new Event('input'));
            });

            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    boardContainer.appendChild(table);
}

// Inicialitzar el tauler (per exemple, 15x15)
let currentBoard = createEmptyBoard(15);
renderBoard(currentBoard);

// Gestionar la selecció de la direcció
const horizontalBtn = document.getElementById('horizontalBtn');
const verticalBtn = document.getElementById('verticalBtn');
const directionInput = document.getElementById('direction');
const coordinatesInput = document.getElementById('coordinates');

// Detecta automàticament la direcció segons el format de les coordenades
coordinatesInput.addEventListener('input', () => {
    const value = coordinatesInput.value.trim().toUpperCase();
    // Ex: A1 (horitzontal), 1A (vertical)
    if (/^[A-Z][0-9]+$/.test(value)) {
        // Lletra primer: horitzontal
        directionInput.value = 'horizontal';
        horizontalBtn.classList.add('active');
        verticalBtn.classList.remove('active');
    } else if (/^[0-9]+[A-Z]$/.test(value)) {
        // Nombre primer: vertical
        directionInput.value = 'vertical';
        verticalBtn.classList.add('active');
        horizontalBtn.classList.remove('active');
    }
});

// Quan es prem un botó de direcció, reformata les coordenades com a player.js
function formatCoordinatesOnDirectionChange() {
    const value = coordinatesInput.value.trim().toUpperCase();
    const letter = value.match(/[A-Z]/);
    const number = value.match(/[0-9]+/);
    if (letter && number) {
        if (directionInput.value === 'horizontal') {
            coordinatesInput.value = `${letter[0]}${number[0]}`;
        } else if (directionInput.value === 'vertical') {
            coordinatesInput.value = `${number[0]}${letter[0]}`;
        }
    }
}

horizontalBtn.addEventListener('click', () => {
    directionInput.value = 'horizontal';
    horizontalBtn.classList.add('active');
    verticalBtn.classList.remove('active');
    formatCoordinatesOnDirectionChange();
    previewMasterPlay(); // <-- AFEGEIX AIXÒ
});

verticalBtn.addEventListener('click', () => {
    directionInput.value = 'vertical';
    verticalBtn.classList.add('active');
    horizontalBtn.classList.remove('active');
    formatCoordinatesOnDirectionChange();
    previewMasterPlay(); // <-- AFEGEIX AIXÒ
});

// Gestionar l'enviament del formulari
const wordForm = document.getElementById('wordForm');


const wordInput = document.getElementById('word');
const tileButtonsDiv = document.getElementById('tileButtons');
const scrapsInput = document.getElementById('scraps');
let currentWordTiles = [];

// Genera els botons de les lletres per marcar escarrassos
function splitWordToTiles(word) {
    // Retorna un array on cada element és una lletra o dígraf (ja normalitzat)
    const tiles = [];
    let i = 0;
    while (i < word.length) {
        // Comprova dígrafs (majúscules i minúscules)
        let found = false;
        for (const d of ['L·L', 'L.L', 'L-L', 'ĿL', 'W', 'NY', 'QU']) {
            const regex = new RegExp('^' + d, 'i');
            if (regex.test(word.slice(i))) {
                // Substitueix pel caràcter fictici
                const norm = normalizeWordInput(word.slice(i, i + d.length));
                tiles.push(norm);
                i += d.length;
                found = true;
                break;
            }
        }
        if (!found) {
            tiles.push(word[i]);
            i++;
        }
    }
    return tiles;
}

function generateTileButtons(word) {
    tileButtonsDiv.innerHTML = '';
    currentWordTiles = [];
    const tiles = splitWordToTiles(word);
    for (let i = 0; i < tiles.length; i++) {
        const letter = tiles[i].toUpperCase();
        const button = document.createElement('button');
        button.classList.add('tile-button');
        button.textContent = displayLetter(tiles[i]);
        button.dataset.index = i;
        button.type = 'button';
        button.addEventListener('click', toggleScrap);

        // Afegeix la puntuació a la cantonada inferior dreta
        const valueSpan = document.createElement('span');
        valueSpan.className = 'tile-value';
        // Si és minúscula (escarràs), mostra 0
        const isScrap = tiles[i] === tiles[i].toLowerCase();
        valueSpan.textContent = isScrap ? '0' : (letterValues[letter] ?? '');
        button.appendChild(valueSpan);

        tileButtonsDiv.appendChild(button);
        currentWordTiles.push({ letter: tiles[i], isScrap: false });
    }
    scrapsInput.value = '';
}

// Marca/desmarca una lletra com a escarràs
function toggleScrap(event) {
    event.preventDefault();
    const button = event.target;
    const index = parseInt(button.dataset.index);
    currentWordTiles[index].isScrap = !currentWordTiles[index].isScrap;
    button.classList.toggle('scrap');
    // Mostra minúscula si és escarràs, sinó majúscula
    button.textContent = currentWordTiles[index].isScrap
        ? displayLetter(currentWordTiles[index].letter.toLowerCase())
        : displayLetter(currentWordTiles[index].letter.toUpperCase());

    // Actualitza el valor de la fitxa a la cantonada
    let valueSpan = button.querySelector('.tile-value');
    if (!valueSpan) {
        valueSpan = document.createElement('span');
        valueSpan.className = 'tile-value';
        button.appendChild(valueSpan);
    }
    if (currentWordTiles[index].isScrap) {
        valueSpan.textContent = '0';
    } else {
        const letter = currentWordTiles[index].letter.toUpperCase();
        valueSpan.textContent = letterValues[letter] ?? '';
    }

    updateScrapsInputValue();
    previewMasterPlay();
}

// Actualitza el camp ocult amb els índexs dels escarrassos
function updateScrapsInputValue() {
    const scrapIndices = currentWordTiles
        .map((tile, idx) => tile.isScrap ? idx : null)
        .filter(idx => idx !== null);
    scrapsInput.value = JSON.stringify(scrapIndices);
}

// Quan s'escriu la paraula, genera els botons (amb dígrafs)
// Sempre converteix a majúscula abans de processar
wordInput.addEventListener('input', () => {
    const word = wordInput.value.toUpperCase();
    generateTileButtons(word);
});

// Marca la casella seleccionada per coordenades d'entrada
const coordValue = coordinatesInput.value.trim().toUpperCase();
let selectedRow = -1, selectedCol = -1;
if (coordValue) {
    const letter = coordValue.match(/[A-Z]/)?.[0];
    const number = parseInt(coordValue.match(/[0-9]+/)?.[0]);
    if (letter && number) {
        if (directionInput.value === 'horizontal') {
            selectedRow = letter.charCodeAt(0) - 65;
            selectedCol = number - 1;
        } else if (directionInput.value === 'vertical') {
            selectedRow = letter.charCodeAt(0) - 65;
            selectedCol = number - 1;
        }
    }
}

// Actualitza ronda i faristol
gestioForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const round = parseInt(roundNumberInput.value);
    const rack = currentRackInput.value.trim().toUpperCase();
    if (!round || !rack) {
        gestioMessage.textContent = 'Introdueix ronda i faristol vàlids.';
        gestioMessage.className = 'alert alert-danger';
        return;
    }
    gameInfoRef.update({ currentRound: round, currentRack: rack })
        .then(() => {
            gestioMessage.textContent = 'Ronda i faristol actualitzats!';
            gestioMessage.className = 'alert alert-success';
            rondaActualSpan.textContent = `Ronda: ${round}`;
            faristolActualSpan.textContent = `Faristol: ${rack}`;
        })
        .catch(() => {
            gestioMessage.textContent = 'Error en actualitzar.';
            gestioMessage.className = 'alert alert-danger';
        });
});

// Desa la jugada mestra temporalment (no a l'historial encara)
wordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const coords = coordinatesInput.value.trim().toUpperCase();
    const word = wordInput.value.trim().toUpperCase();
    const direction = directionInput.value;
    const scraps = JSON.parse(scrapsInput.value || '[]');
    if (!coords || !word || !direction) {
        alert('Introdueix coordenades, paraula i direcció.');
        return;
    }
    // Calcula la posició inicial
    const rowLetter = coords.match(/[A-Za-z]/)?.[0];
    const colNumber = parseInt(coords.match(/[0-9]+/)?.[0]) - 1;
    const startRow = rowLetter ? rowLetter.toUpperCase().charCodeAt(0) - 65 : -1;
    const startCol = colNumber;
    if (startRow < 0 || startCol < 0 || startRow >= currentBoard.length || startCol >= currentBoard.length) {
        alert('Coordenades invàlides.');
        return;
    }
    // Normalitza la paraula (dígrafs a caràcter fictici)
    const tiles = splitWordToTiles(word);
    let formattedWord = '';
    for (let i = 0; i < tiles.length; i++) {
        formattedWord += scraps.includes(i)
            ? tiles[i].toLowerCase()
            : tiles[i].toUpperCase();
    }
   

// Comprovar si la paraula encaixa amb les lletres existents
for (let i = 0; i < formattedWord.length; i++) {
    const row = startRow + (directionInput.value === 'vertical' ? i : 0);
    const col = startCol + (directionInput.value === 'horizontal' ? i : 0);

    if (currentBoard[row][col] !== '' && currentBoard[row][col] !== formattedWord[i]) {
        alert(`La lletra "${displayLetter(formattedWord[i])}" no coincideix amb la lletra "${displayLetter(currentBoard[row][col])}" a la posició ${String.fromCharCode(col + 65)}${row + 1}.`);
        return; // La jugada no és vàlida
    }
}

// Comprova si el tauler està buit
const isBoardEmpty = currentBoard.flat().every(cell => cell === '');

const boardSize = currentBoard.length;
const center = Math.floor(boardSize / 2);

if (isBoardEmpty) {
    // Si el tauler està buit, la paraula ha de passar per la casella central
    let passesThroughCenter = false;
    for (let i = 0; i < formattedWord.length; i++) {
        const row = startRow + (directionInput.value === 'vertical' ? i : 0);
        const col = startCol + (directionInput.value === 'horizontal' ? i : 0);
        if (row === center && col === center) {
            passesThroughCenter = true;
            break;
        }
    }
    if (!passesThroughCenter) {
        alert('La primera paraula ha de passar per la casella central!');
        return;
    }
} else {
    // Si el tauler NO està buit, la paraula ha de tocar almenys una fitxa existent
    let touchesExisting = false;
    for (let i = 0; i < formattedWord.length; i++) {
        const row = startRow + (directionInput.value === 'vertical' ? i : 0);
        const col = startCol + (directionInput.value === 'horizontal' ? i : 0);

        // Comprova les 4 caselles adjacents (amunt, avall, esquerra, dreta)
        const adjacents = [
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1]
        ];
        for (const [adjRow, adjCol] of adjacents) {
            if (
                adjRow >= 0 && adjRow < boardSize &&
                adjCol >= 0 && adjCol < boardSize &&
                currentBoard[adjRow][adjCol] !== ''
            ) {
                touchesExisting = true;
                break;
            }
        }
        // També considera si la casella ja té una lletra (sobreposa)
        if (currentBoard[row][col] !== '') {
            touchesExisting = true;
        }
        if (touchesExisting) break;
    }
    if (!touchesExisting) {
        alert('La paraula ha de tocar almenys una fitxa existent al tauler!');
        return;
    }
}
// Comprova si les fitxes que es posen al tauler existeixen al faristol
const rackTiles = splitWordToTiles(currentRackInput.value);
const rackCounts = {};
rackTiles.forEach(tile => {
    if (tile !== '?') {
        rackCounts[tile] = (rackCounts[tile] || 0) + 1;
    }
});
const rackScraps = rackTiles.filter(tile => tile === '?').length;
console.log('racktiles', rackTiles);
console.log('rackCounts', rackCounts);
console.log("tiles", tiles);

let usedScraps = 0;
let newTiles = [];
for (let i = 0; i < tiles.length; i++) {
    const row = startRow + (direction === 'vertical' ? i : 0);
    const col = startCol + (direction === 'horizontal' ? i : 0);

    // Comprova si la fitxa és nova (no estava al tauler abans)
    if (boardBeforeMasterPlay[row][col] === '') {
        newTiles.push(tiles[i]);
        const letter = tiles[i];
        if (letterValues[letter] > 0) {
            if (rackCounts[letter]) {
                rackCounts[letter]--;
            } else if (scraps.includes(i)) {
                usedScraps++;
            } else {
                alert(`La fitxa "${displayLetter(letter)}" no està disponible al faristol.`);
                return; // La jugada no és vàlida
            }
        }
    }
}
console.log("newTiles", newTiles);
    // Validació i càlcul de puntuació
    const newWordInfo = { word: formattedWord, startRow, startCol, direction };
    const allWords = findAllNewWords(currentBoard, newWordInfo);
    if (!window.validateAllWords(allWords)) {
        alert('Alguna de les paraules formades no és vàlida!');
        return;
    }
     //desformata la paraula amb els escarrassos en minúscula sense normalitzar els dígrafs
     let visualWord = displayWord(word);
    console.log('visualWord:', visualWord);
    const score = calculateFullPlayScore(currentBoard, newWordInfo, letterValues, multiplierBoard);
    document.getElementById('score-master').textContent = `Puntuació: ${score}`;
    // Desa la jugada mestra com a resposta de jugador
    const roundId = roundsList[currentRoundIndex];
    await responsesRef.child(`${roundId}/Jugada mestra`).set({
        coordinates: coords,
        direction: direction,
        word: formattedWord, // <-- Normalitzada!
        scraps: scraps,
        score: score,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    // No facis reset del formulari!
});

// Finalitza ronda i desa a l'historial
finalitzaRondaBtn.addEventListener('click', async () => {
    finalitzaMessage.textContent = '';
    const round = currentRoundIndex + 1;
    const rack = currentRackInput.value.trim().toUpperCase();
/*     if (!round || !rack || !masterPlayTemp) {
        finalitzaMessage.textContent = 'Cal definir ronda, faristol i jugada mestra!';
        finalitzaMessage.className = 'alert alert-danger';
        return;
    } */
    try {
     /*    // Desa la jugada mestra
        await masterPlaysRef.child(round).set({
            coords: masterPlayTemp.coords,
            word: masterPlayTemp.word, // <-- Ja ha de ser normalitzada!
            direction: masterPlayTemp.direction,
            scraps: masterPlayTemp.scraps,
            rack: rack,
            score: masterPlayTemp.score
        });
        // Desa el tauler actualitzat (aplica la jugada mestra)
        saveWordsToBoard(currentBoard, [{
            word: masterPlayTemp.word, // <-- Normalitzada!
            startRow: masterPlayTemp.startRow,
            startCol: masterPlayTemp.startCol,
            direction: masterPlayTemp.direction
        }]); // tauler.js */
        await gameInfoRef.update({ currentBoard: currentBoard });
        // Desa a l'historial
        await historyRef.child(round).set({
            board: currentBoard,
            rack: rack,
            masterPlay: masterPlayTemp
        });
        finalitzaMessage.textContent = 'Ronda desada a l\'historial!';
        finalitzaMessage.className = 'alert alert-success';
        masterPlay = null;
        document.getElementById('score-master').textContent = '';
        renderBoard(currentBoard);
    } catch (e) {
        console.error('Error al desar la ronda:', e);
        finalitzaMessage.textContent = 'Error en desar a l\'historial.';
        finalitzaMessage.className = 'alert alert-danger';
    }
});

function updateAllRoundResponses() {
    console.log('Entra: updateAllRoundResponses');
    responsesRef.on('value', (snapshot) => {
        const allRoundData = snapshot.val();
        responsesAccordion.innerHTML = '<h2>Respostes per Ronda</h2><div class="accordion" id="roundResponsesAccordion">';
        const accordionElement = document.getElementById('roundResponsesAccordion');

        if (allRoundData) {
            Object.entries(allRoundData).forEach(([roundNumber, roundData], idx) => {
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';

                const headingId = `headingRound${roundNumber}`;
                const collapseId = `collapseRound${roundNumber}`;
                const isFirstRound = idx === 0;

                const header = document.createElement('h2');
                header.className = 'accordion-header';
                header.id = headingId;

                const button = document.createElement('button');
                button.className = `accordion-button ${!isFirstRound ? 'collapsed' : ''}`;
                button.type = 'button';
                button.setAttribute('data-bs-toggle', 'collapse');
                button.setAttribute('data-bs-target', `#${collapseId}`);
                button.setAttribute('aria-expanded', isFirstRound ? 'true' : 'false');
                button.setAttribute('aria-controls', collapseId);

                button.textContent = `Ronda ${roundNumber}`;
                header.appendChild(button);
                accordionItem.appendChild(header);

                const collapse = document.createElement('div');
                collapse.id = collapseId;
                collapse.className = `accordion-collapse collapse ${isFirstRound ? 'show' : ''}`;
                collapse.setAttribute('aria-labelledby', headingId);
                collapse.setAttribute('data-bs-parent', '#roundResponsesAccordion');

                const body = document.createElement('table');
                body.className = 'accordion-body table';
                body.innerHTML = '<thead><tr><th>Nom/taula</th><th>Coord.</th><th>Paraula</th></tr></thead>';

                if (roundData) {
                    Object.entries(roundData).forEach(([playerName, playerData]) => {
                        const coordinatesDisplay = playerData.coordinates || '';
                        const wordDisplay = playerData.word || '';
                        body.innerHTML += `<tr><td>${playerName}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td></tr>`;
                    });
                } else {
                    body.innerHTML += '<tr><td colspan="3">No hi ha respostes per a aquesta ronda.</td></tr>';
                }

                collapse.appendChild(body);
                accordionItem.appendChild(collapse);
                accordionElement.appendChild(accordionItem);
            });
        } else {
            responsesAccordion.innerHTML += '<p>Encara no hi ha respostes registrades.</p>';
        }
        responsesAccordion.appendChild(accordionElement);
    });
}

let lastResponsesRef = null;
function updateCurrentRoundResponses(roundId) {
    console.log('Entra: updateCurrentRoundResponses', roundId);
    if (lastResponsesRef) lastResponsesRef.off();
    const ref = responsesRef.child(roundId);
    lastResponsesRef = ref;
    ref.on('value', (snapshot) => {
        const roundData = snapshot.val();
        responsesAccordion.innerHTML = `<h2>Respostes ronda ${roundId}</h2>`;
        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = '<thead><tr><th>Nom/taula</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>';
        if (roundData) {
            Object.entries(roundData).forEach(([playerName, playerData]) => {
                const coordinatesDisplay = playerData.coordinates || '';
                const wordDisplay = playerData.word ? displayWord(playerData.word) : '';
                const scoreDisplay = playerData.score !== undefined ? playerData.score : '';
                table.innerHTML += `<tr><td>${playerName}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td><td>${scoreDisplay}</td></tr>`;
            });
        } else {
            table.innerHTML += '<tr><td colspan="4">No hi ha respostes per a aquesta ronda.</td></tr>';
        }
        responsesAccordion.appendChild(table);
    });
}

// Crida la funció al carregar la pàgina
document.addEventListener('DOMContentLoaded', () => {
    console.log('Entra: DOMContentLoaded');
    loadRoundsHistory();
    console.log('Sortida: DOMContentLoaded');
});

function loadRoundsHistory() {
    console.log('Entra: loadRoundsHistory');
    historyRef.once('value', (snapshot) => {
        const data = snapshot.val() || {};
        roundsList = Object.keys(data).sort((a, b) => Number(a) - Number(b));
        roundsData = data;
        if (roundsList.length === 0) {
            // Si no hi ha rondes, crea la primera
            addNewRound();
        } else {
            currentRoundIndex = roundsList.length - 1;
            showRound(currentRoundIndex);
        }
    });
}

function showRound(idx) {
    console.log('Entra: showRound', idx);
    if (idx < 0 || idx >= roundsList.length) return;
    currentRoundIndex = idx;
    const roundId = roundsList[idx];
    const round = roundsData[roundId];

    const roundDisplay = document.getElementById('roundDisplay');
    if (roundDisplay) roundDisplay.textContent = `Ronda ${roundId}`;
    if (currentRackInput) currentRackInput.value = round.rack || '';

    // --- AFEGEIX AIXÒ ---
    let boardToUse = null;
    if (round.board && Array.isArray(round.board)) {
        boardToUse = round.board.map(row => row.slice());
    } else {
        // Busca el tauler de la ronda anterior
        let prevIdx = idx - 1;
        while (prevIdx >= 0) {
            const prevRound = roundsData[roundsList[prevIdx]];
            if (prevRound && prevRound.board && Array.isArray(prevRound.board)) {
                boardToUse = prevRound.board.map(row => row.slice());
                break;
            }
            prevIdx--;
        }
        // Si tampoc hi ha cap tauler anterior, crea un de buit
        if (!boardToUse) boardToUse = createEmptyBoard(15);
    }
    currentBoard = boardToUse;
    // --- FI AFEGEIX ---

    renderBoard(currentBoard);
    updateCurrentRoundResponses(roundId);
    if (currentRackInput) currentRackInput.disabled = !!round.closed;
    const closeRoundBtn = document.getElementById('closeRoundBtn');
    if (closeRoundBtn) closeRoundBtn.disabled = !!round.closed;
    boardBeforeMasterPlay = currentBoard.map(row => row.slice());

    // --- NOVETAT: Carrega la jugada mestra si existeix ---
    masterPlayTemp = null;
    responsesRef.child(`${roundId}/Jugada mestra`).once('value').then(snap => {
        const master = snap.val();
        if (master) {
            masterPlayTemp = {
                coordinates: master.coordinates,
                direction: master.direction,
                word: master.word,
                scraps: master.scraps,
                score: master.score,
                startRow: master.startRow !== undefined ? master.startRow : null,
                startCol: master.startCol !== undefined ? master.startCol : null
            };
            // Si no tens startRow/startCol a la base de dades, calcula-ho:
            if (masterPlayTemp.startRow === null || masterPlayTemp.startCol === null) {
                const rowLetter = master.coordinates.match(/[A-Za-z]/)?.[0];
                const colNumber = parseInt(master.coordinates.match(/[0-9]+/)?.[0]) - 1;
                masterPlayTemp.startRow = rowLetter ? rowLetter.toUpperCase().charCodeAt(0) - 65 : -1;
                masterPlayTemp.startCol = colNumber;
            }
        }
    });
    // --- FI NOVETAT ---
    console.log('Sortida: showRound', idx);
}

// Navegació de rondes
document.getElementById('prevRoundBtn').onclick = () => {
    console.log('Entra: prevRoundBtn.onclick');
    if (currentRoundIndex > 0) showRound(currentRoundIndex - 1);
    console.log('Sortida: prevRoundBtn.onclick');
};
document.getElementById('nextRoundBtn').onclick = () => {
    console.log('Entra: nextRoundBtn.onclick');
    if (currentRoundIndex < roundsList.length - 1) showRound(currentRoundIndex + 1);
    console.log('Sortida: nextRoundBtn.onclick');
};
/* document.getElementById('addRoundBtn').onclick = () => {
    console.log('Entra: addRoundBtn.onclick');
    addNewRound();
    console.log('Sortida: addRoundBtn.onclick');
}; */
document.getElementById('addRoundBtn').onclick = () => {
    console.log('Entra: addRoundBtn.onclick');
    // Comprova si existeix ronda i si està tancada
    if (roundsList.length > 0) {
        const lastRoundId = roundsList[roundsList.length - 1];
        const lastRound = roundsData[lastRoundId];
        if (!lastRound.closed) {
            alert('No pots obrir una nova ronda fins que tanquis la ronda actual!');
            return;
        }
    }
    addNewRound();
    console.log('Sortida: addRoundBtn.onclick');
};

// Actualitza el faristol de la ronda actual
document.getElementById('updateRackBtn').onclick = async () => {
    console.log('Entra: updateRackBtn.onclick');
    const roundId = roundsList[currentRoundIndex];
    const rack = currentRackInput.value.trim().toUpperCase();
    await historyRef.child(roundId).update({ rack });
    roundsData[roundId].rack = rack;
    gestioMessage.textContent = 'Faristol actualitzat!';
    await gameInfoRef.update({ currentRack: rack, currentRound: roundId });
    console.log('Sortida: updateRackBtn.onclick');
};

coordinatesInput.addEventListener('input', () => { console.log('Entra: coordinatesInput.input'); previewMasterPlay(); console.log('Sortida: coordinatesInput.input'); });
directionInput.addEventListener('input', () => { console.log('Entra: directionInput.input'); previewMasterPlay(); console.log('Sortida: directionInput.input'); });
wordInput.addEventListener('input', () => { console.log('Entra: wordInput.input'); previewMasterPlay(); console.log('Sortida: wordInput.input'); });
scrapsInput.addEventListener('input', () => { console.log('Entra: scrapsInput.input'); previewMasterPlay(); console.log('Sortida: scrapsInput.input'); });

// Previsualitza la jugada mestra
function previewMasterPlay() {
    console.log('Entra: previewMasterPlay');
    const coords = coordinatesInput.value.trim().toUpperCase();
    const word = wordInput.value.trim().toUpperCase();
    const direction = directionInput.value;
    if (!coords || !word || !direction) {
        renderBoard(boardBeforeMasterPlay || currentBoard);
        return;
    }
    // Calcula posició inicial
    const rowLetter = coords.match(/[A-Za-z]/)?.[0];
    const colNumber = parseInt(coords.match(/[0-9]+/)?.[0]) - 1;
    const startRow = rowLetter ? rowLetter.toUpperCase().charCodeAt(0) - 65 : -1;
    const startCol = colNumber;
    if (startRow < 0 || startCol < 0) return;

    // Prepara la paraula
    const tiles = splitWordToTiles(word);
    let formattedWord = '';
    const scraps = JSON.parse(scrapsInput.value || '[]');
    for (let i = 0; i < tiles.length; i++) {
        formattedWord += scraps.includes(i)
            ? tiles[i].toLowerCase()
            : tiles[i].toUpperCase();
    }
    const newWordInfo = { word: formattedWord, startRow, startCol, direction };
    // Còpia del tauler per fer proves
    const testBoard = boardBeforeMasterPlay.map(row => row.slice());
    saveWordsToBoard(testBoard, [newWordInfo]);

    // Calcula les coordenades de les fitxes noves
    let newTiles = [];
    for (let k = 0; k < formattedWord.length; k++) {
        const row = startRow + (direction === 'vertical' ? k : 0);
        const col = startCol + (direction === 'horizontal' ? k : 0);
        if (boardBeforeMasterPlay[row][col] === '') {
            newTiles.push([row, col]);
        }
    }

    renderBoard(testBoard, newTiles);
    const score = calculateFullPlayScore(boardBeforeMasterPlay, newWordInfo, letterValues, multiplierBoard);
    document.getElementById('score-master').textContent = `Puntuació: ${score}`;
    console.log('Sortida: previewMasterPlay');
}

async function canCloseRound(roundId) {
    console.log('Entra: canCloseRound', roundId);
    const snap = await responsesRef.child(`${roundId}/Jugada mestra`).once('value');
    const result = !!snap.val();
    console.log('Sortida: canCloseRound', roundId, result);
    return result;
}

closeRoundBtn.addEventListener('click', async () => {
    const roundId = roundsList[currentRoundIndex];
    if (!(await canCloseRound(roundId))) {
        alert('No pots tancar la ronda sense definir la jugada mestra!');
        return;
    }
    if (masterPlayTemp) {
        // Aplica la jugada mestra només si no està ja aplicada
        saveWordsToBoard(currentBoard, [{
            word: masterPlayTemp.word,
            startRow: masterPlayTemp.startRow,
            startCol: masterPlayTemp.startCol,
            direction: masterPlayTemp.direction
        }]);

        // Calcula el nou faristol restant
        let rackTiles = splitWordToTiles(currentRackInput.value.trim().toUpperCase());
        let usedTiles = [];
        let wordTiles = masterPlayTemp.word.split('');
        let scraps = masterPlayTemp.scraps || [];
        for (let i = 0; i < wordTiles.length; i++) {
            const row = masterPlayTemp.startRow + (masterPlayTemp.direction === 'vertical' ? i : 0);
            const col = masterPlayTemp.startCol + (masterPlayTemp.direction === 'horizontal' ? i : 0);
            if (boardBeforeMasterPlay[row][col] === '') {
                if (scraps.includes(i)) {
                    usedTiles.push('?');
                } else {
                    usedTiles.push(wordTiles[i].toUpperCase());
                }
            }
        }
        let newRack = rackTiles.slice();
        for (const used of usedTiles) {
            const idx = newRack.indexOf(used);
            if (idx !== -1) newRack.splice(idx, 1);
        }
        const updatedRack = newRack.join('');

        // Desa la ronda tancada amb el rack original (NO el modifiquis)
        await historyRef.child(roundId).update({
            board: currentBoard,
            closed: true
            // NO actualitzis el rack aquí!
        });
        // Actualitza el faristol global per a la següent ronda
        await gameInfoRef.update({ currentRack: updatedRack, currentRound: roundId });
        currentRackInput.value = updatedRack;
        renderRackTiles(updatedRack);
        showRound(currentRoundIndex);
    }
});

function addNewRound() {
    console.log('Entra: addNewRound');
    const newRoundId = roundsList.length > 0 ? String(Number(roundsList[roundsList.length - 1]) + 1) : '1';
    const prevBoard = roundsList.length > 0 ? roundsData[roundsList[roundsList.length - 1]].board : createEmptyBoard(15);

    // NOVETAT: agafa el faristol actual per defecte
    const currentRack = currentRackInput.value.trim().toUpperCase();

    const newRound = {
        rack: currentRack, // <-- aquí!
        board: prevBoard.map(row => row.slice()),
        masterPlay: null,
        closed: false
    };
    historyRef.child(newRoundId).set(newRound).then(() => {
        roundsList.push(newRoundId);
        roundsData[newRoundId] = newRound;
        showRound(roundsList.length - 1);
    });
    console.log('Sortida: addNewRound');
}

// Renderitza les fitxes del faristol
// (amb els escarrassos en minúscula)

function renderRackTiles(rackString) {
    const rackTilesDiv = document.getElementById('rackTiles');
    rackTilesDiv.innerHTML = '';
    const tiles = splitWordToTiles(rackString.toUpperCase());
    console.log("fitxes" + tiles)
    for (let i = 0; i < tiles.length; i++) {
        const letter = tiles[i];
        const div = document.createElement('div');
        div.className = 'rack-tile' + (letter === '?' ? ' scrap' : '');
        div.textContent = displayLetter(letter);
        // Valor de la fitxa
        const valueSpan = document.createElement('span');
        valueSpan.className = 'tile-value';
        valueSpan.textContent = (letter === '?' ? '0' : (letterValues[letter.toUpperCase()] ?? ''));
        div.appendChild(valueSpan);
        rackTilesDiv.appendChild(div);
    }
}

// Escolta canvis al faristol a la base de dades i actualitza el rack visual
gameInfoRef.child('currentRack').on('value', (snapshot) => {
    const rack = snapshot.val() || '';
    renderRackTiles(rack);
    // També actualitza l'input si vols sincronitzar-lo:
    currentRackInput.value = rack;
});

function displayWord(word) {
    return word.split('').map(displayLetter).join('');
}

const tileDistribution = {
    '': 2, // escarràs
    'E': 13, 'A': 12, 'I': 8, 'R': 8, 'S': 8, 'N': 6, 'O': 5, 'T': 5, 'L': 4, 'U': 4,
    'C': 3, 'D': 3, 'M': 3,
    'B': 2, 'G': 2, 'P': 2,
    'F': 1, 'V': 1,
    'H': 1, 'J': 1, 'Q': 1, 'Z': 1,
    'Ç': 1, 'Ł': 1, 'Ý': 1, 'X': 1 // Ł = L·L, Ý = NY
};
