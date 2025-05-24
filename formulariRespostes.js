import { gameInfoRef, historyRef ,formEnabled} from "./firebase.js";
import {
  splitWordToTiles,
  displayLetter, createEmptyBoard,
  letterValues,
  normalizeWordInput,
  multiplierBoard,
  displayWord,

} from "./utilitats.js";
import { renderBoard } from "./tauler.js";
import { saveWordsToBoard, findAllNewWords, calculateFullPlayScore } from "./calcul.js";
import { updateRackTilesPreview } from "./rackTile.js";





const wordForm = document.getElementById("wordForm");
const playerInput = document.getElementById("player");
const tableInput = document.getElementById('taula');
const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const directionInput = document.getElementById("direction");
const respostaMessage = document.getElementById("respostaMessage");
let ENABLE_WORD_VALIDATION = document.getElementById("validateWords") ;
console.log("ENABLE_WORD_VALIDATION", ENABLE_WORD_VALIDATION.checked);
let currentRack = "";
let currentRoundId = null;

// Assumeix que tens accés a currentBoard o boardBeforeMasterPlay
let boardBeforeMasterPlay = null;

// Escolta els canvis de la ronda actual i actualitza el rackTiles
gameInfoRef.child('currentRound').on('value', (snapshot) => {
  currentRoundId = snapshot.val();

  if (!currentRoundId) {
    console.warn('No hi ha cap ronda actual.');
    return;
  }

  historyRef.child(currentRoundId).on('value', (roundSnapshot) => {
    console.log(currentRoundId,"roundSnapshot", roundSnapshot.val());
    const round = roundSnapshot.val();
    if (round && round.rack) {
      currentRack = round.rack;
    } else {
      console.warn('No hi ha rack disponible per a la ronda actual.');
    }
  });
});

// Updated validateTiles function to validate against the rack from the database
function validateTiles(newTiles ) {

  const rackTiles = splitWordToTiles(currentRack);
  console.log("rackTiles", rackTiles, currentRack);
  //compara si racktiles conté totes les fitxes de newTiles
  const rackCounts = {};
  rackTiles.forEach((tile) => {
    if (tile !== "?") {
      rackCounts[tile] = (rackCounts[tile] || 0) + 1;
    }
  });
  const rackScraps = rackTiles.filter((tile) => tile === "?").length;
  let usedScraps = 0;
  const tiles = newTiles;
  console.log("newTiles", newTiles);
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i].toUpperCase();
    if (rackCounts[letter]) {
      rackCounts[letter]--;
    } else if (rackScraps > usedScraps) {
      usedScraps++;
    } else {
      return false;
    }
  }
  return true;
}
  
/* function validateTiles(word, scraps) {
  const rackTiles = splitWordToTiles(currentRack);
  console.log(word, scraps, rackTiles,currentRack);
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
} */

async function fillFormDataFromRoundAndPlayer(roundNumber, playerId) {
  respostaMessage.textContent = "";
  const roundRef = historyRef.child(roundNumber);

  try {
    const snapshot = await roundRef.once('value');
    const roundData = snapshot.val();

    if (!roundData) {
      console.warn(`No es troba la ronda amb número: ${roundNumber}`);
      respostaMessage.textContent = `No es troba la ronda ${roundNumber}!`;
      respostaMessage.className = "alert alert-danger";
      setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
      }, 5000);
      return;
    }
    if (!roundData.board) {
      boardBeforeMasterPlay = createEmptyBoard(15);
    } else {
      boardBeforeMasterPlay = roundData.board.map((row) => row.slice())
    }

    const playerResult = roundData.results?.[playerId];

    if (!playerResult) {
      console.warn(`No es troben dades de joc per al jugador ${playerId} a la ronda ${roundNumber}.`);
      // Actualitza el missatge d'error durant 5 segons     
      
      respostaMessage.textContent = `No hi ha dades per al jugador ${playerId} a la ronda ${roundNumber}!`;
      respostaMessage.className = "alert alert-warning";
      setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
      }, 5000);
      // Optionally clear form fields if no data found
      coordsInput.value = "";
      wordInput.value = "";
      directionInput.value = "";
      document.getElementById("scraps").value = "";
      generateTileButtons("");
      updateRackTilesPreview("", []);
      return;
    }
// Suggested code may be subject to a license. Learn more: ~LicenseLog:3200668774.
console.log("resultats del jugador actual",playerResult)
    // Omple els camps del formulari
    coordsInput.value = playerResult.coordinates || "";
    wordInput.value = displayWord(playerResult.word, playerResult.scraps) || "";    
    directionInput.value = playerResult.direction || "";
    const scraps = JSON.parse(playerResult.scraps || "[]");
    document.getElementById("scraps").disabled = false
 document.getElementById("scraps").value = playerResult.scraps //|| "[]";
console.log(document.getElementById("scraps"),JSON.stringify(scraps))
    // Actualitza els botons de les fitxes i la vista del rack
    generateTileButtons(playerResult.word || "");
    // Re-apply the scrap visual state based on the loaded scraps
    const tileButtons = tileButtonsDiv.querySelectorAll('.tile-button');
    tileButtons.forEach(button => {
      const index = parseInt(button.dataset.index);
      if (scraps.includes(index)) {

        button.classList.add("scrap");
        // Update letter case and value for scraps
        const letter = currentWordTiles[index].letter.toLowerCase();
        button.textContent = displayLetter(letter);
        let valueSpan = button.querySelector(".tile-value");
        if (!valueSpan) {
          valueSpan = document.createElement("span");
          valueSpan.className = "tile-value";
          button.appendChild(valueSpan);
        }
        valueSpan.textContent = "0";

      } else {
        button.classList.remove("scrap");
        const letter = currentWordTiles[index].letter.toUpperCase();
        button.textContent = displayLetter(letter);
        let valueSpan = button.querySelector(".tile-value");
        if (!valueSpan) {
          valueSpan = document.createElement("span");
          valueSpan.className = "tile-value";
          button.appendChild(valueSpan);
        }
        valueSpan.textContent = letterValues[letter] ?? "";
      }
      currentWordTiles[index].isScrap = scraps.includes(index);
    });


    updateRackTilesPreview(playerResult.word || "", scraps);

    // Actualitza la previsualització del tauler i la puntuació si hi ha dades
    if (playerResult.coordinates && playerResult.word && playerResult.direction && boardBeforeMasterPlay) {
      previewMasterPlay();
    } else {
      renderBoard(boardBeforeMasterPlay);
      document.getElementById("score-master").textContent = "";
    }


  } catch (error) {
    console.error("Error omplint el formulari de resposta:", error);
    respostaMessage.textContent = "Error carregant les dades de la jugada!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
      }, 5000);
  }
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
  let usedTiles = []
  for (let i = 0; i < formattedWord.length; i++) {
    const row = startRow + (direction === "vertical" ? i : 0);
    const col = startCol + (direction === "horizontal" ? i : 0);
    if (
      boardBeforeMasterPlay[row][col] == ""
    ) {
      const letter = formattedWord[i];
      const isScrap = letter === letter.toLowerCase();
      if (isScrap) {
        // Aquesta lletra era un escarràs del faristol
        usedTiles.push('?');
        // Aquí pots fer alguna cosa més amb els escarrassos si cal
      } else {
        // Aquesta lletra no era un escarràs (era una lletra normal del faristol o una lletra sobre el tauler)
        // Si era una lletra del faristol (i la casella estava buida), també l'hauries d'afegir a usedTiles
        usedTiles.push(letter); // Probablement vols afegir totes les lletres noves a usedTiles
      }
    }
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
   // Validació: comprova que les fitxes noves són al faristol
   const usedTilesWord = usedTiles;
  if (!validateTiles(usedTilesWord, scraps)) {
    respostaMessage.textContent = "Les fitxes no coincideixen amb el faristol!";
    respostaMessage.className = "alert alert-danger";
    setTimeout(() => {
      respostaMessage.textContent = "";
      respostaMessage.className = "";
    }, 3000);
    return;
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
    }
  }
  // Just abans de calcular la puntuació i afegir la paraula al tauler:
  const newWordInfo = {
    word: formattedWord,
    startRow: startRow,
    startCol: startCol,
    direction: directionInput.value,
  };
  const allWords = findAllNewWords(boardBeforeMasterPlay, newWordInfo);
  const jugadaValida = window.validateAllWords(allWords)
  //afegeig una variable global per si s'han de validar o no les paraules
  if (typeof ENABLE_WORD_VALIDATION !== "undefined" && ENABLE_WORD_VALIDATION.checked) {
    // Comprova si totes les paraules formades són vàlides          
    if (!jugadaValida) {

      respostaMessage.textContent = "Alguna de les paraules formades no és vàlida!";
      respostaMessage.className = "alert alert-danger";
      setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
      }, 3000);
      return; // No puntua ni afegeix la jugada
    }
  }
  //await historyRef.child(`${currentRoundId}/results/${player}/newWordInfo`).set(newWordInfo)
  // Calcula la puntuació de la jugada mestra
  const score = jugadaValida? calculateFullPlayScore(boardBeforeMasterPlay, newWordInfo, letterValues, multiplierBoard):0;
  const player = playerInput.value;
  // Desa la jugada a l'apartat de resultats amb key=player
  const resposta = {
    coordinates: coords,
    direction: direction,
    word: formattedWord,
    scraps: scraps,
    score: score,
    timestamp: Date.now(),
    usedtiles: usedTiles,
  };
  await historyRef.child(`${currentRoundId}/results/${player}`).set(resposta);
  //mostra missatge durant 5 segons
  respostaMessage.textContent = `Jugada desada!`;
  respostaMessage.className = "alert alert-success";
  setTimeout(() => {
    respostaMessage.textContent = "";
    respostaMessage.className = "";
  }, 3000);

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

   const allWords = findAllNewWords(boardBeforeMasterPlay, newWordInfo);
  const jugadaValida = window.validateAllWords(allWords)

  // Calcula i mostra la puntuació en temps real
  const score = jugadaValida? calculateFullPlayScore(
    boardBeforeMasterPlay,
    newWordInfo,
    letterValues,
    multiplierBoard
  ):0;
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
  const scraps =[]
  
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
    if (isScrap) {
      scraps.push(i)
    }
    valueSpan.textContent = isScrap ? "0" : letterValues[letter] ?? "";
    button.appendChild(valueSpan);
    // Afegeix l'esdeveniment de clic per marcar/desmarcar escarràs

    button.addEventListener("click", toggleScrap);
    tileButtonsDiv.appendChild(button);
    currentWordTiles.push({ letter: tiles[i], isScrap: false });
  }
  scrapsInput.value = JSON.stringify(scraps);
   //JSON.parse(scrapsInput.value || "[]");
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
  //wordInput.value = word; // Actualitza el valor de l'input
  generateTileButtons(word);
  previewMasterPlay(); // Call preview after generating buttons
});

// També actualitza els botons en carregar la pàgina si hi ha valor inicial
if (wordInput.value) {
  generateTileButtons(wordInput.value);
}

// Desa el nom del jugador al localStorage
playerInput.addEventListener("input", () => {
  const playerName = playerInput.value.trim();
  localStorage.setItem("nomJugador", playerName);
});
// Desa el taula del jugador al localStorage
tableInput.addEventListener("input", () => {
  const table = tableInput.value.trim();
  localStorage.setItem('playerTable', table);
  
});
//
// Carrega el nom del jugador del localStorage en carregar la pàgina
window.addEventListener("load", () => {
  const savedPlayerName = localStorage.getItem("nomJugador");
  if (savedPlayerName) {
    playerInput.value = savedPlayerName;
  }
});

// Carrega el taula del jugador del localStorage en carregar la pàgina
window.addEventListener("load", () => {
  const savedTable = localStorage.getItem("playerTable");
  if (savedTable) {
    tableInput.value = savedTable;
  }
});

//escolta el db.formEnabled i desabilita el formulari si és false i la taula no és "administrador"

formEnabled.on('value', (snapshot) => {
  const enabled = snapshot.val();
  const table = tableInput.value.trim();
  const isAdmin = table.toLowerCase() === "administrador";
  wordForm.querySelectorAll("input, button, select, textarea").forEach(el => {
    el.disabled = !enabled && !isAdmin;
  });
  // Opcional: mostra un missatge si està deshabilitat
  if (!enabled && !isAdmin) {
    respostaMessage.textContent = "El formulari està deshabilitat per l'administrador.";
    respostaMessage.className = "alert alert-warning";
    setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
      }, 5000);
  } else {
    respostaMessage.textContent = "";
    respostaMessage.className = "";
    
  }
});

// Si l'usuari canvia la taula, torna a aplicar la lògica
tableInput.addEventListener("input", () => {
  formEnabled.once('value').then(snapshot => {
    const enabled = snapshot.val();
    const table = tableInput.value.trim();
    const isAdmin = table.toLowerCase() === "administrador";
    wordForm.querySelectorAll("input, button, select, textarea").forEach(el => {
      el.disabled = !enabled && !isAdmin;
    });
    if (!enabled && !isAdmin) {
      respostaMessage.textContent = "El formulari està deshabilitat per l'administrador.";
      respostaMessage.className = "alert alert-warning";
      setTimeout(() => {
        respostaMessage.textContent = "";
        respostaMessage.className = "";
      }, 5000);
    } else {
      respostaMessage.textContent = "";
      respostaMessage.className = "";
    }
  });
});

export { fillFormDataFromRoundAndPlayer };
