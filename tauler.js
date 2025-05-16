// Importar les funcions saveWordsToBoard i calculateScore si calcul.js és un mòdul
// import { saveWordsToBoard, calculateScore } from './calcul.js';


// Definir letterValues i multiplierBoard (o importar-los)
const letterValues = {
    A: 1, E: 1, I: 1, O: 1, U: 1,
    L: 1, N: 1, S: 1, R: 1, T: 1,
    D: 2, G: 2,
    B: 3, C: 3, M: 3, P: 3,
    F: 4, H: 4, V: 4, W: 4, Y: 4,
    K: 5,
    J: 8, X: 8,
    Q: 10, Z: 10
};

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
function renderBoard(board) {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = ''; // Neteja el contingut actual del tauler

    const table = document.createElement('table');
    table.classList.add('board-table'); // Afegeix una classe per estil

    // Capçalera de columnes (lletres)
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.appendChild(document.createElement('th')); // Cella buida per a la cantonada superior esquerra
    for (let i = 0; i < board.length; i++) {
        const th = document.createElement('th');
        th.textContent = i + 1; // 1, 2, 3, ...
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Cos del tauler (files i cel·les)
    const tbody = document.createElement('tbody');
    for (let i = 0; i < board.length; i++) {
        const row = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = String.fromCharCode(65 + i); // 'A', 'B', 'C', ...
        row.appendChild(th); // Capçalera de fila (números)

        for (let j = 0; j < board[i].length; j++) {
            const cell = document.createElement('td');
            cell.classList.add('board-cell'); // Afegeix una classe per estil
            cell.textContent = board[i][j];
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

// Gestionar l'enviament del formulari
const wordForm = document.getElementById('wordForm');
wordForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const coordinatesInput = document.getElementById('coordinates');
    const wordInput = document.getElementById('word');
    const directionInput = document.getElementById('direction'); // Hem d'afegir un input per a la direcció al formulari

    const coordinates = coordinatesInput.value.trim().toUpperCase();
    const word = wordInput.value.trim().toUpperCase();
    const direction = directionInput.value; // Obtenir la direcció

    // Validar les coordenades i la paraula (cal implementar-ho)
    if (!coordinates || !word || !direction) {
        alert('Si us plau, introdueix les coordenades, la paraula i la direcció.');
        return;
    }

    // Convertir coordenades (ex: A1 -> [0, 0], B2 -> [1, 1])
    // Això és una simplificació, caldrà una lògica més robusta
    const rowLetter = coordinates.match(/[A-Za-z]/)?.[0];
    const colNumber = parseInt(coordinates.match(/[0-9]+/)?.[0]) - 1;
    const startCol = rowLetter ? rowLetter.charCodeAt(0) - 65 : -1;
    const startRow = colNumber;

    if (startRow < 0 || startCol < 0 || startRow >= currentBoard.length || startCol >= currentBoard.length) {
        alert('Coordenades invàlides.');
        return;
    }

    const newWordInfo = { word: word, startRow: startRow, startCol: startCol, direction: direction };
    //saveWordsToBoard(currentBoard, [newWordInfo]); // Utilitzem la funció de calcul.js

    // Calcular la puntuació
    // Assegura't que la funció calculateScore estigui disponible. Si està a calcul.js i és un mòdul, has d'importar-la.
    // import { calculateScore } from './calcul.js';
    const score = calculateScore(currentBoard, [newWordInfo], letterValues, multiplierBoard);

    // Mostrar la puntuació a l'usuari (per exemple, en un element amb id="score")
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = `Puntuació: ${score}`;
    } else {
        alert(`Puntuació: ${score}`); // Si no trobem l'element, mostrem un alert
    }

    // Renderitzar el tauler actualitzat
    renderBoard(currentBoard);

    // Netejar el formulari
    wordForm.reset();
});

// Gestionar la selecció de la direcció
const horizontalBtn = document.getElementById('horizontalBtn');
const verticalBtn = document.getElementById('verticalBtn');
const directionInput = document.getElementById('direction');

horizontalBtn.addEventListener('click', () => {
    directionInput.value = 'horizontal';
    horizontalBtn.classList.add('active');
    verticalBtn.classList.remove('active');
});

verticalBtn.addEventListener('click', () => {
    directionInput.value = 'vertical';
    verticalBtn.classList.add('active');
    horizontalBtn.classList.remove('active');
});

// Assegura't que la funció saveWordsToBoard estigui disponible (importada o definida abans)
// Si saveWordsToBoard és a calcul.js i aquest fitxer és un mòdul, hauràs d'importar-la:
// import { saveWordsToBoard } from './calcul.js';

// Si calcul.js no és un mòdul, assegura't que es carrega abans de tauler.js a tauler.html
