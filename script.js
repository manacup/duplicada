// Configuració de Firebase (substitueix amb la teva pròpia configuració)
const firebaseConfig = {
    apiKey: "AIzaSyAwsV6cBafAt6OQRNUEFXCoRT-D5Fzvqbk",
    authDomain: "duplicadascrabble.firebaseapp.com",
    databaseURL: "https://duplicadascrabble-default-rtdb.europe-west1.firebasedatabase.app", // Corrected URL            
    projectId: "duplicadascrabble",
    storageBucket: "duplicadascrabble.firebasestorage.app",
    messagingSenderId: "115691804214",
    appId: "1:115691804214:web:dd923cf73c46146c0b2a97"
};

// Inicialitza Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const gameInfoRef = database.ref('gameInfo'); // Referència per la info del joc (ronda, faristol)

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

let currentWordTiles = [];

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
        button.addEventListener('click', toggleScrap);
        tileButtonsDiv.appendChild(button);
        currentWordTiles.push({ letter: letter, isScrap: false });
    }
    scrapsInput.value = ''; // Reinicia els escarràs quan canvia la paraula
}

// Funció per marcar/desmarcar una lletra com a escarràs
function toggleScrap(event) {
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
});

verticalBtn.addEventListener('click', () => {
    directionInput.value = 'vertical';
    verticalBtn.classList.add('active');
    horizontalBtn.classList.remove('active');
});

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

    // Obté el número de ronda actual
    gameInfoRef.once('value', (snapshot) => {
        const gameData = snapshot.val();
        const currentRound = gameData && gameData.currentRound ? gameData.currentRound : 'desconeguda';
        const currentRack = gameData && gameData.currentRack ? gameData.currentRack : 'desconegut';

        const responseData = {
            coordinates: coordinates,
            direction: direction,
            word: formattedWord,
            scraps: scraps,
            timestamp: firebase.database().ref('.info/serverTimestamp').toString()
        };

        // Desa la resposta a la base de dades sota la ronda actual i el nom del jugador
        database.ref(`rounds/${currentRound}/${playerName}`).set(responseData)
            .then(() => {
                messageDiv.textContent = 'Resposta enviada correctament!';
                messageDiv.classList.remove('alert', 'alert-danger');
                messageDiv.classList.add('alert', 'alert-success');
                responseForm.reset();
                tileButtonsDiv.innerHTML = ''; // Neteja els botons de les fitxes
                directionInput.value = '';
                horizontalBtn.classList.remove('active');
                verticalBtn.classList.remove('active');

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
});
