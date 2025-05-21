import { gameInfoRef, historyRef } from "./firebase.js";
import {
  createEmptyBoard,
  normalizeWordInput,
  displayWord,
  tileDistribution,
} from "./utilitats.js";
import { showResultats } from "./resultats.js";
import { renderBoard } from "./tauler.js";
import { renderRackTiles } from "./rackTile.js";
import { fillFormDataFromRoundAndPlayer } from "./formulariRespostes.js";
//import {copyTaulerRonda,setCurrentRack,setCurrentRoundId} from './formulariRespostes.js';
import { saveWordsToBoard, findWordInfo } from "./calcul.js";
import { generateRankingTable, displayRanking } from "./classificacio.js";

// Elements UI
const novaRondaBtn = document.getElementById("novaRondaBtn");
const tancaRondaBtn = document.getElementById("tancaRondaBtn");
const obreRondaBtn = document.getElementById("obreRondaBtn");
const rondaDisplay = document.getElementById("roundDisplay");
const randomRackBtn = document.getElementById("randomRackBtn");
const editRackInput = document.getElementById("editRackInput");
const updateRackBtn = document.getElementById("updateRackBtn");
const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const playerInput = document.getElementById("player");

const actualPlayer = playerInput ? playerInput.value : "Jugada mestra";

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
    //console.log('Dades de la ronda carregades:', round);
    if (!round.results) {
      //console.log("no troba resultats")
    }
    if (round.results[actualPlayer]) {
      //console.log('Jugador actual:', round.results[actualPlayer]);
    }
    fillFormDataFromRoundAndPlayer(roundId, actualPlayer);
    updateUIForCurrentRound(roundId, idx === roundsList.length - 1); ///desmarcar en funcionar
    console.log(roundId, idx === roundsList.length - 1)
    if (rondaDisplay) rondaDisplay.textContent = `Ronda ${roundId}`;
    if (editRackInput) editRackInput.value = displayWord(round?.rack || ""); // Use displayWord to format the rack
    //mostra la jugada mestra als inputs de la seccio de jugada mestra tenint en compte que el jugador actual es el que ha de fer la jugada mestra
    renderRackTiles(round?.rack || "");
    //setCurrentRack(round?.rack || '')

    if (round?.board) {
      //console.log('Dades del tauler carregades:', round.board);
      //copyTaulerRonda(round.board)
      renderBoard(round.board);
    }

    showResultats(roundId);
    displayRanking(roundId);
    updateUIForCurrentRound(round, idx === roundsList.length - 1); // Passa si és l'última ronda
  });
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
    const lastWord = data[lastClosedRoundId].results[actualPlayer].word;
    const lastCoordinates =
      data[lastClosedRoundId].results[actualPlayer].coordinates;
    const lastDirection =
      data[lastClosedRoundId].results[actualPlayer].direction;
    const lastWordInfo = findWordInfo(lastWord, lastCoordinates, lastDirection);

    saveWordsToBoard(boardToCopy, [lastWordInfo]);
    const lastRack = data[lastClosedRoundId].rack.split("");
    const lastUsedTiles =
      data[lastClosedRoundId].results[actualPlayer].usedtiles;

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
        Object.values(round.results).forEach((result) => {
          if (result.usedtiles) {
            result.usedtiles.forEach((tile) => {
              usedTiles[tile] = (usedTiles[tile] || 0) + 1;
            });
          }
        });
      }
    });
  });

  // Calcula les fitxes restants basant-se en la distribució inicial
  const remainingTiles = { ...tileDistribution };
  Object.entries(usedTiles).forEach(([tile, count]) => {
    if (remainingTiles[tile] !== undefined) {
      remainingTiles[tile] = Math.max(0, remainingTiles[tile] - count);
    }
  });

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
  if(wordInput.value == ""&&coordsInput.value==""){
    alert("No hi ha cap jugada mestra per tancar la ronda actual.");
    return;
  }
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
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
  const buttons = document.querySelectorAll("button");
  //console.log(buttons)

  const inputs = document.querySelectorAll("input");

  if (round.closed) {
    // Si la ronda està tancada
    if (tancaRondaBtn) tancaRondaBtn.style.display = "none";
    if (novaRondaBtn)
      novaRondaBtn.style.display = isLastRound ? "block" : "none"; // Mostra Nova Ronda només si és l'última ronda
    if (obreRondaBtn)
      obreRondaBtn.style.display = isLastRound ? "block" : "none";
    // Desactiva tots els botons excepte els de navegació i (si escau) nova ronda
    const excludedButtonIds = [
      "prevRoundBtn",
      "nextRoundBtn",
      "startBtn",
      "stopBtn",
      "resetBtn",
    ];
    if (isLastRound) excludedButtonIds.push("novaRondaBtn", "obreRondaBtn");
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

// Afegir esdeveniments als botons
if (novaRondaBtn) {
  novaRondaBtn.addEventListener("click", () => {
    if (confirm("Esteu segur que voleu obrir una nova ronda?")) {
      addNewRound();
    }
  });
}

export { loadRoundsHistory, showRound, addNewRound };
