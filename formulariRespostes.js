import { gameInfoRef, historyRef } from "./firebase.js";
import {
  displayLetter,
  letterValues,
  normalizeWordInput,
  multiplierBoard,
} from "./utilitats.js";
import { splitWordToTiles, renderBoard } from "./tauler.js";
import { saveWordsToBoard, calculateFullPlayScore } from "./calcul.js";

const wordForm = document.getElementById("wordForm");
const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const directionInput = document.getElementById("direction");
const respostaMessage = document.getElementById("respostaMessage");

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

// Escolta canvis al faristol i ronda actual
gameInfoRef.child("currentRack").on("value", (snap) => {
  currentRack = snap.val() || "";
});
gameInfoRef.child("currentRound").on("value", (snap) => {
  currentRoundId = snap.val();
});

// Validació: comprova que les fitxes noves són al faristol
function validateTiles(word, scraps) {
  const rackTiles = splitWordToTiles(currentRack.toUpperCase());
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
    return;
  }

  const coords = coordsInput.value.trim().toUpperCase();
  const direction = directionInput.value;
  const wordRaw = wordInput.value.trim();
  const word = normalizeWordInput(wordRaw);

  // Detecta escarrassos (minúscules)
  const tiles = splitWordToTiles(wordRaw);
  const scraps = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i].toLowerCase()) scraps.push(i);
  }

  // Validació: comprova que les fitxes noves són al faristol
  if (!validateTiles(word, scraps)) {
    respostaMessage.textContent = "Les fitxes no coincideixen amb el faristol!";
    respostaMessage.className = "alert alert-danger";
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
      return;
    }
  }

  // Calcula la puntuació de la jugada mestra
  const newWordInfo = { word: formattedWord, startRow, startCol, direction };
  const score = calculateFullPlayScore(boardBeforeMasterPlay, newWordInfo, letterValues, multiplierBoard);

  // Desa la jugada mestra a la base de dades (NO reseteja el formulari ni modifica el tauler)
  const resposta = {
    player: "Jugada mestra",
    coordinates: coords,
    direction: direction,
    word: word,
    scraps: scraps,
    score: score,
    timestamp: Date.now(),
  };
  await historyRef.child(`${currentRoundId}/responses`).push(resposta);

  respostaMessage.textContent = "Jugada mestra desada!";
  respostaMessage.className = "alert alert-success";
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

export function previewMasterPlay() {
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
 let scraps = JSON.parse(document.getElementById("scraps").value || "[]");

function generateTileButtons(word) {
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

    btn.addEventListener("click", () => {
      // Actualitza scraps abans de fer res més
      //let scrapsNow = JSON.parse(document.getElementById("scraps").value || "[]");
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
}

function updateRackTilesPreview(word, scraps) {
  const rackTilesDiv = document.getElementById("rackTiles");
  if (!rackTilesDiv) return;

  // Mostra totes les fitxes primer
  Array.from(rackTilesDiv.children).forEach(
    (tile) => (tile.style.visibility = "visible")
  );

  const tiles = splitWordToTiles(word);
  // Crea una còpia de l'estat de les fitxes del rack (no només referència)
  let rackState = Array.from(rackTilesDiv.children).map((tile) => ({
    el: tile,
    letter: tile.dataset.letter?.toUpperCase() || tile.textContent.trim().charAt(0).toUpperCase(),
    isBlank: tile.dataset.value === "0" || tile.classList.contains("scrap"),
    used: false
  }));

  for (let i = 0; i < tiles.length; i++) {
    const isScrap = scraps.includes(i);
    const tileLetter = tiles[i].toUpperCase();

    if (isScrap) {
      // Amaga la primera fitxa escarràs visible i no usada
      const blankTile = rackState.find(
        (t) => t.isBlank && !t.used && t.el.style.visibility !== "hidden"
      );
      if (blankTile) {
        blankTile.el.style.visibility = "hidden";
        blankTile.used = true;
      }
    } else {
      // Amaga la primera fitxa normal visible i no usada que coincideixi amb la lletra
      const normalTile = rackState.find(
        (t) => !t.isBlank && t.letter === tileLetter && !t.used && t.el.style.visibility !== "hidden"
      );
      if (normalTile) {
        normalTile.el.style.visibility = "hidden";
        normalTile.used = true;
      }
    }
  }
}

// Actualitza els botons quan s'escriu la paraula
wordInput.addEventListener("input", () => {
  generateTileButtons(wordInput.value);
  previewMasterPlay();
});

// També actualitza els botons en carregar la pàgina si hi ha valor inicial
if (wordInput.value) {
  generateTileButtons(wordInput.value);
}

export {};
