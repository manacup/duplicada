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
    for (let i = 0; i < word.length; i++) {
        const letter = word[i].toUpperCase();
        const button = document.createElement('button');
        button.classList.add('tile-button');
        button.textContent = letter;
        button.dataset.index = i;
        button.addEventListener('click', toggleScrap); // Important: No ha de fer submit
        tileButtonsDiv.appendChild(button);
        currentWordTiles.push({ letter: letter, isScrap: false });
    }
    scrapsInput.value = ''; // Reinicia els escarràs quan canvia la paraula
}

// Funció per marcar/desmarcar una lletra com a escarràs
function toggleScrap(event) {
    event.preventDefault(); // Prevent the default button behavior (potential form submission)
    const button = event.target;
    const index = parseInt(button.dataset.index);
    currentWordTiles[index].isScrap = !currentWordTiles[index].isScrap;
    button.classList.toggle('scrap');
    button.textContent = currentWordTiles[index].isScrap ? currentWordTiles[index].letter.toLowerCase() : currentWordTiles[index].letter.toUpperCase();
    updateScrapsInputValue();
}

// Funció per actualitzar el valor del camp ocult amb els escarràs
function updateScrapsInputValue() {
    const scrapIndices = currentWordTiles.filter(tile => tile.isScrap).map(tile => currentWordTiles.indexOf(tile));
    scrapsInput.value = JSON.stringify(scrapIndices);
}

// Event per generar els botons quan s'introdueix una paraula
wordInput.addEventListener('input', () => {
    const word = wordInput.value;
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
    let word = wordInput.value.trim().toUpperCase();
    const scraps = JSON.parse(scrapsInput.value || '[]');

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

    // Formateja la paraula amb els escarrassos en minúscula
    let formattedWord = '';
    for (let i = 0; i < word.length; i++) {
        if (scraps.includes(i)) {
            formattedWord += word[i].toLowerCase();
        } else {
            formattedWord += word[i];
        }
    }

    // Obté el número de ronda actual i el faristol de la interfície
    const currentRoundDisplayed = roundNumberDisplay.textContent;
    const currentRackDisplayed = currentRackDisplay.textContent;

    // Desa la resposta a la base de dades sota la ronda actual i el nom del jugador
    database.ref(`rounds/${currentRoundDisplayed}/${playerName}`).set({ // Utilitza la ronda mostrada
        coordinates: coordinates,
        direction: direction,
        word: formattedWord,
        scraps: scraps,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        round: currentRoundDisplayed, // Desa la ronda
        rack: currentRackDisplayed // Desa el faristol
    })
    .then(() => {
        messageDiv.textContent = 'Resposta enviada correctament!';
        messageDiv.classList.remove('alert', 'alert-danger');
        messageDiv.classList.add('alert', 'alert-success');
        responseForm.reset();
        tileButtonsDiv.innerHTML = ''; // Neteja els botons de les fitxes
        directionInput.value = '';
        horizontalBtn.classList.remove('active');
        verticalBtn.classList.remove('active');

        // Restaura el nom del jugador des de localStorage
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            playerNameInput.value = savedName;
        }

        // Guarda el nom del jugador al localStorage (per si no hi era prèviament o s'ha modificat)
        localStorage.setItem('playerName', playerName);
    })
    .catch((error) => {
        console.error("Error en enviar la resposta:", error);
        messageDiv.textContent = 'Error en enviar la resposta. Si us plau, intenta-ho de nou.';
        messageDiv.classList.remove('alert', 'alert-success');
        messageDiv.classList.add('alert', 'alert-danger');
    });
});