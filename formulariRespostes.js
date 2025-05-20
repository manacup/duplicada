import { gameInfoRef, historyRef } from "./firebase.js";
import {
    splitWordToTiles,
  displayLetter,
  letterValues,
  normalizeWordInput,
  multiplierBoard,
} from "./utilitats.js";
import { renderBoard } from "./tauler.js";
import { saveWordsToBoard, findAllNewWords, calculateFullPlayScore } from "./calcul.js";
import {updateRackTilesPreview} from "./rackTile.js";

const wordForm = document.getElementById("wordForm");
const playerInput = document.getElementById("player");
const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const directionInput = document.getElementById("direction");
const respostaMessage = document.getElementById("respostaMessage");
let ENABLE_WORD_VALIDATION = document.getElementById("validateWords")?.checked;

let currentRack = "";
let currentRoundId = null;

// Assumeix que tens accés a currentBoard o boardBeforeMasterPlay
let boardBeforeMasterPlay = null;
gameInfoRef.child("currentBoard").on("value", (snapshot) => {
  const board = snapshot.val();
  if (board) {
    boardBeforeMasterPlay = board.map((row) => row.slice());
    renderBoard(boardBeforeMasterPlay);
  }
});
// Escolta els canvis de la ronda actual i actualitza el rackTiles
gameInfoRef.child('currentRound').on('value', (snapshot) => {
    currentRoundId = snapshot.val();
    
    if (!currentRoundId) {
        console.warn('No hi ha cap ronda actual.');
        return;
    }

    historyRef.child(currentRoundId).on('value', (roundSnapshot) => {
        const round = roundSnapshot.val();
        if (round && round.rack) {
            currentRack =round.rack;
        } else {
            console.warn('No hi ha rack disponible per a la ronda actual.');
        }
    });
});
/* // Escolta canvis al faristol i ronda actual
gameInfoRef.child("currentRack").on("value", (snap) => {
  currentRack = snap.val() || "";
});
gameInfoRef.child("currentRound").on("value", (snap) => {
  currentRoundId = snap.val();
}); */

// Updated validateTiles function to validate against the rack from the database
function validateTiles(word, scraps) {
  const rackTiles = splitWordToTiles(currentRack);
  const rackCounts = {};
  rackTiles.forEach((tile) => {
    if (tile !== "?") {
      rackCounts[tile] = (rackCounts[tile] || 0) + 1;
    }
  });
  const rackScraps = rackTiles.filter((tile) => tile === "?").length;

  let usedScraps = 0;
  const tiles = splitWordToTiles(word);

  for (let i = 0; i < tiles.length; i++) {
    const isScrap = scraps.includes(i);
    const letter = tiles[i].toUpperCase();

    if (isScrap) {
      if (usedScraps < rackScraps) {
        usedScraps++;
      } else {
        return false;
      }
    } else {
      if (rackCounts[letter]) {
        rackCounts[letter]--;
      } else if (rackScraps > usedScraps) {
        usedScraps++;
      } else {
        return false;
      }
    }
  }

  return true;
}

// Envia la resposta
wordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  respostaMessage.textContent = "";

  if (!currentRoundId) {
    respostaMessage.textContent = "No hi ha ronda activa!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
    }, 3000);
    return;
  }

  const coords = coordsInput.value.trim().toUpperCase();
  const direction = directionInput.value;
  const wordRaw = wordInput.value.trim();
  const word = normalizeWordInput(wordRaw);

  // Detecta escarrassos (minúscules)
  const tiles = splitWordToTiles(wordRaw);
  const scraps = document.getElementById("scraps").value;
 
  // Validació: comprova que les fitxes noves són al faristol
  if (!validateTiles(word, scraps)) {
    respostaMessage.textContent = "Les fitxes no coincideixen amb el faristol!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
    }, 3000);
    return;
  }

  // Comprova que encaixa amb el tauler (no sobreescriu lletres diferents)
  const rowLetter = coords.match(/[A-Za-z]/)?.[0];
  const colNumber = parseInt(coords.match(/[0-9]+/)?.[0]) - 1;
  const startRow = rowLetter ? rowLetter.toUpperCase().charCodeAt(0) - 65 : -1;
  const startCol = colNumber;
  if (startRow < 0 || startCol < 0) {
    respostaMessage.textContent = "Coordenades invàlides!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
    }, 3000);
    return;
  }
  let formattedWord = "";
  for (let i = 0; i < tiles.length; i++) {
    formattedWord += scraps.includes(i)
      ? tiles[i].toLowerCase()
      : tiles[i].toUpperCase();
  }
  for (let i = 0; i < formattedWord.length; i++) {
    const row = startRow + (direction === "vertical" ? i : 0);
    const col = startCol + (direction === "horizontal" ? i : 0);
    if (
      boardBeforeMasterPlay[row][col] !== "" &&
      boardBeforeMasterPlay[row][col] !== formattedWord[i]
    ) {
      respostaMessage.textContent = `La lletra "${displayLetter(formattedWord[i])}" no coincideix amb la lletra "${displayLetter(boardBeforeMasterPlay[row][col])}" a la posició ${String.fromCharCode(65 + row)}${col + 1}.`;
      respostaMessage.className = "alert alert-danger";
      setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
    }, 3000);
      return;
    }
  }
  // Comprova si el tauler està buit
  const isBoardEmpty = boardBeforeMasterPlay.flat().every((cell) => cell === "");

  const boardSize = boardBeforeMasterPlay.length;
  const center = Math.floor(boardSize / 2);

  if (isBoardEmpty) {
    // Si el tauler està buit, la paraula ha de passar per la casella central
    let passesThroughCenter = false;
    for (let i = 0; i < formattedWord.length; i++) {
      const row = startRow + (directionInput.value === "vertical" ? i : 0);
      const col = startCol + (directionInput.value === "horizontal" ? i : 0);
      if (row === center && col === center) {
        passesThroughCenter = true;
        break;
      }
    }
    if (!passesThroughCenter) {
      
      respostaMessage.textContent = "La primera paraula ha de passar per la casella central!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
    }, 3000);
      return;
    }
  } else {
    // Si el tauler NO està buit, la paraula ha de tocar almenys una fitxa existent
    let touchesExisting = false;
    for (let i = 0; i < formattedWord.length; i++) {
      const row = startRow + (directionInput.value === "vertical" ? i : 0);
      const col = startCol + (directionInput.value === "horizontal" ? i : 0);

      // Comprova les 4 caselles adjacents (amunt, avall, esquerra, dreta)
      const adjacents = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [adjRow, adjCol] of adjacents) {
        if (
          adjRow >= 0 &&
          adjRow < boardSize &&
          adjCol >= 0 &&
          adjCol < boardSize &&
          boardBeforeMasterPlay[adjRow][adjCol] !== ""
        ) {
          touchesExisting = true;
          break;
        }
      }
      // També considera si la casella ja té una lletra (sobreposa)
      if (boardBeforeMasterPlay[row][col] !== "") {
        touchesExisting = true;
      }
      if (touchesExisting) break;
    }
    if (!touchesExisting) {
      
      respostaMessage.textContent = "La paraula ha de tocar almenys una fitxa existent al tauler!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
    }, 3000);
      return;
    }}
    // Just abans de calcular la puntuació i afegir la paraula al tauler:
    const newWordInfo = {
        word: formattedWord,
        startRow: startRow,
        startCol: startCol,
        direction: directionInput.value,
      };
    const allWords = findAllNewWords(boardBeforeMasterPlay, newWordInfo);
    //afegeig una variable global per si s'han de validar o no les paraules
    if (typeof ENABLE_WORD_VALIDATION !== "undefined" && ENABLE_WORD_VALIDATION) {
        // Comprova si totes les paraules formades són vàlides          
    if (!window.validateAllWords(allWords)) {
        
        respostaMessage.textContent = "Alguna de les paraules formades no és vàlida!";
        respostaMessage.className = "alert alert-danger";
        setTimeout(() => {
            respostaMessage.textContent = "";
            respostaMessage.className = "";
        }, 3000);
        return; // No puntua ni afegeix la jugada
    }
    }

  // Calcula la puntuació de la jugada mestra
const score = calculateFullPlayScore(boardBeforeMasterPlay, newWordInfo, letterValues, multiplierBoard);
const player = playerInput.value;
// Desa la jugada mestra a l'apartat de resultats amb key=player
const resposta = {
    coordinates: coords,
    direction: direction,
    word: word,
    scraps: scraps,
    score: score,
    timestamp: Date.now(),
};
await historyRef.child(`${currentRoundId}/results/${player}`).set(resposta);
//mostra missatge durant 5 segons
respostaMessage.textContent = `Jugada desada!`;
respostaMessage.className = "alert alert-success";
setTimeout(() => {
    respostaMessage.textContent = "";
    respostaMessage.className = "";
}, 3000);

//desa a la ronda les noves lletres posades al tauler
//comprova les fitxes que queden visibles del racktile
const newLetters = document.querySelectorAll(".rack-tile[style*='visibility: hidden']");
const newLettersArray = Array.from(newLetters).map((tile) => tile.dataset.letter);
console.log("Noves lletres:", newLettersArray);
await historyRef.child(`${currentRoundId}/results/${player}/usedtiles`).set(newLettersArray);
// Actualitza el faristol a la base de dades
// NO facis wordForm.reset();
});

coordsInput.addEventListener("input", () => {
  const value = coordsInput.value.trim().toUpperCase();
  // Ex: A1 (horitzontal), 1A (vertical)
  if (/^[A-Z][0-9]+$/.test(value)) {
    directionInput.value = "horizontal";
  } else if (/^[0-9]+[A-Z]$/.test(value)) {
    directionInput.value = "vertical";
  }
});

document.getElementById("horizontalBtn")?.addEventListener("click", () => {
  directionInput.value = "horizontal";
  const value = coordsInput.value.trim().toUpperCase();
  const letter = value.match(/[A-Z]/);
  const number = value.match(/[0-9]+/);
  if (letter && number) coordsInput.value = `${letter[0]}${number[0]}`;
});

document.getElementById("verticalBtn")?.addEventListener("click", () => {
  directionInput.value = "vertical";
  const value = coordsInput.value.trim().toUpperCase();
  const letter = value.match(/[A-Z]/);
  const number = value.match(/[0-9]+/);
  if (letter && number) coordsInput.value = `${number[0]}${letter[0]}`;
});


// Guarda la jugada mestra anterior per a la previsualització
function previewMasterPlay() {
  if (!boardBeforeMasterPlay) return;
  const coords = coordsInput.value.trim().toUpperCase();
  const word = wordInput.value.trim();
  const direction = directionInput.value;
  const scraps = JSON.parse(document.getElementById("scraps").value || "[]");
  if (!coords || !word || !direction) {
    renderBoard(boardBeforeMasterPlay);
    document.getElementById("score-master").textContent = "";
    return;
  }
  // Calcula posició inicial
  const rowLetter = coords.match(/[A-Za-z]/)?.[0];
  const colNumber = parseInt(coords.match(/[0-9]+/)?.[0]) - 1;
  const startRow = rowLetter ? rowLetter.toUpperCase().charCodeAt(0) - 65 : -1;
  const startCol = colNumber;
  if (startRow < 0 || startCol < 0) return;

  // Normalitza la paraula i aplica escarrassos
  const tiles = splitWordToTiles(word);
  let formattedWord = "";
  for (let i = 0; i < tiles.length; i++) {
    formattedWord += scraps.includes(i)
      ? tiles[i].toLowerCase()
      : tiles[i].toUpperCase();
  }
  const newWordInfo = { word: formattedWord, startRow, startCol, direction };
  // Còpia del tauler per fer proves
  const testBoard = boardBeforeMasterPlay.map((row) => row.slice());
  saveWordsToBoard(testBoard, [newWordInfo]);

  // Calcula les coordenades de les fitxes noves
  let newTiles = [];
  
  for (let k = 0; k < formattedWord.length; k++) {
    const row = startRow + (direction === "vertical" ? k : 0);
    const col = startCol + (direction === "horizontal" ? k : 0);
    if (boardBeforeMasterPlay[row][col] === "") {
      newTiles.push([row, col]);
      
    }
  }

  renderBoard(testBoard, newTiles);

  // Calcula i mostra la puntuació en temps real
  const score = calculateFullPlayScore(
    boardBeforeMasterPlay,
    newWordInfo,
    letterValues,
    multiplierBoard
  );
  document.getElementById("score-master").textContent = `Puntuació: ${score}`;
}

// Assegura't de cridar previewMasterPlay() a cada canvi:
coordsInput.addEventListener("input", previewMasterPlay);
directionInput.addEventListener("input", previewMasterPlay);
wordInput.addEventListener("input", previewMasterPlay);
document.getElementById("scraps").addEventListener("input", previewMasterPlay);
 // Llegeix l'estat actual dels escarrassos
 
 const scrapsInput = document.getElementById("scraps");
const tileButtonsDiv = document.getElementById("tileButtons");

let currentWordTiles = [];

function generateTileButtons(word) {
  tileButtonsDiv.innerHTML = "";
  currentWordTiles = [];
  const tiles = splitWordToTiles(word);
  for (let i = 0; i < tiles.length; i++) {
    const letter = displayLetter(tiles[i]).toUpperCase();
    const button = document.createElement("button");
    button.classList.add("tile-button");
    button.textContent = displayLetter(tiles[i]);
    button.dataset.index = i;
    button.type = "button";
    // Afegeix la puntuació a la cantonada inferior dreta
    const valueSpan = document.createElement("span");
    valueSpan.className = "tile-value";
    // Si és minúscula (escarràs), mostra 0
    const isScrap = tiles[i] === tiles[i].toLowerCase();
    valueSpan.textContent = isScrap ? "0" : letterValues[letter] ?? "";
    button.appendChild(valueSpan);
    // Afegeix l'esdeveniment de clic per marcar/desmarcar escarràs

    button.addEventListener("click", toggleScrap);
    tileButtonsDiv.appendChild(button);
    currentWordTiles.push({ letter: tiles[i], isScrap: false });
  }
  scrapsInput.value = "";
  const scraps = JSON.parse(scrapsInput.value || "[]");
  updateRackTilesPreview(word, scraps)
}

// Marca/desmarca una lletra com a escarràs
function toggleScrap(event) {
  event.preventDefault();
  const button = event.target;
  const index = parseInt(button.dataset.index);
  currentWordTiles[index].isScrap = !currentWordTiles[index].isScrap;
  button.classList.toggle("scrap");
  // Mostra minúscula si és escarràs, sinó majúscula
  button.textContent = currentWordTiles[index].isScrap
    ? displayLetter(currentWordTiles[index].letter.toLowerCase())
    : displayLetter(currentWordTiles[index].letter.toUpperCase());

  // Actualitza el valor de la fitxa a la cantonada
  let valueSpan = button.querySelector(".tile-value");
  if (!valueSpan) {
    valueSpan = document.createElement("span");
    valueSpan.className = "tile-value";
    button.appendChild(valueSpan);
  }
  if (currentWordTiles[index].isScrap) {
    valueSpan.textContent = "0";
  } else {
    const letter = currentWordTiles[index].letter.toUpperCase();
    valueSpan.textContent = letterValues[letter] ?? "";
  }

  // Actualitza el camp ocult amb els índexs dels escarrassos
  updateScrapsInputValue();

  // Actualitza la vista del rack amb els valors correctes
  const scraps = JSON.parse(scrapsInput.value || "[]");
  updateRackTilesPreview(wordInput.value, scraps);

  // Actualitza la previsualització de la jugada
  previewMasterPlay();
}

// Actualitza el camp ocult amb els índexs dels escarrassos
function updateScrapsInputValue() {
  const scrapIndices = currentWordTiles
    .map((tile, idx) => (tile.isScrap ? idx : null))
    .filter((idx) => idx !== null);
  scrapsInput.value = JSON.stringify(scrapIndices);
}

// Quan s'escriu la paraula, genera els botons (amb dígrafs)
// Sempre converteix a majúscula abans de processar
wordInput.addEventListener("input", () => {
  const word = wordInput.value.toUpperCase();
  wordInput.value = word; // Actualitza el valor de l'input
  generateTileButtons(word);
});
 /////////////////////
/* function generateTileButtons(word) {
  const tileButtonsDiv = document.getElementById("tileButtons");
  if (!tileButtonsDiv) return;
  tileButtonsDiv.innerHTML = "";

  const tiles = splitWordToTiles(word);

 

  for (let i = 0; i < tiles.length; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-secondary btn-sm m-1 tile-btn";
    btn.dataset.index = i;

    // Mostra la lletra i el valor de punts
    const letter = displayLetter(tiles[i]);
    const value = letterValues[tiles[i].toUpperCase()] ?? "";
    btn.innerHTML = `${letter.toUpperCase()}<span class="tile-value">${value}</span>`;

    // Marca visualment si és escarràs
    if (scraps.includes(i)) btn.classList.add("btn-warning");

  
    // Afegeix l'esdeveniment de clic per marcar/desmarcar escarràs

    btn.addEventListener("click", () => {
      // Actualitza scraps abans de fer res més
      let scrapsNow = JSON.parse(document.getElementById("scraps").value || "[]");
      if (scrapsNow.includes(i)) {
        scrapsNow = scrapsNow.filter((idx) => idx !== i);
      } else {
        scrapsNow.push(i);
      }
      document.getElementById("scraps").value = JSON.stringify(scrapsNow);

      // Torna a generar els botons i actualitza el rack visual
      generateTileButtons(wordInput.value);
      previewMasterPlay();
    });

    tileButtonsDiv.appendChild(btn);
  }

  // Un cop generats tots els botons, actualitza el rack visual
  updateRackTilesPreview(word, scraps);
} */






// També actualitza els botons en carregar la pàgina si hi ha valor inicial
if (wordInput.value) {
  generateTileButtons(wordInput.value);
}

// Desa el nom del jugador al localStorage
playerInput.addEventListener("input", () => {
  const playerName = playerInput.value.trim();
  localStorage.setItem("playerName", playerName);
});

// Carrega el nom del jugador del localStorage en carregar la pàgina
window.addEventListener("load", () => {
  const savedPlayerName = localStorage.getItem("playerName");
  if (savedPlayerName) {
    playerInput.value = savedPlayerName;
  }
});

export {};
