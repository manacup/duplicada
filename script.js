// Configuració de Firebase (substitueix amb la teva pròpia configuració)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inicialitza Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const responsesRef = database.ref('responses');

const responseForm = document.getElementById('responseForm');
const coordinatesInput = document.getElementById('coordinates');
const horizontalBtn = document.getElementById('horizontalBtn');
const verticalBtn = document.getElementById('verticalBtn');
const directionInput = document.getElementById('direction');
const wordInput = document.getElementById('word');
const tileButtonsDiv = document.getElementById('tileButtons');
const scrapsInput = document.getElementById('scraps');
const messageDiv = document.getElementById('message');

let currentWordTiles = [];

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

    const coordinates = coordinatesInput.value.trim().toUpperCase();
    const direction = directionInput.value;
    const word = wordInput.value.trim().toUpperCase();
    const scraps = scrapsInput.value; // Contindrà un array d'índexs dels escarràs

    if (!direction) {
        messageDiv.textContent = 'Si us plau, selecciona la direcció.';
        messageDiv.classList.add('alert', 'alert-danger');
        return;
    }

    const responseData = {
        coordinates: coordinates,
        direction: direction,
        word: word,
        scraps: scraps,
        timestamp: firebase.database.serverValue.TIMESTAMP
    };

    // Envia les dades a Firebase
    responsesRef.push(responseData)
        .then(() => {
            messageDiv.textContent = 'Resposta enviada correctament!';
            messageDiv.classList.remove('alert', 'alert-danger');
            messageDiv.classList.add('alert', 'alert-success');
            responseForm.reset();
            tileButtonsDiv.innerHTML = ''; // Neteja els botons de les fitxes
            directionInput.value = '';
            horizontalBtn.classList.remove('active');
            verticalBtn.classList.remove('active');
        })
        .catch((error) => {
            console.error("Error en enviar la resposta:", error);
            messageDiv.textContent = 'Error en enviar la resposta. Si us plau, intenta-ho de nou.';
            messageDiv.classList.remove('alert', 'alert-success');
            messageDiv.classList.add('alert', 'alert-danger');
        });
});
