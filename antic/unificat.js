import { gameInfoRef, historyRef, jugadors, clockRef, db, formEnabled } from "./firebase.js";

import {
  splitWordToTiles,
  normalizeWordInput,
  displayLetter,
  createEmptyBoard,
  displayWord,
  letterValues,
  multiplierBoard,
  tileDistribution,
} from "./utilitats.js";




import { saveWordsToBoard, findWordInfo } from "./calcul.js";

////////////////////// CONSTANTS & STATE //////////////////////
const MODALITAT = "duplicada";
const MSG = {
  roundOpen:
    "Ja hi ha una ronda oberta. Tanca-la abans d'obrir-ne una de nova.",
  confirmUpdateRack:
    "Esteu segur que voleu actualitzar el faristol? Tots els resultats de la ronda actual s'esborraran.",
  confirmDeleteRound: "Esteu segur que voleu esborrar la ronda actual?",
  confirmNewRound: "Esteu segur que voleu obrir una nova ronda?",
  noMasterPlay: "No hi ha cap jugada mestra per tancar la ronda actual.",
  noCurrentRound: "No hi ha cap ronda actual per tancar.",
  invalidCoords: "Coordenades invàlides!",
  notMatchingRack: "Les fitxes no coincideixen amb el faristol!",
  mustTouchCenter: "La primera paraula ha de passar per la casella central!",
  mustTouchExisting:
    "La paraula ha de tocar almenys una fitxa existent al tauler!",
  invalidWord: "Alguna de les paraules formades no és vàlida!",
  playSaved: "Jugada desada!",
  roundDeleted: "Ronda esborrada correctament.",
};

let state = {
  actualPlayer: "Jugada mestra",
  roundsList: [],
  currentRoundIndex: -1,
  currentRack: "",
  currentRoundId: null,
  boardBeforeMasterPlay: null,
  isAdmin: false,
};

////////////////////// INIT //////////////////////

document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  loadRoundsHistory();
  enableRackTileInput();
  ompleModalWithLetters();
  setupFormListeners();
  setupRoundNavListeners();
  setupRoundActionListeners();
  restoreSessionInputs();
});

////////////////////// LOGIN //////////////////////
function initLogin() {
  const loginForm = document.getElementById("loginForm");
  const loginSection = document.getElementById("login-section");
  const mainContent = document.getElementById("main-content");
  const storedName = localStorage.getItem("nomJugador");
  const storedTable = localStorage.getItem("playerTable");
  if (storedName && storedTable) {
    if (loginSection) loginSection.classList.add("d-none");
    if (mainContent) mainContent.classList.remove("d-none");
    const playerInput = document.getElementById("loginName");
    if (playerInput) playerInput.value = storedName;
    const tableInput = document.getElementById("loginTable");
    if (tableInput) tableInput.value = storedTable;
    if (storedTable.toLowerCase() !== "administrador") {
      document
        .querySelectorAll(".master")
        .forEach((el) => el.classList.add("d-none"));
      state.isAdmin = false;
    } else {
      state.isAdmin = true;
    }
    return;
  }
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.getElementById("loginName").value.trim();
      const table = document.getElementById("loginTable").value.trim();
      const email = document.getElementById("email").value.trim();
      if (!name || !table) return;
      localStorage.setItem("nomJugador", name);
      localStorage.setItem("playerTable", table);
      jugadors
        .child(`${table}-${name}`)
        .set({ name, email, table, timestamp: Date.now() });
      if (loginSection) loginSection.classList.add("d-none");
      if (mainContent) mainContent.classList.remove("d-none");
      if (table.toLowerCase() !== "administrador") {
        document
          .querySelectorAll(".master")
          .forEach((el) => el.classList.add("d-none"));
        state.isAdmin = false;
      } else {
        state.isAdmin = true;
      }
    });
  }
}

// Assegura que boardContainer està inicialitzat abans de qualsevol ús
const boardContainer = document.getElementById("board-container");

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

      // Afegim listener per seleccionar coordenades i mostrar la fletxa
      cell.addEventListener("click", function () {
        const selectedCoord = String.fromCharCode(65 + i) + (j + 1);
        // Always update coordsInput and dispatch event
        coordsInput.value = selectedCoord;
        coordsInput.dispatchEvent(new Event("input"));

        // Toggle direction if same cell, else set default
        if (
          coordsInput.value.toUpperCase() === selectedCoord &&
          directionInput.value
        ) {
          directionInput.value =
            directionInput.value === "horizontal" ? "vertical" : "horizontal";
        } else if (!directionInput.value) {
          directionInput.value = "horizontal";
        }
        directionInput.dispatchEvent(new Event("input"));

        // Update direction button highlighting
        const horizontalBtn = document.getElementById("horizontalBtn");
        const verticalBtn = document.getElementById("verticalBtn");
        if (horizontalBtn && verticalBtn) {
          if (directionInput.value === "horizontal") {
            horizontalBtn.classList.add("active");
            verticalBtn.classList.remove("active");
          } else {
            verticalBtn.classList.add("active");
            horizontalBtn.classList.remove("active");
          }
        }

        renderBoard(board, newTiles);
        if (typeof previewMasterPlay === "function") previewMasterPlay();
      });

      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  boardContainer.appendChild(table);
}


////////////gestio de rondes
const modalitat = "duplicada";

// Elements UI
const novaRondaBtn = document.getElementById("novaRondaBtn");
const tancaRondaBtn = document.getElementById("tancaRondaBtn");
const obreRondaBtn = document.getElementById("obreRondaBtn");
const deleteRondaBtn = document.getElementById("deleteRondaBtn");
const rondaDisplay = document.getElementById("roundDisplay");
const randomRackBtn = document.getElementById("randomRackBtn");
const editRackInput = document.getElementById("editRackInput");
const updateRackBtn = document.getElementById("updateRackBtn");
const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const playerInput = document.getElementById("player");
const fitxesRestants = document.getElementById("fitxesRestants");

// Assegura que directionInput està inicialitzat abans d'afegir listeners
const directionInput = document.getElementById("direction");

let actualPlayer = "Jugada mestra";

// Estat local
let roundsList = [];
let currentRoundIndex = -1;

// Carrega l'historial de rondes
function loadRoundsHistory() {
  historyRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};
    roundsList = Object.keys(data).sort((a, b) => Number(a) - Number(b));
    if (roundsList.length === 0) {
      addNewRound();
    } else {
      currentRoundIndex = roundsList.length - 1;
      showRound(currentRoundIndex);
    }
  });
}

// Mostra una ronda específica
function showRound(idx) {
  if (idx < 0 || idx >= roundsList.length) return;
  currentRoundIndex = idx;
  const roundId = roundsList[idx];
  historyRef.child(roundId).on("value", (snapshot) => {
    const round = snapshot.val();
    actualPlayer = playerInput ? playerInput.value : "Jugada mestra";

    //updateUIForCurrentRound(roundId, idx === roundsList.length - 1); ///desmarcar en funcionar
    console.log(roundId, idx === roundsList.length - 1);
    if (rondaDisplay) rondaDisplay.textContent = `Ronda ${roundId}`;
    if (editRackInput) editRackInput.value = displayWord(round?.rack || ""); // Use displayWord to format the rack
    //mostra la jugada mestra als inputs de la seccio de jugada mestra tenint en compte que el jugador actual es el que ha de fer la jugada mestra
    renderRackTiles(round?.rack || "");
    if (round?.board) {
      renderBoard(round.board);
    }
    console.log("actualPlayer", actualPlayer);
    fillFormDataFromRoundAndPlayer(roundId, actualPlayer);
    updateSac();
    updateRemainingTiles();
    showResultats(roundId);
    displayRanking(roundId);
    updateUIForCurrentRound(round, idx === roundsList.length - 1); // Passa si és l'última ronda
  });
}
//actualitza informació de fitxes restants
function updateRemainingTiles() {
  const remainingTiles = calculateRemainingTiles();
  const remainingTilesCount = Object.values(remainingTiles).reduce(
    (acc, count) => acc + count,
    0
  );
  const remainingTilesText = Object.entries(remainingTiles)
    .map(([tile, count]) => `${displayLetter(tile)}: ${count}`)
    .join(", ");
  if (fitxesRestants) {
    fitxesRestants.textContent = `${remainingTilesCount} Fitxes restants: ${remainingTilesText}`;
  }
}
//actualitza el sac de fitxes
function updateSac() {
  const remainingTiles = calculateRemainingTiles();

  const tiles = Object.entries(remainingTiles).flatMap(([tile, count]) =>
    Array(count).fill(tile)
  );
  const sacString = tiles.join("");
  console.log("Sac de fitxes:", sacString);
  renderSacTiles(sacString);
}

// Navegació entre rondes
const prevRoundBtn = document.getElementById("prevRoundBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");
if (prevRoundBtn) {
  prevRoundBtn.addEventListener("click", () => {
    if (currentRoundIndex > 0) showRound(currentRoundIndex - 1);
  });
}
if (nextRoundBtn) {
  nextRoundBtn.addEventListener("click", () => {
    if (currentRoundIndex < roundsList.length - 1)
      showRound(currentRoundIndex + 1);
  });
}

// Afegir una nova ronda
function addNewRound() {
  // Comprova si ja hi ha una ronda oberta
  historyRef.once("value", async (snapshot) => {
    const data = snapshot.val() || {};
    const openRounds = Object.keys(data).filter((key) => !data[key].closed);
    if (openRounds.length > 0) {
      alert(
        "Ja hi ha una ronda oberta. Tanca-la abans d'obrir-ne una de nova."
      );
      return;
    }
    //trobar les dades de la darrera ronda tancada per copiar el tauler a la nova ronda
    const lastClosedRoundId = roundsList.findLast(
      (roundId) => data[roundId].closed
    );
    let boardToCopy = createEmptyBoard(15); // Tauler buit per defecte
    if (lastClosedRoundId && data[lastClosedRoundId]?.board) {
      boardToCopy = data[lastClosedRoundId].board;
    }

    // Genera un nou ID de ronda
    const newRoundId =
      roundsList.length > 0
        ? String(Number(roundsList[roundsList.length - 1]) + 1)
        : "1";

    const lastWord = data[lastClosedRoundId]?.results[actualPlayer].word || "";
    const lastCoordinates =
      data[lastClosedRoundId]?.results[actualPlayer].coordinates || "";
    const lastDirection =
      data[lastClosedRoundId]?.results[actualPlayer].direction || "";
    const lastWordInfo = findWordInfo(lastWord, lastCoordinates, lastDirection);
    if (data[lastClosedRoundId]) saveWordsToBoard(boardToCopy, [lastWordInfo]);
    const lastRack = data[lastClosedRoundId]?.rack.split("") || []; // Converteix a array
    const playerdup =
      modalitat === "duplicada" ? "Jugada mestra" : actualPlayer;
    const lastUsedTiles =
      data[lastClosedRoundId]?.results[playerdup].usedtiles || []; // Fitxes usades

    const remainingTilesArray = [...lastRack]; // Copia el rack anterior
    // Resta les fitxes usades del rack anterior
    lastUsedTiles.forEach((usedTile) => {
      const index = remainingTilesArray.indexOf(usedTile);
      if (index > -1) {
        remainingTilesArray.splice(index, 1); // Elimina una instància de la fitxa usada
      }
    });
    const remainingTiles = remainingTilesArray.join("");
    const newRound = {
      rack: remainingTiles, // o cridar a openNewRoundWithRandomTiles() si voleu generar el rack aquí
      board: boardToCopy,
      closed: false,
      results: {
        [actualPlayer]: {
          word: "",
          coordinates: "",
          direction: "",
          score: 0,
          usedtiles: [],
        },
      },
    };
    gameInfoRef.child("currentRound").set(newRoundId);
    //gameInfoRef.child('currentRack').set(remainingTiles)
    historyRef
      .child(newRoundId)
      .set(newRound)
      .then(() => {
        roundsList.push(newRoundId);
        showRound(roundsList.length - 1);
        // Actualitza la interfície
        //if (rondaDisplay) rondaDisplay.textContent = `Ronda ${newRoundId}`;

        //updateUIForClosedRound(newRoundId)
        //console.log(`Nova ronda afegida: ${newRoundId}`);
      });
  });
}

// Funció per calcular les fitxes restants al sac
function calculateRemainingTiles() {
  const usedTiles = {};

  // Recorre totes les rondes tancades i suma les fitxes usades
  roundsList.forEach((roundId) => {
    historyRef.child(roundId).once("value", (snapshot) => {
      const round = snapshot.val();
      if (round && round.closed && round.results) {
        const resultats = round.results; //Object.values(round.results)
        if (modalitat === "duplicada") {
          console.log("TONI: calcul de fitxers restants", resultats);
          if (resultats["Jugada mestra"].usedtiles) {
            resultats["Jugada mestra"].usedtiles.forEach((tile) => {
              usedTiles[tile] = (usedTiles[tile] || 0) + 1;
            });
          }
        } else {
          resultats.forEach((result) => {
            if (result.usedtiles) {
              result.usedtiles.forEach((tile) => {
                usedTiles[tile] = (usedTiles[tile] || 0) + 1;
              });
            }
          });
        }
      }
    });
  });
  //s'han de tenir en compte les fitxes que hi ha al faristol actual
  const currentRack = editRackInput.value.split("");
  currentRack.forEach((tile) => {
    usedTiles[tile] = (usedTiles[tile] || 0) + 1;
  });
  //console.log(usedTiles)

  // Calcula les fitxes restants basant-se en la distribució inicial
  const remainingTiles = { ...tileDistribution };
  Object.entries(usedTiles).forEach(([tile, count]) => {
    if (remainingTiles[tile] !== undefined) {
      remainingTiles[tile] = Math.max(0, remainingTiles[tile] - count);
    }
  });
  console.log("Fitxes usades:", usedTiles);
  console.log("Fitxes restants:", remainingTiles);

  return remainingTiles;
}

// Funció per seleccionar fitxes aleatòriament del sac
function selectRandomTiles(count) {
  const remainingTiles = calculateRemainingTiles();
  const tilePool = [];

  // Crea un array amb totes les fitxes restants
  Object.entries(remainingTiles).forEach(([tile, quantity]) => {
    for (let i = 0; i < quantity; i++) {
      tilePool.push(tile);
    }
  });

  // Selecciona fitxes aleatòriament
  const selectedTiles = [];
  for (let i = 0; i < count; i++) {
    if (tilePool.length === 0) break;
    const randomIndex = Math.floor(Math.random() * tilePool.length);
    selectedTiles.push(tilePool.splice(randomIndex, 1)[0]);
  }

  return selectedTiles;
}
randomRackBtn.addEventListener("click", () => {
  //compta quantes fitxes hi ha al editRackInput
  const remainingRack = normalizeWordInput(editRackInput.value).split("");
  //console.log(remainingRack)
  const currentRackLength = remainingRack.length;

  const newTiles = selectRandomTiles(7 - currentRackLength);
  const selectedTiles = [...remainingRack, ...newTiles];
  //console.log(newTiles);

  //console.log(selectedTiles)
  // Selecciona 7 fitxes
  editRackInput.value = displayWord(selectedTiles.join("")); // Mostra les fitxes seleccionades
});
// Exemple d'ús: Seleccionar fitxes quan s'obre una nova ronda
function openNewRoundWithRandomTiles() {
  const newRack = selectRandomTiles(7).join(""); // Selecciona 7 fitxes
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    historyRef
      .child(`${roundId}/rack`)
      .set(newRack)
      .then(() => {
        //console.log(`Faristol inicial assignat per la ronda ${roundId}: ${newRack}`);
      });
  } else {
    console.error(
      "No hi ha cap ronda actual per assignar el faristol inicial."
    );
  }
}

// Carrega l'historial de rondes al carregar la pàgina
document.addEventListener("DOMContentLoaded", loadRoundsHistory);

// Actualitza el faristol manualment i desa a la base de dades
// Normalize the rack before saving to the database
if (updateRackBtn) {
  updateRackBtn.addEventListener("click", () => {
    //demana confirmació indicant que s'esborraran els resultats de la ronda actual
    if (
      !confirm(
        "Esteu segur que voleu actualitzar el faristol? Tots els resultats de la ronda actual s'esborraran."
      )
    ) {
      return;
    }

    const newRack = normalizeWordInput(
      editRackInput.value.trim().toUpperCase()
    ); // Normalize the rack using normalizeWordInput
    if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
      const roundId = roundsList[currentRoundIndex];
      historyRef
        .child(`${roundId}/rack`)
        .set(newRack)
        .then(() => {
          //console.log(`Faristol actualitzat per la ronda ${roundId}`);
        });
      //eliminar resultats de la ronda actual
      historyRef
        .child(`${roundId}/results`)
        .remove()
        .then(() => {
          //console.log(`Resultats eliminats per la ronda ${roundId}`);
        });
      //genera Jugador mestre en blanc
      const masterPlay = {
        word: "",
        coordinates: "",
        direction: "",
        score: 0,
      };
      historyRef
        .child(`${roundId}/results/${actualPlayer}`)
        .set(masterPlay)
        .then(() => {
          //console.log(`Jugada mestra generada per la ronda ${roundId}`);
        });
    } else {
      console.error("No hi ha cap ronda actual per actualitzar el faristol.");
    }
  });
}

// Funció per tancar la ronda actual

function closeCurrentRound() {
  //afegeix validació
  if (wordInput.value == "" && coordsInput.value == "") {
    alert("No hi ha cap jugada mestra per tancar la ronda actual.");
    return;
  }
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    gameInfoRef.child("currentRound").set("");
    historyRef
      .child(`${roundId}/closed`)
      .set(true)
      .then(() => {});
  } else {
    alert("No hi ha cap ronda actual per tancar.");
  }
}
if (tancaRondaBtn) {
  tancaRondaBtn.addEventListener("click", () => {
    closeCurrentRound();
  });
}
function openCurrentRound() {
  //afegeix validació
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    gameInfoRef.child("currentRound").set(roundId);
    historyRef
      .child(`${roundId}/closed`)
      .set(false)
      .then(() => {});
  } else {
    alert("No hi ha cap ronda actual per tancar.");
  }
}
if (obreRondaBtn) {
  obreRondaBtn.addEventListener("click", () => {
    openCurrentRound();
  });
}

// Funció per actualitzar la UI basant-se en la ronda actual i si és l'última
function updateUIForCurrentRound(round, isLastRound) {
  const mainContent = document.getElementById("main-content");
  const buttons = mainContent.querySelectorAll("button");
  //console.log(buttons)

  const inputs = mainContent.querySelectorAll("input");

  if (round.closed) {
    // Si la ronda està tancada
    if (tancaRondaBtn) tancaRondaBtn.style.display = "none";

    if (novaRondaBtn)
      novaRondaBtn.style.display = isLastRound ? "block" : "none"; // Mostra Nova Ronda només si és l'última ronda
    if (obreRondaBtn)
      obreRondaBtn.style.display = isLastRound ? "block" : "none";
    if (deleteRondaBtn)
      deleteRondaBtn.style.display = isLastRound ? "block" : "none";
    // Desactiva tots els botons excepte els de navegació i (si escau) nova ronda
    const excludedButtonIds = [
      "prevRoundBtn",
      "nextRoundBtn",
      "startBtn",
      "stopBtn",
      "resetBtn",
    ];
    if (isLastRound)
      excludedButtonIds.push("novaRondaBtn", "obreRondaBtn", "deleteRondaBtn");
    buttons.forEach((button) => {
      console.log(button.id);
      if (!excludedButtonIds.includes(button.id)) {
        button.disabled = true;
      }
    });
    inputs.forEach((input) => {
      input.disabled = true;
    });
  } else {
    // Si la ronda està oberta
    if (tancaRondaBtn) tancaRondaBtn.style.display = "block";
    if (novaRondaBtn) novaRondaBtn.style.display = "none";
    if (obreRondaBtn) obreRondaBtn.style.display = "none";
    if (deleteRondaBtn) deleteRondaBtn.style.display = "none";

    // Activa tots els botons i inputs (excepte els de navegació que sempre estan actius si cal)
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = false;
    });
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      input.disabled = false;
    });
  }
}
if (deleteRondaBtn)
  deleteRondaBtn.addEventListener("click", () => {
    if (confirm("Esteu segur que voleu esborrar la ronda actual?")) {
      const roundId = roundsList[currentRoundIndex];
      historyRef
        .child(roundId)
        .remove()
        .then(() => {
          alert("Ronda esborrada correctament.");
          loadRoundsHistory(); // Torna a carregar l'historial de rondes
        })
        .catch((error) => {
          console.error("Error al esborrar la ronda:", error);
        });
    }
  });
// Afegir esdeveniments als botons
if (novaRondaBtn) {
  novaRondaBtn.addEventListener("click", () => {
    if (confirm("Esteu segur que voleu obrir una nova ronda?")) {
      addNewRound();
    }
  });
}

//////////racktile.js
const rackTilesDiv = document.getElementById("rackTiles");
const sacTilesDiv = document.getElementById("sacTiles");

function renderRackTiles(rackString) {
  rackTilesDiv.innerHTML = "";
  const tiles = splitWordToTiles(rackString.toUpperCase());
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i];
    const div = document.createElement("div");
    div.className = "rack-tile" + (letter === "?" ? " scrap" : "");
    div.textContent = displayLetter(letter);
    // Afegeix les dades per al modal
    // Si la lletra és '?', afegeix els atributs per al modal
    // Assegura't que el modal té l'ID "lettersModal"
    // i que Bootstrap està carregat correctament

    if (letter === "?") {
      //console.log("es una fitxa escarràs", div);
      div.dataset.bsToggle = "modal";
      div.dataset.bsTarget = "#lettersModal"; // Assegura't que el modal té aquest ID
    }

    // Afegeix dataset-letter i dataset-value
    div.dataset.letter = letter;
    div.dataset.value =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";

    const valueSpan = document.createElement("span");
    valueSpan.className = "tile-value";
    valueSpan.textContent =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";
    div.appendChild(valueSpan);
    rackTilesDiv.appendChild(div);
  }
}

// Mostra el sac de fitxes
function renderSacTiles(sacString) {
  sacTilesDiv.innerHTML = "";
  const tiles = splitWordToTiles(sacString.toUpperCase());
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i];
    const div = renderTile(letter, true);
    sacTilesDiv.appendChild(div);
  }
}
function renderTile(letter, valor = true) {
  // Crea un element div per la fitxa
  const div = document.createElement("div");
  div.className = "rack-tile" + (letter === "?" ? " scrap" : "");
  div.textContent = displayLetter(letter);

  // Afegeix dataset-letter i dataset-value
  if (valor) {
    div.dataset.letter = letter;
    div.dataset.value =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";

    const valueSpan = document.createElement("span");
    valueSpan.className = "tile-value";
    valueSpan.textContent =
      letter === "?" ? "0" : letterValues[letter.toUpperCase()] ?? "";
    div.appendChild(valueSpan);
  }
  return div;
}

// Actualitza la vista prèvia del rack
function updateRackTilesPreview(word, scraps) {
  const rackTilesDiv = document.getElementById("rackTiles");
  if (!rackTilesDiv) return;

  // Mostra totes les fitxes primer
  Array.from(rackTilesDiv.children).forEach((tile) =>
    tile.classList.remove("seleccionada")
  );

  const tiles = splitWordToTiles(word);
  // Crea una còpia de l'estat de les fitxes del rack (no només referència)
  let rackState = Array.from(rackTilesDiv.children).map((tile) => ({
    el: tile,
    letter:
      tile.dataset.letter?.toUpperCase() ||
      tile.textContent.trim().charAt(0).toUpperCase(),
    isBlank: tile.dataset.value === "0" || tile.classList.contains("scrap"),
    used: false,
  }));

  for (let i = 0; i < tiles.length; i++) {
    const isScrap = scraps.includes(i);
    const tileLetter = tiles[i].toUpperCase(); // Assegura't que sempre es compara en majúscules

    if (isScrap) {
      // Amaga la primera fitxa escarràs visible i no usada
      const blankTile = rackState.find(
        (t) => t.isBlank && !t.used && t.el.style.opacity !== "100%"
      );
      if (blankTile) {
        blankTile.el.classList.add("seleccionada");
        blankTile.used = "hidden";
        blankTile.used = true;
      }
    } else {
      // Amaga la primera fitxa normal visible i no usada que coincideixi amb la lletra
      const normalTile = rackState.find(
        (t) =>
          !t.isBlank &&
          t.letter === tileLetter &&
          !t.used &&
          t.el.style.opacity !== "50%"
      );
      if (normalTile) {
        normalTile.el.classList.add("seleccionada");
        normalTile.used = "hidden";
        normalTile.used = true;
      }
    }
  }
}

// MOU la declaració de scrapsInput abans de qualsevol ús
const scrapsInput = document.getElementById("scraps");

// Habilita l'entrada de fitxes del rack
function enableRackTileInput() {
  rackTilesDiv.addEventListener("click", function (e) {
    const tile = e.target.closest(".rack-tile");
    console.log("tile", tile);
    if (!tile) return;
    if (tile.classList.contains("scrap")) {
      // Marca/desmarca la fitxa escarràs
      // Si és una fitxa escarràs, obre un modal amb totes les possibilitats
      const currentScraps = JSON.parse(scrapsInput.value || "[]");
      currentScraps.push(wordInput.value.length - 1); // Afegim la posició de la fitxa escarràs
      //scrapsInput.value = JSON.stringify(currentScraps);
      return;
    }
    // Si la fitxa ja està seleccionada, no fa res
    if (tile.classList.contains("seleccionada")) {
      return;
    }
    const letter = tile.dataset.letter || tile.textContent.trim().charAt(0);
    if (letter) {
      wordInput.value += displayLetter(letter); // Mostra el dígraf si és necessari
      // Si és una fitxa escarràs, afegeix a scraps

      wordInput.dispatchEvent(new Event("input")); // Per si hi ha listeners
    }
  });
}
// Crida la funció després de renderitzar el rack
enableRackTileInput();

const modal = document.getElementById("lettersModal");
if (modal) {
  new bootstrap.Modal(modal);
} else {
  console.warn("No s'ha trobat l'element #lettersModal. El modal no s'ha inicialitzat.");
}

// Funció per omplir el modal amb les lletres disponibles
function ompleModalWithLetters() {
  const modalContent = document.getElementById("scrapButtons");
  modalContent.innerHTML = ""; // Neteja el contingut existent

  // Obtenim totes les fitxes del sac
  const tiles = Object.keys(tileDistribution).filter(
    (letter) => letter !== "?"

  ); // Excloem les fitxes escarràs
  const currentScraps = JSON.parse(scrapsInput.value || "[]");
  // Creem un div per cada lletra
  tiles.forEach((letter) => {
    const div = renderTile(letter, false);
    div.dataset.bsDismiss = "modal"; // Classe per estilitzar al modal
    div.addEventListener("click", () => {
      wordInput.value += displayLetter(letter.toLowerCase()); // Afegeix la lletra al camp de paraula
      wordInput.dispatchEvent(new Event("input"));

      currentScraps.push(wordInput.value.length - 1); // Afegeix la posició de la fitxa escarràs
      scrapsInput.value = JSON.stringify(currentScraps);
      wordInput.dispatchEvent(new Event("input"));
      // Actualitza els botons de les fitxes i la vista del rack
      const tileButtonsDiv = document.getElementById("tileButtons");
      const tileButtons = tileButtonsDiv.querySelectorAll(".tile-button");
      const newScrapIndex = wordInput.value.length - 1;
      tileButtons.forEach((button, idx) => {
        const index = parseInt(button.dataset.index);
        if (index === newScrapIndex) {
          button.classList.add("scrap");
          // Actualitza només aquest botó amb la lletra i valor d'escarràs
          button.textContent = displayLetter(letter.toLowerCase());
          let valueSpan = button.querySelector(".tile-value");
          if (!valueSpan) {
            valueSpan = document.createElement("span");
            valueSpan.className = "tile-value";
            button.appendChild(valueSpan);
          }
          valueSpan.textContent = "0";
        }
      });
      updateRackTilesPreview(wordInput.value || "", currentScraps);
    });
    modalContent.appendChild(div);
  });
}
ompleModalWithLetters();

//////////////formulariRespostes.js
const wordForm = document.getElementById("wordForm");

const tableInput = document.getElementById("taula");

const respostaMessage = document.getElementById("respostaMessage");
let ENABLE_WORD_VALIDATION = document.getElementById("validateWords");

console.log("ENABLE_WORD_VALIDATION", ENABLE_WORD_VALIDATION.checked);
let currentRack = "";
let currentRoundId = null;

// Assumeix que tens accés a currentBoard o boardBeforeMasterPlay
let boardBeforeMasterPlay = null;

// Escolta els canvis de la ronda actual i actualitza el rackTiles
gameInfoRef.child("currentRound").on("value", (snapshot) => {
  currentRoundId = snapshot.val();

  if (!currentRoundId) {
    console.warn("No hi ha cap ronda actual.");
    return;
  }

  historyRef.child(currentRoundId).on("value", (roundSnapshot) => {
    console.log(currentRoundId, "roundSnapshot", roundSnapshot.val());
    const round = roundSnapshot.val();
    if (round && round.rack) {
      currentRack = round.rack;
    } else {
      console.warn("No hi ha rack disponible per a la ronda actual.");
    }
  });
});

// Updated validateTiles function to validate against the rack from the database
function validateTiles(newTiles) {
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

// Omple el formulari amb les dades de la ronda i jugador seleccionats

async function fillFormDataFromRoundAndPlayer(roundNumber, playerId) {
  respostaMessage.textContent = "";
  const roundRef = historyRef.child(roundNumber);

  try {
    const snapshot = await roundRef.once("value");
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
      boardBeforeMasterPlay = roundData.board.map((row) => row.slice());
    }

    const playerResult = roundData.results?.[playerId];

    if (!playerResult) {
      console.warn(
        `No es troben dades de joc per al jugador ${playerId} a la ronda ${roundNumber}.`
      );
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
    console.log("resultats del jugador actual", playerResult);
    // Omple els camps del formulari
    coordsInput.value = playerResult.coordinates || "";
    wordInput.value = displayWord(playerResult.word, playerResult.scraps) || "";
    directionInput.value = playerResult.direction || "";
    const scraps = JSON.parse(playerResult.scraps || "[]");
    document.getElementById("scraps").disabled = false;
    document.getElementById("scraps").value = playerResult.scraps; //|| "[]";

    // Actualitza els botons de les fitxes i la vista del rack
    generateTileButtons(playerResult.word || "");
    // Re-apply the scrap visual state based on the loaded scraps
    const tileButtons = tileButtonsDiv.querySelectorAll(".tile-button");
    tileButtons.forEach((button) => {
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
    if (
      playerResult.coordinates &&
      playerResult.word &&
      playerResult.direction &&
      boardBeforeMasterPlay
    ) {
      previewMasterPlay();
      coordsInput.dispatchEvent(new Event("input"));
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
  //const word = normalizeWordInput(wordRaw);

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
  let usedTiles = [];
  for (let i = 0; i < formattedWord.length; i++) {
    const row = startRow + (direction === "vertical" ? i : 0);
    const col = startCol + (direction === "horizontal" ? i : 0);
    if (boardBeforeMasterPlay[row][col] == "") {
      const letter = formattedWord[i];
      const isScrap = letter === letter.toLowerCase();
      if (isScrap) {
        // Aquesta lletra era un escarràs del faristol
        usedTiles.push("?");
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
      respostaMessage.textContent = `La lletra "${displayLetter(
        formattedWord[i]
      )}" no coincideix amb la lletra "${displayLetter(
        boardBeforeMasterPlay[row][col]
      )}" a la posició ${String.fromCharCode(65 + row)}${col + 1}.`;
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
  const isBoardEmpty = boardBeforeMasterPlay
    .flat()
    .every((cell) => cell === "");

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
      respostaMessage.textContent =
        "La primera paraula ha de passar per la casella central!";
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
      respostaMessage.textContent =
        "La paraula ha de tocar almenys una fitxa existent al tauler!";
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
  const jugadaValida = window.validateAllWords(allWords);
  //afegeig una variable global per si s'han de validar o no les paraules
  if (
    typeof ENABLE_WORD_VALIDATION !== "undefined" &&
    ENABLE_WORD_VALIDATION.checked
  ) {
    // Comprova si totes les paraules formades són vàlides
    if (!jugadaValida) {
      respostaMessage.textContent =
        "Alguna de les paraules formades no és vàlida!";
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
  const score = jugadaValida
    ? calculateFullPlayScore(
        boardBeforeMasterPlay,
        newWordInfo,
        letterValues,
        multiplierBoard
      )
    : 0;
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
  const jugadaValida = window.validateAllWords(allWords);

  // Calcula i mostra la puntuació en temps real
  const score = jugadaValida
    ? calculateFullPlayScore(
        boardBeforeMasterPlay,
        newWordInfo,
        letterValues,
        multiplierBoard
      )
    : 0;
  document.getElementById("score-master").textContent = `Puntuació: ${score}`;
}


const tileButtonsDiv = document.getElementById("tileButtons");
// Assegura't de cridar previewMasterPlay() a cada canvi:
coordsInput.addEventListener("input", previewMasterPlay);
directionInput.addEventListener("input", previewMasterPlay);
wordInput.addEventListener("input", previewMasterPlay);
scrapsInput.addEventListener("input", previewMasterPlay);
// Llegeix l'estat actual dels escarrassos

let currentWordTiles = [];

function generateTileButtons(word, scraps) {
  tileButtonsDiv.innerHTML = "";
  currentWordTiles = [];

  scraps = JSON.parse(scrapsInput.value || "[]");

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
      scraps.push(i);
      button.classList.add("scrap");
      button.textContent = displayLetter(tiles[i].toLowerCase());
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
  updateRackTilesPreview(word, scraps);
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

  console.log("escarrassosInput.value", scrapsInput.value);
  //wordInput.value = word; // Actualitza el valor de l'input
  generateTileButtons(word);
  //updateTileButtonsFromForm()
  previewMasterPlay(); // Call preview after generating buttons
});

// També actualitza els botons en carregar la pàgina si hi ha valor inicial
if (wordInput.value) {
  generateTileButtons(wordInput.value, JSON.parse(scrapsInput.value || "[]"));
}

/* // Desa el nom del jugador al localStorage
playerInput.addEventListener("input", () => {
  const playerName = playerInput.value.trim();
  localStorage.setItem("nomJugador", playerName);
});
// Desa el taula del jugador al localStorage
tableInput.addEventListener("input", () => {
  const table = tableInput.value.trim();
  localStorage.setItem('playerTable', table);
  
}); */
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

formEnabled.on("value", (snapshot) => {
  const enabled = snapshot.val();
  const table = tableInput.value.trim();
  const isAdmin = table.toLowerCase() === "administrador";
  wordForm.querySelectorAll("input, button, select, textarea").forEach((el) => {
    el.disabled = !enabled && !isAdmin;
  });
  // Opcional: mostra un missatge si està deshabilitat
  if (!enabled && !isAdmin) {
    respostaMessage.textContent =
      "El formulari està deshabilitat per l'administrador.";
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
  formEnabled.once("value").then((snapshot) => {
    const enabled = snapshot.val();
    const table = tableInput.value.trim();
    const isAdmin = table.toLowerCase() === "administrador";
    wordForm
      .querySelectorAll("input, button, select, textarea")
      .forEach((el) => {
        el.disabled = !enabled && !isAdmin;
      });
    if (!enabled && !isAdmin) {
      respostaMessage.textContent =
        "El formulari està deshabilitat per l'administrador.";
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

//formula per actualitzar el tileButtonsDiv agafant la  paraula del formulari i els scraps desats a scrapsInput
function updateTileButtonsFromForm() {
  const word = wordInput.value.toUpperCase();
  const scraps = JSON.parse(scrapsInput.value || "[]");
  generateTileButtons(word, scraps);
}
/////////////////resultats
const resultatsDiv = document.getElementById("resultats");

// Escolta canvis a la ronda actual i mostra resultats
function showResultats(roundId) {
  currentRoundId = roundId;
  historyRef.child(roundId).on("value", (snapshot) => {
    const round = snapshot.val();
    renderResultats(round);
  });
}

function renderResultats(round) {
  if (!resultatsDiv) return;
  resultatsDiv.innerHTML = "";

  if (!round) {
    resultatsDiv.innerHTML = "<p>No hi ha dades per aquesta ronda.</p>";
    return;
  }

  // Mostra jugada mestra si existeix
  if (round.masterPlay) {
    console.log("hi ha masterPlay");
    const master = round.masterPlay;
    const masterDiv = document.createElement("div");
    masterDiv.className = "master-play-result";
    masterDiv.innerHTML = `
            <h4>Jugada mestra</h4>
            <p>
                <strong>Coords:</strong> ${master.coords || ""} <br>
                <strong>Paraula:</strong> ${
                  master.word ? displayWord(master.word) : ""
                } <br>
                <strong>Direcció:</strong> ${master.direction || ""} <br>
                <strong>Punts:</strong> ${master.score ?? ""}
            </p>
        `;
    resultatsDiv.appendChild(masterDiv);
  }

  // Mostra respostes dels jugadors si existeixen
  if (round.results) {
    //ordena per punts descentents
    const resultats = Object.entries(round.results);

    const sortedResults = resultats.sort((a, b) => {
      const scoreA = a[1].score || 0;
      const scoreB = b[1].score || 0;
      return scoreB - scoreA;
    });
    //Si Jugada mestra existeix, posa'l al primer
    const masterPlay = sortedResults.find(
      ([player]) => player.toLowerCase() === "jugada mestra"
    );
    if (masterPlay) {
      sortedResults.unshift(
        sortedResults.splice(sortedResults.indexOf(masterPlay), 1)[0]
      );
    }

    const table = document.createElement("table");
    table.className = "table";
    table.classList.add("table-hover");
    table.innerHTML =
      "<thead><tr><th>Jugador</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>";

    sortedResults.forEach(([player, data]) => {
      const coordinatesDisplay = data.coordinates || "";
      const wordDisplay = data.word ? displayWord(data.word, data.scraps) : "";
      const scoreDisplay = data.score !== undefined ? data.score : "";
      table.innerHTML += `<tr data-coords="${coordinatesDisplay}" data-word="${data.word}" data-scraps="${data.scraps}"  data-player="${player}"><td>${player}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td><td>${scoreDisplay}</td></tr>`;
    });
    resultatsDiv.appendChild(table);
    // Afegir event listener per a cada fila
    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        const coords = row.getAttribute("data-coords");
        const word = row.getAttribute("data-word");
        const scraps = row.getAttribute("data-scraps");
        const player = row.getAttribute("data-player");

        //setCoordinatesAndWord(coords, displayWord(word,scraps),scraps);
        fillFormDataFromRoundAndPlayer(currentRoundId, player);
        //deixar la fila seleccionada activa fins que es faci clic a una altra
        rows.forEach((r) => r.classList.remove("table-active"));
        row.classList.add("table-active");
      });
    });

    // Si no hi ha respostes, mostra un missatge
  } else {
    resultatsDiv.innerHTML +=
      "<p>No hi ha respostes de jugadors per aquesta ronda.</p>";
  }
}
///////////////classificació.js

function displayRanking(numRondesToShow) {
  console.log("roundid", numRondesToShow);
  generateRankingTable(numRondesToShow, (rankingTable) => {
    document.getElementById("rankingContainer").innerHTML = rankingTable; // Replace 'rankingContainer' with the ID of the element where you want to display the table
  });
}

function generateRankingTable(numRondes, callback) {
  historyRef.on("value", (snapshot) => {
    const historyData = snapshot.val();
    console.log(historyData);

    if (!historyData) {
      console.log("No ranking data available yet.");
      callback(""); // Provide empty string or handle no data case in displayRanking
      return;
    }

    const roundsData = historyData;
    console.log("rondes", roundsData);
    const numRondesAvailable = Object.keys(roundsData).length;
    console.log("rondes available", numRondesAvailable);

    // Use the minimum of numRondesToShow and numRondesAvailable
    const roundsToProcess = Math.min(numRondes, numRondesAvailable);

    // Calculate total points for each player up to the specified round
    const playerTotals = {};
    const playerRoundScores = {}; // To store individual round scores
    for (let i = 0; i < roundsToProcess; i++) {
      const roundKey = i + 1;
      const roundResults = roundsData[roundKey]
        ? roundsData[roundKey].results
        : {};
      for (const playerId in roundResults) {
        const score = roundResults[playerId].score || 0;
        playerTotals[playerId] = (playerTotals[playerId] || 0) + score;
        playerRoundScores[playerId] = playerRoundScores[playerId] || {};
        playerRoundScores[playerId][i] = score;
      }
    }

    // Find the highest total score
    let highestScore = 0;
    for (const player in playerTotals) {
      console.log(player);
      if (playerTotals[player] > highestScore) {
        highestScore = playerTotals[player];
      }
    }

    // Generate the table HTML
    let tableHtml = '<table class="table">';
    tableHtml += '<thead><tr><th class="sticky-col">Jugador</th>';

    // Add headers for each round
    for (let i = 1; i <= roundsToProcess; i++) {
      tableHtml += `<th>Ronda ${i}</th>`;
    }

    tableHtml += "<th>Total</th><th>% Max Punts</th></tr></thead>";
    tableHtml += "<tbody>";

    // Sort players by total score (descending)
    const sortedPlayers = Object.keys(playerTotals).sort(
      (a, b) => playerTotals[b] - playerTotals[a]
    );
    //si Jugada mestra existeix, posa'l al primer
    const masterPlay = sortedPlayers.find(
      (player) => player.toLowerCase() === "jugada mestra"
    );
    if (masterPlay) {
      sortedPlayers.splice(sortedPlayers.indexOf(masterPlay), 1);
      sortedPlayers.unshift(masterPlay);
    }

    // Add rows for each player
    for (const player of sortedPlayers) {
      tableHtml += "<tr>";
      tableHtml += `<td class="sticky-col">${player}</td>`;

      // Add scores for each round
      let playerTotalForDisplay = 0;
      for (let i = 0; i < roundsToProcess; i++) {
        const score =
          playerRoundScores[player] &&
          playerRoundScores[player][i] !== undefined
            ? playerRoundScores[player][i]
            : 0; // Handle cases where a player didn't play a round
        tableHtml += `<td>${score}</td>`;
        playerTotalForDisplay += score;
      }

      tableHtml += `<td>${playerTotalForDisplay}</td>`;

      // Calculate and add percentage of highest score
      const percentage =
        highestScore > 0 ? (playerTotalForDisplay / highestScore) * 100 : 0; // Handle division by zero
      tableHtml += `<td>${percentage.toFixed(2)}%</td>`;

      tableHtml += "</tr>";
    }

    tableHtml += "</tbody></table>";

    // Pass the generated table HTML to the callback
    callback(tableHtml);
  });
}

//////rellotge.js

const countdownElement = document.getElementById("countdown");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const pipSound = document.getElementById("pipSound");
const storedTable = localStorage.getItem("playerTable");
function isAdmin() {
  return storedTable && storedTable.toLowerCase() === "administrador";
}

let timer;
let timeLeft = 300; // 5 minutes in seconds

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayMinutes = String(minutes).padStart(2, "0");
  const displaySeconds = String(seconds).padStart(2, "0");
  countdownElement.textContent = `${displayMinutes}:${displaySeconds}`;

  clockRef.child("time").set(`${displayMinutes}:${displaySeconds}`);
  clockRef.child("timeLeft").set(timeLeft);

  if (timeLeft <= 30) {
    clockRef.child("warning").set(true);
    countdownElement.classList.add("warning");
    if (timeLeft > 0 && timeLeft <= 30 && timeLeft % 10 === 0) {
      // Play pip sound every 10 seconds in the last 30
      pipSound.play();
    } else if (timeLeft === 0) {
      //repeteix el so 3 vegades
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          pipSound.play();
        }, i * 200); // Play every second
      }



      countdownElement.classList.add("paused");
      clockRef.child("running").set(false);
    }
  } else {
    countdownElement.classList.remove("warning");
  }
}

function startTimer() {
  countdownElement.classList.remove("paused");
  if (!timer) {
    db.ref("formEnabled").set(true);
    clockRef.child("running").set(true);
    timeLeft === 0 ? (timeLeft = 300) : timeLeft;
    timer = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timer);
        timer = null;
        // Optionally, add actions when the timer reaches zero
        db.ref("formEnabled").set(false);
        clockRef.child("running").set(false);
        clockRef.child("timeLeft").set(300);
      }
    }, 1000); // Update every 1 second
  }
}

function stopTimer() {
  countdownElement.classList.add("paused");
  if (timer) {
    clearInterval(timer);
    timer = null;
    db.ref("formEnabled").set(false); // Assuming form is disabled when timer stops
    clockRef.child("running").set(false); // Update running status in Firebase
  }
}

function resetTimer() {
  countdownElement.classList.add("paused");
  clockRef.child("running").set(false);
  clockRef.child("warning").set(false);
  stopTimer();
  timeLeft = 300; // Reset to 5 minutes
  clockRef.child("timeLeft").set(timeLeft);
  updateTimerDisplay();
  countdownElement.classList.remove("warning"); // Remove warning class on reset
}

if (startBtn) startBtn.addEventListener("click", startTimer);
if (stopBtn) stopBtn.addEventListener("click", stopTimer);
if (resetBtn) resetBtn.addEventListener("click", resetTimer);

// Load saved time and state from Firebase on page load
if (isAdmin()) {
  clockRef.once("value", (snapshot) => {
    const savedData = snapshot.val();
    if (savedData && savedData.timeLeft !== undefined) {
      timeLeft = savedData.timeLeft;
      updateTimerDisplay();
      if (savedData.running) {
        startTimer();
      }
    } else {
      // If no data in Firebase, initialize with default time and update display
      updateTimerDisplay();
    }
  });
}

const rellotgeEsclau = document.getElementById("countdown");

if (!isAdmin()) {
  rellotgeEsclau.id = "countdownSlave";
  clockRef.on("value", (snapshot) => {
    rellotgeEsclau.textContent = snapshot.val().time;
    if (snapshot.val().warning) {
      rellotgeEsclau.classList.add("warning");
    } else {
      rellotgeEsclau.classList.remove("warning");
    }
    if (snapshot.val().running) {
      rellotgeEsclau.classList.remove("paused");
    } else {
      rellotgeEsclau.classList.add("paused");
    }
    if (snapshot.val().timeLeft <= 0) {
      rellotgeEsclau.classList.add("paused");
      //repeteix el so 3 vegades
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          pipSound.play();
        }, i * 200); // Play every second
      }
    }
  });
}

/////tauler.js

// Funció per renderitzar el tauler a l'HTML
// Inicialitzar el tauler (per exemple, 15x15)
let currentBoard = createEmptyBoard(15);
renderBoard(currentBoard);

// Gestionar la selecció de la direcció
const horizontalBtn = document.getElementById("horizontalBtn");
const verticalBtn = document.getElementById("verticalBtn");

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
function getTileAt(row, col) {
  if (
    row < 0 ||
    row >= currentBoard.length ||
    col < 0 ||
    col >= currentBoard[0].length
  ) {
    return null; // Fora de límits
  }
  //comprova si és una fitxa escarràs iretorna objecte amb la lletra i si és escarràs o no
  const tile = currentBoard[row][col];
  if (tile && tile === tile.toLowerCase()) {
    return { letter: tile.toUpperCase(), isScrap: true };
  } else if (tile) {
    return { letter: tile.toUpperCase(), isScrap: false };
  }
  return null; // No hi ha fitxa
}

////////////////////// MODULARIZATION & IMPROVEMENTS //////////////////////
// --- Utility: Event Listener Setup ---
function setupEventListeners() {
  // Prevent duplicate listeners by removing before adding
  prevRoundBtn?.removeEventListener("click", prevRoundHandler);
  nextRoundBtn?.removeEventListener("click", nextRoundHandler);
  novaRondaBtn?.removeEventListener("click", addNewRoundHandler);
  tancaRondaBtn?.removeEventListener("click", closeCurrentRound);
  obreRondaBtn?.removeEventListener("click", openCurrentRound);
  deleteRondaBtn?.removeEventListener("click", deleteRoundHandler);
  randomRackBtn?.removeEventListener("click", randomRackHandler);
  updateRackBtn?.removeEventListener("click", updateRackHandler);

  prevRoundBtn?.addEventListener("click", prevRoundHandler);
  nextRoundBtn?.addEventListener("click", nextRoundHandler);
  novaRondaBtn?.addEventListener("click", addNewRoundHandler);
  tancaRondaBtn?.addEventListener("click", closeCurrentRound);
  obreRondaBtn?.addEventListener("click", openCurrentRound);
  deleteRondaBtn?.addEventListener("click", deleteRoundHandler);
  randomRackBtn?.addEventListener("click", randomRackHandler);
  updateRackBtn?.addEventListener("click", updateRackHandler);
}

function prevRoundHandler() {
  if (currentRoundIndex > 0) showRound(currentRoundIndex - 1);
}
function nextRoundHandler() {
  if (currentRoundIndex < roundsList.length - 1)
    showRound(currentRoundIndex + 1);
}
function addNewRoundHandler() {
  if (confirm("Esteu segur que voleu obrir una nova ronda?")) addNewRound();
}
function deleteRoundHandler() {
  if (confirm("Esteu segur que voleu esborrar la ronda actual?")) {
    const roundId = roundsList[currentRoundIndex];
    historyRef
      .child(roundId)
      .remove()
      .then(() => {
        alert("Ronda esborrada correctament.");
        loadRoundsHistory();
      })
      .catch((error) => {
        console.error("Error al esborrar la ronda:", error);
      });
  }
}
function randomRackHandler() {
  const remainingRack = normalizeWordInput(editRackInput.value).split("");
  const currentRackLength = remainingRack.length;
  const newTiles = selectRandomTiles(7 - currentRackLength);
  const selectedTiles = [...remainingRack, ...newTiles];
  editRackInput.value = displayWord(selectedTiles.join(""));
}
function updateRackHandler() {
  if (
    !confirm(
      "Esteu segur que voleu actualitzar el faristol? Tots els resultats de la ronda actual s'esborraran."
    )
  )
    return;
  const newRack = normalizeWordInput(editRackInput.value.trim().toUpperCase());
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    historyRef.child(`${roundId}/rack`).set(newRack);
    historyRef.child(`${roundId}/results`).remove();
    const masterPlay = { word: "", coordinates: "", direction: "", score: 0 };
    historyRef.child(`${roundId}/results/${actualPlayer}`).set(masterPlay);
  } else {
    console.error("No hi ha cap ronda actual per actualitzar el faristol.");
  }
}

// --- Scraps Input Handling ---
function setScraps(scrapsArr) {
  // Only update if changed
  const current = JSON.stringify(JSON.parse(scrapsInput.value || "[]"));
  const next = JSON.stringify(scrapsArr);
  if (current !== next) {
    scrapsInput.value = next;
    scrapsInput.dispatchEvent(new Event("input"));
  }
}

// --- Modularize Board/Rack/Results/Ranking/Clock Logic ---
function updateBoardAndRack(round) {
  if (editRackInput) editRackInput.value = displayWord(round?.rack || "");
  renderRackTiles(round?.rack || "");
  if (round?.board) renderBoard(round.board);
}
function updateResultsAndRanking(roundId) {
  showResultats(roundId);
  displayRanking(roundId);
}
function updateClockUI() {
  // Placeholder: implement clock sync logic if needed
}

// --- Accessibility Improvements ---
function improveAccessibility() {
  // Add ARIA roles/labels to dynamic elements
  rackTilesDiv?.setAttribute("role", "list");
  rackTilesDiv?.setAttribute("aria-label", "Fitxes del faristol");
  sacTilesDiv?.setAttribute("role", "list");
  sacTilesDiv?.setAttribute("aria-label", "Fitxes del sac");
  if (wordInput) wordInput.setAttribute("aria-label", "Paraula");
  if (coordsInput) coordsInput.setAttribute("aria-label", "Coordenades");
}

// --- Main Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  improveAccessibility();
  loadRoundsHistory();
});
