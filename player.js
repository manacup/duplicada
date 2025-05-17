import { database } from './config.js';

// Referències Firebase (utilitzant l\'objecte database importat)
const gameInfoRef = database.ref('gameInfo'); // Referència per la info del joc (ronda, faristol)
const formEnabledRef = database.ref('formEnabled'); // Referència a l'estat del formulari
const responsesRef = database.ref('rounds'); // Referència per guardar les respostes

// Referències als elements del DOM

const responseForm = document.getElementById('responseForm');
const playerNameInput = document.getElementById('playerName');
const coordinatesInput = document.getElementById('coordinates');
const horizontalBtn = document.getElementById('horizontalBtn');
const verticalBtn = document.getElementById('verticalBtn');
const directionInput = document.getElementById('direction');
const wordInput = document.getElementById('word');
const tileButtonsDiv = document.getElementById('tileButtons');
const scrapsInput = document.getElementById('scraps');
const messageDiv = document.getElementById('message');
const roundNumberDisplay = document.getElementById('roundNumber');
const currentRackDisplay = document.getElementById('currentRack');
const submitButton = responseForm.querySelector('button[type="submit"]'); // Obté el botó d'enviament

let currentWordTiles = [];

// Diccionari de dígrafs i caràcters ficticis
const DIGRAPH_MAP = {
    'QU': 'Ú',
    'L·L': 'Ł', 'L.L': 'Ł', 'L-L': 'Ł', 'ĿL': 'Ł', 'W': 'Ł',
    'NY': 'Ý'
};
const REVERSE_DIGRAPH_MAP = {
    'Ú': 'QU',
    'Ł': 'L·L',
    'Ý': 'NY'
};

// Funció per normalitzar la paraula d'entrada (substitueix dígrafs per caràcter fictici)
function normalizeWordInput(word) {
    return word
        .replace(/L·L|L\.L|L-L|ĿL|W/gi, match => match[0] === match[0].toLowerCase() ? 'ł' : 'Ł')
        .replace(/NY/gi, match => match[0] === match[0].toLowerCase() ? 'ý' : 'Ý')
        .replace(/QU/gi, match => match[0] === match[0].toLowerCase() ? 'ú' : 'Ú');
}

// Funció per desnormalitzar (mostrar) caràcters ficticis com a dígrafs
function displayLetter(letter) {
    const upper = letter.toUpperCase();
    if (REVERSE_DIGRAPH_MAP[upper]) {
        return letter === letter.toLowerCase()
            ? REVERSE_DIGRAPH_MAP[upper].toLowerCase()
            : REVERSE_DIGRAPH_MAP[upper];
    }
    return letter;
}

// Separa la paraula en fitxes (lletres o dígrafs)
function splitWordToTiles(word) {
    const tiles = [];
    let i = 0;
    while (i < word.length) {
        let found = false;
        for (const d of ['L·L', 'L.L', 'L-L', 'ĿL', 'W', 'NY', 'QU']) {
            const regex = new RegExp('^' + d, 'i');
            if (regex.test(word.slice(i))) {
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

// Funció per habilitar/deshabilitar el formulari
function setFormEnabled(isEnabled) {
    if (submitButton) {
        submitButton.disabled = !isEnabled;
        if (!isEnabled) {
            submitButton.textContent = 'Formulari Desactivat';
        } else {
            submitButton.textContent = 'Enviar Resposta';
        }
    }

    // Opcionalment, pots deshabilitar altres elements del formulari si cal
    //playerNameInput.disabled = !isEnabled;
    coordinatesInput.disabled = !isEnabled;
    horizontalBtn.disabled = !isEnabled;
    verticalBtn.disabled = !isEnabled;
    wordInput.disabled = !isEnabled;
    // Els botons de les lletres es controlen per la paraula introduïda
}

// Escolta els canvis en l'estat del formulari
formEnabledRef.on('value', (snapshot) => {
    const isEnabled = snapshot.val();
    setFormEnabled(isEnabled);
});

// Carrega el nom del jugador des de localStorage al carregar la pàgina
document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        playerNameInput.value = savedName;
    }

    // Escolta els canvis en la informació del joc (ronda i faristol)
    gameInfoRef.on('value', (snapshot) => {
        const gameData = snapshot.val();
        if (gameData && gameData.currentRound && gameData.currentRack) {
            roundNumberDisplay.textContent = gameData.currentRound;
            currentRackDisplay.textContent = gameData.currentRack;
        } else {
            roundNumberDisplay.textContent = 'No disponible';
            currentRackDisplay.textContent = 'No disponible';
        }

        // Assegura que l'estat del formulari es carregui també al iniciar
        formEnabledRef.once('value', (snapshot) => {
            const isEnabled = snapshot.val();
            setFormEnabled(isEnabled);
        });
    });
});

// Funció per generar els botons de les fitxes
function generateTileButtons(word) {
    tileButtonsDiv.innerHTML = '';
    currentWordTiles = [];
    const tiles = splitWordToTiles(word);
    for (let i = 0; i < tiles.length; i++) {
        const button = document.createElement('button');
        button.classList.add('tile-button');
        button.textContent = displayLetter(tiles[i]);
        button.dataset.index = i;
        button.type = 'button';
        button.addEventListener('click', toggleScrap);
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
    button.textContent = currentWordTiles[index].isScrap
        ? displayLetter(currentWordTiles[index].letter.toLowerCase())
        : displayLetter(currentWordTiles[index].letter.toUpperCase());
    updateScrapsInputValue();
}

// Actualitza el camp ocult amb els índexs dels escarrassos
function updateScrapsInputValue() {
    const scrapIndices = currentWordTiles
        .map((tile, idx) => tile.isScrap ? idx : null)
        .filter(idx => idx !== null);
    scrapsInput.value = JSON.stringify(scrapIndices);
}

// Event per generar els botons quan s'introdueix una paraula
wordInput.addEventListener('input', () => {
    const word = wordInput.value.toUpperCase();
    generateTileButtons(word);
});

// Events per seleccionar la direcció
horizontalBtn.addEventListener('click', () => {
    directionInput.value = 'horitzontal';
    horizontalBtn.classList.add('active');
    verticalBtn.classList.remove('active');
    formatCoordinatesOnDirectionChange(); // Formateja les coordenades al canviar la direcció
});

verticalBtn.addEventListener('click', () => {
    directionInput.value = 'vertical';
    verticalBtn.classList.add('active');
    horizontalBtn.classList.remove('active');
    formatCoordinatesOnDirectionChange(); // Formateja les coordenades al canviar la direcció
});

// Funció per formatejar les coordenades segons la direcció seleccionada
function formatCoordinatesOnDirectionChange() {
    const currentCoordinates = coordinatesInput.value.trim().toUpperCase();
    const direction = directionInput.value;

    if (currentCoordinates.length === 2) {
        const letter = currentCoordinates.match(/[A-Za-z]/);
        const number = currentCoordinates.match(/[0-9]/);

        if (letter && number) {
            if (direction === 'horitzontal') {
                coordinatesInput.value = `${letter[0].toUpperCase()}${number[0]}`;
            } else if (direction === 'vertical') {
                coordinatesInput.value = `${number[0]}${letter[0].toUpperCase()}`;
            }
        }
    }
}

// Event per enviar el formulari
responseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const playerName = playerNameInput.value.trim();
    const coordinates = coordinatesInput.value.trim().toUpperCase();
    const direction = directionInput.value;
    // const word = wordInput.value.trim().toUpperCase(); // Ja no cal
    // const scraps = JSON.parse(scrapsInput.value || '[]'); // Ja no cal

    if (!playerName) {
        messageDiv.textContent = 'Si us plau, introdueix el teu nom o número de taula.';
        messageDiv.classList.add('alert', 'alert-danger');
        return;
    }

    if (!direction) {
        messageDiv.textContent = 'Si us plau, selecciona la direcció.';
        messageDiv.classList.add('alert', 'alert-danger');
        return;
    }

    // Construeix la paraula real segons l'estat dels botons d'escarràs
    let formattedWord = '';
    for (let i = 0; i < currentWordTiles.length; i++) {
        formattedWord += currentWordTiles[i].isScrap
            ? currentWordTiles[i].letter.toLowerCase()
            : currentWordTiles[i].letter.toUpperCase();
    }

    // Obté el número de ronda actual i el faristol de la interfície
    const currentRoundDisplayed = roundNumberDisplay.textContent;
    const currentRackDisplayed = currentRackDisplay.textContent;

    // Desa la resposta a la base de dades sota la ronda actual i el nom del jugador
    database.ref(`rounds/${currentRoundDisplayed}/${playerName}`).set({
        coordinates: coordinates,
        direction: direction,
        word: formattedWord,
        scraps: currentWordTiles
            .map((tile, idx) => tile.isScrap ? idx : null)
            .filter(idx => idx !== null),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        round: currentRoundDisplayed,
        rack: currentRackDisplayed
    })
    .then(() => {
        messageDiv.textContent = 'Resposta enviada correctament!';
        messageDiv.classList.remove('alert', 'alert-danger');
        messageDiv.classList.add('alert', 'alert-success');
        responseForm.reset();
        tileButtonsDiv.innerHTML = '';
        directionInput.value = '';
        horizontalBtn.classList.remove('active');
        verticalBtn.classList.remove('active');

        // Restaura el nom del jugador des de localStorage
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            playerNameInput.value = savedName;
        }

        // Guarda el nom del jugador al localStorage
        localStorage.setItem('playerName', playerName);
    })
    .catch((error) => {
        console.error("Error en enviar la resposta:", error);
        messageDiv.textContent = 'Error en enviar la resposta. Si us plau, intenta-ho de nou.';
        messageDiv.classList.remove('alert', 'alert-success');
        messageDiv.classList.add('alert', 'alert-danger');
    });
});