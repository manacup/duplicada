import {
  gameInfoRef,
  roundsCollectionRef,
  jugadorsCollectionRef,
  formEnabledRef,
} from "./firebase.js";
import {
  createEmptyBoard,
  normalizeWordInput,
  displayWord,
  tileDistribution,
  displayLetter,
} from "./utilitats.js";
import { showResultats } from "./resultats.js";
import { renderBoard } from "./tauler.js";
import { renderRackTiles, renderSacTiles } from "./rackTile.js";
import { fillFormDataFromRoundAndPlayer } from "./formulariRespostes.js";
//import {copyTaulerRonda,setCurrentRack,setCurrentRoundId} from './formulariRespostes.js';
import { saveWordsToBoard, findWordInfo } from "./calcul.js";
import { generateRankingTable, displayRanking } from "./classificacio.js";

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
const tableInput = document.getElementById("loginTable");
const fitxesRestants = document.getElementById("fitxesRestants");

let actualPlayer = "Jugada mestra";

// Estat local
let roundsList = [];
let currentRoundIndex = -1;

// Carrega l'historial de rondes
function loadRoundsHistory() {
  // Order by 'roundNumber' assuming you will add this field when creating a round
  roundsCollectionRef.orderBy('roundNumber').onSnapshot((snapshot) => { // Changed from onSnapshot to get()
    roundsList = [];
    snapshot.docs.forEach(doc => {
      roundsList.push(doc.id); // Use document ID as round ID
    });

    if (roundsList.length === 0) {
      addNewRound(); // This will be async, but loadRoundsHistory itself doesn't need to await it
    } else {
      currentRoundIndex = roundsList.length - 1;
      
      showRound(currentRoundIndex); // This will trigger an onSnapshot listener inside showRound
     
      
    }
  }, (error) => {
    console.error("Error loading rounds history:", error);
  });
}


let openRound = false; // Variable per controlar si la ronda està oberta


// Mostra una ronda específica
function showRound(idx) {
  if (idx < 0 || idx >= roundsList.length) return;
  currentRoundIndex = idx;
  const roundId = roundsList[idx];

  roundsCollectionRef.doc(roundId).onSnapshot((doc) => {
    if (!doc.exists) {
      //console.log("No such round exists!");
      return;
    }
    const round = doc.data();

    actualPlayer = playerInput ? playerInput.value : "Jugada mestra";
    openRound = !round.closed; // Actualitza l'estat de la ronda oberta

    if (rondaDisplay) rondaDisplay.textContent = `Ronda ${roundId}`;
    if (editRackInput) editRackInput.value = displayWord(round?.rack || ""); // Use displayWord to format the rack
    renderRackTiles(round?.rack || "");
    if (round?.board) {
      console.log("recarrega tauler")
      // Assuming round.board is a flattened 1D array, reconstruct the 2D array (15x15)
      const reconstructedBoard = reconstructBoard(round.board, 15, 15);
      renderBoard(reconstructedBoard);
    }

    carregaLlistaJugador();
    //console.log("actualPlayer", actualPlayer);
    
      fillFormDataFromRoundAndPlayer(roundId, actualPlayer);
    
    updateSac();
    updateRemainingTiles();
    showResultats(roundId); // Assuming showResultats uses the new Firestore structure as well
    displayRanking(roundId); // Assuming displayRanking uses the new Firestore structure as well
    updateUIForCurrentRound(round, idx === roundsList.length - 1); // Passa si és l'última ronda
  }, (error) => {
    console.error("Error showing round:", error);
  });
}
// Function to reconstruct a 2D board from a flattened 1D array
function reconstructBoard(flattenedBoard, rows, cols) {
  const board = [];
  for (let i = 0; i < rows; i++) {
    board.push(flattenedBoard.slice(i * cols, (i + 1) * cols));
  }
  return board;
    console.error("Error showing round:", error);
  }
//actualitza informació de fitxes restants
async function updateRemainingTiles() {
  const remainingTiles =  await calculateRemainingTiles();
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
async function updateSac() {
  const remainingTiles = await calculateRemainingTiles();
  //console.log(remainingTiles)

  const tiles = Object.entries(remainingTiles).flatMap(([tile, count]) =>
    Array(count).fill(tile)
  );
  const sacString = tiles.join("");
  //console.log("Sac de fitxes:", sacString);
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
async function addNewRound() { // Made async to handle promises from Firestore reads
  // Comprova si ja hi ha una ronda oberta
  const snapshot = await roundsCollectionRef.where('closed', '==', false).get();
  if (!snapshot.empty) {
    alert(
      "Ja hi ha una ronda oberta. Tanca-la abans d'obrir-ne una de nova."
    );
    return;
  }

  //trobar les dades de la darrera ronda tancada per copiar el tauler a la nova ronda
  const lastClosedRoundSnapshot = await roundsCollectionRef.where('closed', '==', true).orderBy('roundNumber', 'desc').limit(1).get();
  let boardToCopy = createEmptyBoard(15); // Tauler buit per defecte
  let lastRoundData = null;
  if (!lastClosedRoundSnapshot.empty) {
    lastRoundData = lastClosedRoundSnapshot.docs[0].data();
    if (lastRoundData?.board) {
      boardToCopy = reconstructBoard(lastRoundData.board,15,15);
    }
  }

  // Genera un nou ID de ronda i número de ronda
  const newRoundNumber = roundsList.length > 0
    ? Number(roundsList[roundsList.length - 1]) + 1
    : 1;
  const newRoundId = String(newRoundNumber); // Use string number as document ID

  const lastWord = lastRoundData?.results?.[actualPlayer]?.word || "";
  const lastCoordinates = lastRoundData?.results?.[actualPlayer]?.coordinates || "";
  const lastDirection = lastRoundData?.results?.[actualPlayer]?.direction || "";
  const lastWordInfo = findWordInfo(lastWord, lastCoordinates, lastDirection);
  if (lastRoundData) saveWordsToBoard(boardToCopy, [lastWordInfo]);
  const lastRack = lastRoundData?.rack?.split("") || []; // Converteix a array
  const playerdup =
    modalitat === "duplicada" ? "Jugada mestra" : actualPlayer;
  const lastUsedTiles =
    lastRoundData?.results?.[playerdup]?.usedtiles || []; // Fitxes usades

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
    roundNumber: newRoundNumber, // Store round number as a number
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

  // Flatten the 2D board array into a 1D array for Firestore
  const flattenedBoard = boardToCopy.flat();

  // Update the newRound object with the flattened board
  newRound.board = flattenedBoard;

  // Check if the gameInfo document exists and create it if it doesn't
  const gameInfoSnapshot = await gameInfoRef.get();
  if (!gameInfoSnapshot.exists) {
    await gameInfoRef.set({ currentRound: '', lastRound: '' }, { merge: true });
  }

  try {
    await gameInfoRef.update({ currentRound: newRoundId });
    await roundsCollectionRef.doc(newRoundId).set(newRound);

    // The onSnapshot listener in loadRoundsHistory will update roundsList and show the new round
    // No need to manually push and call showRound here
    // roundsList.push(newRoundId);
    // showRound(roundsList.length - 1);

  } catch (error) {
    console.error("Error adding new round:", error);
    alert("Error afegint nova ronda. Consulta la consola per a més detalls.");
  }
  //console.log("lastRoundData:", lastRoundData);
    //console.log("actualPlayer:", actualPlayer);
    //console.log("lastWord:", lastWord);
    //console.log("lastCoordinates:", lastCoordinates);
    //console.log("lastDirection:", lastDirection);
}


// Funció per calcular les fitxes restants al sac
async function calculateRemainingTiles() { // Made async to handle Firestore read
  const usedTiles = {};

  // Recorre totes les rondes tancades i suma les fitxes usades
  const closedRoundsSnapshot = await roundsCollectionRef.where('closed', '==', true).get();

  closedRoundsSnapshot.docs.forEach((doc) => {
    const round = doc.data();
    if (round && round.results) {
      const resultats = round.results;
      if (modalitat === "duplicada") {
        if (resultats["Jugada mestra"]?.usedtiles) {
          resultats["Jugada mestra"].usedtiles.forEach((tile) => {
            usedTiles[tile] = (usedTiles[tile] || 0) + 1;
          });
        }
      } else {
         // This part might need adjustment based on how non-duplicada results are structured in Firestore
         // Assuming results is an object where keys are player IDs
         //console.log(resultats)
         Object.values(resultats).forEach((result) => {
           result?.usedtiles?.forEach((tile) => usedTiles[tile] = (usedTiles[tile] || 0) + 1);
         }); // Corrected placement of closing parenthesis and brace
      }}
  });

  //s'han de tenir en compte les fitxes que hi ha al faristol actual
  const currentRack = normalizeWordInput(editRackInput.value).split("");
  currentRack.forEach((tile) => {
    usedTiles[tile] = (usedTiles[tile] || 0) + 1;
  });
  ////console.log(usedTiles)

  // Calcula les fitxes restants basant-se en la distribució inicial
  const remainingTiles = { ...tileDistribution };
  Object.entries(usedTiles).forEach(([tile, count]) => {
    if (remainingTiles[tile] !== undefined) {
      remainingTiles[tile] = Math.max(0, remainingTiles[tile] - count);
    }
  });
  //console.log("Fitxes usades:", usedTiles);
  //console.log("Fitxes restants:", remainingTiles);

  return remainingTiles;
}


// Funció per seleccionar fitxes aleatòriament del sac
async function selectRandomTiles(count) { // Made async
  const remainingTiles = await calculateRemainingTiles(); // Await the async function
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

randomRackBtn.addEventListener("click", async () => { // Made async
  //compta quantes fitxes hi ha al editRackInput
  const remainingRack = normalizeWordInput(editRackInput.value).split("");
  ////console.log(remainingRack)
  const currentRackLength = remainingRack.length;

  const newTiles = await selectRandomTiles(7 - currentRackLength); // Await the async function
  const selectedTiles = [...remainingRack, ...newTiles];
  ////console.log(newTiles);

  ////console.log(selectedTiles)
  // Selecciona 7 fitxes
  editRackInput.value = displayWord(selectedTiles.join("")); // Mostra les fitxes seleccionades
});
// Exemple d'ús: Seleccionar fitxes quan s'obre una nova ronda
async function openNewRoundWithRandomTiles() { // Made async
  const newRack = (await selectRandomTiles(7)).join(""); // Select 7 tiles and await

  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    try {
      await roundsCollectionRef.doc(roundId).update({ rack: newRack });
      ////console.log(`Faristol inicial assignat per la ronda ${roundId}: ${newRack}`);
    } catch (error) {
      console.error("Error updating rack:", error);
    }
  }
 else {
    console.error(
      "No hi ha cap ronda actual per assignar el faristol inicial."
    );
  }
}


// Carrega l'historial de rondes al carregar la pàgina
//document.addEventListener("DOMContentLoaded", loadRoundsHistory);

// Actualitza el faristol manualment i desa a la base de dades
// Normalize the rack before saving to the database
if (updateRackBtn) {
  updateRackBtn.addEventListener("click", async () => { // Made async
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
      try {
        await roundsCollectionRef.doc(roundId).update({ rack: newRack });
        ////console.log(`Faristol actualitzat per la ronda ${roundId}`);

        //eliminar resultats de la ronda actual
        await roundsCollectionRef.doc(roundId).update({ results: {} }); // Set to empty object to remove all results
        ////console.log(`Resultats eliminats per la ronda ${roundId}`);

        //genera Jugador mestre en blanc
        const masterPlay = {
          word: "",
          coordinates: "",
          direction: "",
          score: 0,
        };
        await roundsCollectionRef.doc(roundId).update({
          [`results.${actualPlayer}`]: masterPlay, // Use dot notation with backticks for nested update
        });
        ////console.log(`Jugada mestra generada per la ronda ${roundId}`);
      } catch (error) {
        console.error("Error updating round data:", error);
        alert("Error actualitzant dades de la ronda. Consulta la consola.");
      }
    } else {
      console.error("No hi ha cap ronda actual per actualitzar el faristol.");
    }
  });
}

// Funció per tancar la ronda actual
async function closeCurrentRound() { // Made async
  //afegeix validació
  if (wordInput.value == "" && coordsInput.value == "") {
    alert("No hi ha cap jugada mestra per tancar la ronda actual.");
    return;
  }
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    try {
      await gameInfoRef.update({
        currentRound: "",
        lastRound: currentRoundIndex + 1,
      });

      await roundsCollectionRef.doc(roundId).update({ closed: true });
    } catch (error) {
      console.error("Error closing round:", error);
      alert("Error tancant ronda. Consulta la consola.");
    }
  } else {
    alert("No hi ha cap ronda actual per tancar.");
  }
}
if (tancaRondaBtn) {
  tancaRondaBtn.addEventListener("click", () => {
    closeCurrentRound();
  });
}
async function openCurrentRound() { // Made async
  //afegeix validació
  if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
    const roundId = roundsList[currentRoundIndex];
    try {
      await gameInfoRef.update({ currentRound: roundId });
      await roundsCollectionRef.doc(roundId).update({ closed: false });
    } catch (error) {
      console.error("Error opening round:", error);
      alert("Error obrint ronda. Consulta la consola.");
    }
  }
 else {
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

  const inputs = mainContent.querySelectorAll("input");
  let administrador =
    tableInput.value.trim().toLowerCase() == "administrador" ? true : false;

  formEnabledRef.onSnapshot((doc) => { // Use onSnapshot for formEnabledRef
    const enabled = doc.data()?.enabled; // Assuming 'enabled' field in the document

    if (round.closed) {
      blocaFormulari();
      if (tancaRondaBtn) tancaRondaBtn.style.display = "none";

      if (novaRondaBtn)
        novaRondaBtn.style.display = isLastRound ? "block" : "none"; // Mostra Nova Ronda només si és l'última ronda
      if (obreRondaBtn)
        obreRondaBtn.style.display = isLastRound ? "block" : "none";
      if (deleteRondaBtn)
        deleteRondaBtn.style.display = isLastRound ? "block" : "none";
    } else {
      // Si la ronda està oberta
      if (tancaRondaBtn) tancaRondaBtn.style.display = "block";
      if (novaRondaBtn) novaRondaBtn.style.display = "none";
      if (obreRondaBtn) obreRondaBtn.style.display = "none";
      if (deleteRondaBtn) deleteRondaBtn.style.display = "block";

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
     if (!enabled) { // Check the 'enabled' field
      blocaFormulari();
     }
  }, (error) => {
    console.error("Error listening to formEnabled:", error);
  });


  function blocaFormulari() {

    // Desactiva tots els botons excepte els de navegació i (si escau) nova ronda
    const excludedButtonIds = [
      "prevRoundBtn",
      "nextRoundBtn",
      "startBtn",
      "stopBtn",
      "resetBtn",
      "novaRondaBtn",
      "obreRondaBtn",
      "deleteRondaBtn",
    ];

    if (!administrador)
      buttons.forEach((button) => {
        //console.log(button.id);
        if (!excludedButtonIds.includes(button.id)) {
          button.disabled = true;
        }
      });
    if (!administrador)
      inputs.forEach((input) => {
        input.disabled = true;
      });
  }
}

if (deleteRondaBtn)
  deleteRondaBtn.addEventListener("click", async () => { // Made async
    if (confirm("Esteu segur que voleu esborrar la ronda actual?")) {
      const roundId = roundsList[currentRoundIndex];
      try {
        await gameInfoRef.update({
           currentRound: "", // Neteja la ronda actual
           lastRound: currentRoundIndex > 0 ? roundsList[currentRoundIndex - 1] : "", // Set lastRound to the previous round's ID or empty if deleting the first round
        });

        await roundsCollectionRef.doc(roundId).delete();
        alert("Ronda esborrada correctament.");
        // loadRoundsHistory will be triggered by the onSnapshot listener
        //loadRoundsHistory(); // Torna a carregar l'historial de rondes
      } catch (error) {
        console.error("Error al esborrar la ronda:", error);
        alert("Error esborrant ronda. Consulta la consola.");
      }
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
function carregaLlistaJugador() {
  jugadorsCollectionRef.onSnapshot((snapshot) => { // Use onSnapshot for jugadorsCollectionRef
    const llistaJugadors = document.getElementById("jugadorslistOptions");
    llistaJugadors.innerHTML = "";

    snapshot.docs.forEach((doc) => { // Iterate through docs
      const jugador = doc.data().name; // Get data from doc
      const option = document.createElement("option");
      option.value = jugador;
      option.textContent = jugador;
      llistaJugadors.appendChild(option);
    });
  }, (error) => {
    console.error("Error loading players:", error);
  });
}
export { loadRoundsHistory, showRound, addNewRound };