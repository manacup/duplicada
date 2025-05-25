import {  
  displayLetter,
  createEmptyBoard,
} from "./utilitats.js";

import {
  letterValues,
  multiplierBoard,
} from "./utilitats.js";


// Funció per renderitzar el tauler a l'HTML
const boardContainer = document.getElementById("board-container");
const wordInput = document.getElementById("word");

function renderBoard(board, newTiles = []) {
  // Si el board no és vàlid, crea un tauler buit per evitar errors
  if (!Array.isArray(board) || !Array.isArray(board[0])) {
    board = Array.from({ length: 15 }, () => Array(15).fill(""));
  }
  // Comprova que totes les files són arrays de mida 15
  for (let i = 0; i < 15; i++) {
    if (!Array.isArray(board[i])) {
      board[i] = Array(15).fill("");
    } else if (board[i].length !== 15) {
      board[i] = Array.from({ length: 15 }, (_, j) => board[i][j] ?? "");
    }
  }
  boardContainer.innerHTML = "";

  const table = document.createElement("table");
  table.classList.add("board-table");

  // Capçalera de columnes
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th"));
  for (let i = 0; i < board.length; i++) {
    const th = document.createElement("th");
    th.textContent = i + 1;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Cos del tauler
  const tbody = document.createElement("tbody");
  for (let i = 0; i < board.length; i++) {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = String.fromCharCode(65 + i);
    row.appendChild(th);

    for (let j = 0; j < board[i].length; j++) {
      const cell = document.createElement("td");
      cell.classList.add("board-cell");
      let display = displayLetter(board[i][j]);
      cell.textContent = display;

      // Multiplicadors visuals
      const mult = multiplierBoard[i][j];
      if (mult === "TW") cell.classList.add("tw");
      else if (mult === "DW") cell.classList.add("dw");
      else if (mult === "TL") cell.classList.add("tl");
      else if (mult === "DL") cell.classList.add("dl");

      // Marca cel·la ocupada
      if (board[i][j] && board[i][j] !== "") {
        cell.classList.add("filled");
      }

      // Marca escarràs
      if (board[i][j] && board[i][j] === board[i][j].toLowerCase()) {
        cell.classList.add("blank-tile");
      }

      // Marca fitxes noves
      if (newTiles.some(([rowIdx, colIdx]) => rowIdx === i && colIdx === j)) {
        cell.classList.add("new");
      }

      // Mostra el valor de la fitxa si la casella està ocupada
      if (board[i][j] && board[i][j] !== "") {
        const valueSpan = document.createElement("span");
        valueSpan.className = "tile-value";
        // Usa letterValues global o importat
        const isScrap = board[i][j] === board[i][j].toLowerCase();
        // Si tens letterValues a utilitats.js, importa'l i usa'l aquí
        valueSpan.textContent = isScrap
          ? "0"
          : typeof letterValues !== "undefined"
          ? letterValues[board[i][j].toUpperCase()] ?? ""
          : window.letterValues?.[board[i][j].toUpperCase()] ?? "";
        cell.appendChild(valueSpan);
      }

      // Obtenim la coordenada seleccionada i la direcció
      const coordinatesInput = document.getElementById("coords");
      const directionInput = document.getElementById("direction");
      let highlightRow = -1,
        highlightCol = -1,
        highlightDir = null;
      if (coordinatesInput && directionInput) {
        const coordValue = coordinatesInput.value.trim().toUpperCase();
        const dirValue = directionInput.value;
        const letter = coordValue.match(/[A-Z]/)?.[0];
        const number = parseInt(coordValue.match(/[0-9]+/)?.[0]);
        if (letter && number) {
          highlightRow = letter.charCodeAt(0) - 65;
          highlightCol = number - 1;
          highlightDir = dirValue;
        }
      }

      // Si la casella coincideix amb la coordenada seleccionada, està buida i hi ha direcció, mostra la fletxa
      if (
        i === highlightRow &&
        j === highlightCol &&
        board[i][j] === "" &&
        highlightDir
      ) {
        cell.innerHTML =
          highlightDir === "horizontal"
            ? '<span class="arrow-indicator" title="Horitzontal"><i class="bi bi-arrow-right-square-fill"></i></span>'
            : '<span class="arrow-indicator" title="Vertical"><i class="bi bi-arrow-down-square-fill"></i></span>';
      }

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
const horizontalBtn = document.getElementById("horizontalBtn");
const verticalBtn = document.getElementById("verticalBtn");
const directionInput = document.getElementById("direction");
const coordinatesInput = document.getElementById("coords");

// Detecta automàticament la direcció segons el format de les coordenades
coordinatesInput.addEventListener("input", () => {
  const value = coordinatesInput.value.trim().toUpperCase();
  // Ex: A1 (horitzontal), 1A (vertical)
  if (/^[A-Z][0-9]+$/.test(value)) {
    // Lletra primer: horitzontal
    directionInput.value = "horizontal";
    horizontalBtn.classList.add("active");
    verticalBtn.classList.remove("active");
  } else if (/^[0-9]+[A-Z]$/.test(value)) {
    // Nombre primer: vertical
    directionInput.value = "vertical";
    verticalBtn.classList.add("active");
    horizontalBtn.classList.remove("active");
  }
});

// Quan es prem un botó de direcció, reformata les coordenades com a player.js
function formatCoordinatesOnDirectionChange() {
  const value = coordinatesInput.value.trim().toUpperCase();
  const letter = value.match(/[A-Z]/);
  const number = value.match(/[0-9]+/);
  if (letter && number) {
    if (directionInput.value === "horizontal") {
      coordinatesInput.value = `${letter[0]}${number[0]}`;
    } else if (directionInput.value === "vertical") {
      coordinatesInput.value = `${number[0]}${letter[0]}`;
    }
  }
}

horizontalBtn.addEventListener("click", () => {
  directionInput.value = "horizontal";
  horizontalBtn.classList.add("active");
  verticalBtn.classList.remove("active");
  formatCoordinatesOnDirectionChange();
  // Actualitza el tauler amb la nova direcció (previsualització)
  coordinatesInput.dispatchEvent(new Event("input"));
  wordInput.dispatchEvent(new Event("input"));
});

verticalBtn.addEventListener("click", () => {
  directionInput.value = "vertical";
  verticalBtn.classList.add("active");
  horizontalBtn.classList.remove("active");
  formatCoordinatesOnDirectionChange();
  // Actualitza el tauler amb la nova direcció (previsualització)
  coordinatesInput.dispatchEvent(new Event("input"));
  wordInput.dispatchEvent(new Event("input"));
});



// Marca la casella seleccionada per coordenades d'entrada
const coordValue = coordinatesInput.value.trim().toUpperCase();
let selectedRow = -1,
  selectedCol = -1;
if (coordValue) {
  const letter = coordValue.match(/[A-Z]/)?.[0];
  const number = parseInt(coordValue.match(/[0-9]+/)?.[0]);
  if (letter && number) {
    if (directionInput.value === "horizontal") {
      selectedRow = letter.charCodeAt(0) - 65;
      selectedCol = number - 1;
    } else if (directionInput.value === "vertical") {
      selectedRow = letter.charCodeAt(0) - 65;
      selectedCol = number - 1;
    }
  }
}

/* // Escolta canvis al tauler a la base de dades i renderitza
gameInfoRef.child('currentBoard').on('value', (snapshot) => {
    const board = snapshot.val();
    if (board) renderBoard(board);
}); */

// Permet clicar sobre una casella del tauler per omplir l'input de coordenades

let lastCoordType = "V"; // Variable global per alternar

boardContainer.addEventListener("click", function (event) {
  const cell = event.target.closest("td.board-cell");
  if (!cell) return;

  const rowElement = cell.parentElement;
  const tbody = rowElement.parentElement;
  const rowIdx = Array.from(tbody.children).indexOf(rowElement);
  const colIdx = Array.from(rowElement.children).indexOf(cell) - 1;

  if (rowIdx >= 0 && colIdx >= 0) {
    const coordH = `${String.fromCharCode(65 + rowIdx)}${colIdx + 1}`;
    const coordV = `${colIdx + 1}${String.fromCharCode(65 + rowIdx)}`;
    const coordsInput = document.getElementById("coords");

    if (lastCoordType === "H") {
      coordsInput.value = coordV;
      lastCoordType = "V";
    } else {
      coordsInput.value = coordH;
      lastCoordType = "H";
    }

    coordsInput.dispatchEvent(new Event("input"));
  }
});

//funció que retorna la fitxa de la casella donat l'index de fila i columna
function getTileAt(row, col,board = currentBoard) {
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return null; // Fora de límits
  }
  //comprova si és una fitxa escarràs iretorna objecte amb la lletra i si és escarràs o no
  const tile = board[row][col];
  if (tile && tile === tile.toLowerCase()) {
    return { letter: tile.toUpperCase(), isScrap: true };
  }else if (tile) {
    return { letter: tile.toUpperCase(), isScrap: false };
  }
  return null; // No hi ha fitxa
}

export { renderBoard, getTileAt, selectedRow, selectedCol, currentBoard };
