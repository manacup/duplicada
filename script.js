
// Inicialitza Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const gameInfoRef = database.ref('gameInfo'); // Referència per la info del joc (ronda, faristol)
const formEnabledRef = database.ref('formEnabled'); // Referència a l'estat del formulari

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

// Funció per
