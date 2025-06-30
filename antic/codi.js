// codi.js - Codi simplificat i unificat de la lògica principal de la partida Duplicada Scrabble
import { jugadors, historyRef, gameInfoRef, clockRef, db } from './firebase.js';
import { splitWordToTiles, normalizeWordInput, displayLetter, createEmptyBoard, displayWord, tileDistribution } from './utilitats.js';
import { renderBoard } from './tauler.js';
// --- LOGIN ---
function handleLogin() {
  const loginForm = document.getElementById('loginForm');
  const loginSection = document.getElementById('login-section');
  const mainContent = document.getElementById('main-content');
  const playerInput = document.getElementById('player');
  const tableInput = document.getElementById('taula');

  // Auto-login if data exists
  const storedName = localStorage.getItem('nomJugador');
  const storedTable = localStorage.getItem('playerTable');
  if (storedName && storedTable) {
    if (loginSection) loginSection.style.display = 'none';
    if (mainContent) mainContent.classList.remove('d-none');
    if (playerInput) playerInput.value = storedName;
    if (tableInput) tableInput.value = storedTable;
    if (storedTable.toLowerCase() !== 'administrador') {
      document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
      document.getElementById('validateWords').checked = false;
      document.getElementById('countdown').id = 'countdownSlave';
    }
    return;
  }
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('loginName').value.trim();
      const table = document.getElementById('loginTable').value.trim();
      const email = document.getElementById('email').value.trim();
      if (!name || !table) return;
      localStorage.setItem('nomJugador', name);
      localStorage.setItem('playerTable', table);
      jugadors.child(`${table}-${name}`).set({ name, email, table, timestamp: Date.now() });
      if (playerInput) playerInput.value = name;
      if (tableInput) tableInput.value = table;
      if (loginSection) loginSection.style.display = 'none';
      if (mainContent) mainContent.classList.remove('d-none');
      if (table.toLowerCase() !== 'administrador') {
        document.querySelectorAll('.master').forEach(el => el.style.display = 'none');
      }
    });
  }
}

// --- RONDES ---
let roundsList = [], currentRoundIndex = -1;
function loadRoundsHistory() {
  historyRef.on('value', (snapshot) => {
    const data = snapshot.val() || {};
    roundsList = Object.keys(data).sort((a, b) => Number(a) - Number(b));
    if (roundsList.length === 0) addNewRound();
    else { currentRoundIndex = roundsList.length - 1; showRound(currentRoundIndex); }
  });
}
function showRound(idx) {
  if (idx < 0 || idx >= roundsList.length) return;
  currentRoundIndex = idx;
  const roundId = roundsList[idx];
  historyRef.child(roundId).on('value', (snapshot) => {
    const round = snapshot.val();
    document.getElementById('roundDisplay').textContent = `Ronda ${roundId}`;
    document.getElementById('editRackInput').value = displayWord(round?.rack || '');
    renderRackTiles(round?.rack || '');
    if (round?.board) renderBoard(round.board);
    fillFormDataFromRoundAndPlayer(roundId, document.getElementById('player').value);
    updateSac();
    updateRemainingTiles();
    showResultats(roundId);
    displayRanking(roundId);
    updateUIForCurrentRound(round, idx === roundsList.length - 1);
  });
}
function addNewRound() {
  historyRef.once('value', (snapshot) => {
    const data = snapshot.val() || {};
    const openRounds = Object.keys(data).filter((key) => !data[key].closed);
    if (openRounds.length > 0) { alert('Ja hi ha una ronda oberta.'); return; }
    const lastClosedRoundId = roundsList.findLast((roundId) => data[roundId].closed);
    let boardToCopy = createEmptyBoard(15);
    if (lastClosedRoundId && data[lastClosedRoundId]?.board) boardToCopy = data[lastClosedRoundId].board;
    const newRoundId = roundsList.length > 0 ? String(Number(roundsList[roundsList.length - 1]) + 1) : '1';
    const lastRack = data[lastClosedRoundId]?.rack.split('') || [];
    const playerdup = 'Jugada mestra';
    const lastUsedTiles = data[lastClosedRoundId]?.results[playerdup]?.usedtiles || [];
    const remainingTilesArray = [...lastRack];
    lastUsedTiles.forEach((usedTile) => {
      const index = remainingTilesArray.indexOf(usedTile);
      if (index > -1) remainingTilesArray.splice(index, 1);
    });
    const remainingTiles = remainingTilesArray.join('');
    const newRound = {
      rack: remainingTiles,
      board: boardToCopy,
      closed: false,
      results: { 'Jugada mestra': { word: '', coordinates: '', direction: '', score: 0, usedtiles: [] } },
    };
    gameInfoRef.child('currentRound').set(newRoundId);
    historyRef.child(newRoundId).set(newRound).then(() => {
      roundsList.push(newRoundId);
      showRound(roundsList.length - 1);
    });
  });
}
function calculateRemainingTiles() {
  const usedTiles = {};
  roundsList.forEach((roundId) => {
    historyRef.child(roundId).once('value', (snapshot) => {
      const round = snapshot.val();
      if (round && round.closed && round.results) {
        const resultats = round.results;
        if (resultats['Jugada mestra']?.usedtiles) {
          resultats['Jugada mestra'].usedtiles.forEach((tile) => {
            usedTiles[tile] = (usedTiles[tile] || 0) + 1;
          });
        }
      }
    });
  });
  const currentRack = document.getElementById('editRackInput').value.split('');
  currentRack.forEach((tile) => { usedTiles[tile] = (usedTiles[tile] || 0) + 1; });
  const remainingTiles = { ...tileDistribution };
  Object.entries(usedTiles).forEach(([tile, count]) => {
    if (remainingTiles[tile] !== undefined) remainingTiles[tile] = Math.max(0, remainingTiles[tile] - count);
  });
  return remainingTiles;
}
function selectRandomTiles(count) {
  const remainingTiles = calculateRemainingTiles();
  const tilePool = [];
  Object.entries(remainingTiles).forEach(([tile, quantity]) => {
    for (let i = 0; i < quantity; i++) tilePool.push(tile);
  });
  const selectedTiles = [];
  for (let i = 0; i < count; i++) {
    if (tilePool.length === 0) break;
    const randomIndex = Math.floor(Math.random() * tilePool.length);
    selectedTiles.push(tilePool.splice(randomIndex, 1)[0]);
  }
  return selectedTiles;
}
function updateRemainingTiles() {
  const remainingTiles = calculateRemainingTiles();
  const remainingTilesCount = Object.values(remainingTiles).reduce((acc, count) => acc + count, 0);
  const remainingTilesText = Object.entries(remainingTiles).map(([tile, count]) => `${displayLetter(tile)}: ${count}`).join(', ');
  const fitxesRestants = document.getElementById('fitxesRestants');
  if (fitxesRestants) fitxesRestants.textContent = `${remainingTilesCount} Fitxes restants: ${remainingTilesText}`;
}
function updateSac() {
  const remainingTiles = calculateRemainingTiles();
  const tiles = Object.entries(remainingTiles).flatMap(([tile, count]) => Array(count).fill(tile));
  const sacString = tiles.join('');
  renderSacTiles(sacString);
}

// --- RACK I TAULER ---
function renderRackTiles(rackString) {
  const rackTilesDiv = document.getElementById('rackTiles');
  rackTilesDiv.innerHTML = '';
  const tiles = splitWordToTiles(rackString.toUpperCase());
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i];
    const div = document.createElement('div');
    div.className = 'rack-tile' + (letter === '?' ? ' scrap' : '');
    div.textContent = displayLetter(letter);
    div.dataset.letter = letter;
    div.dataset.value = (letter === '?' ? '0' : '');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'tile-value';
    valueSpan.textContent = (letter === '?' ? '0' : '');
    div.appendChild(valueSpan);
    rackTilesDiv.appendChild(div);
  }
}
function renderSacTiles(sacString) {
  const sacTilesDiv = document.getElementById('sacTiles');
  if (!sacTilesDiv) return;
  sacTilesDiv.innerHTML = '';
  const tiles = splitWordToTiles(sacString.toUpperCase());
  for (let i = 0; i < tiles.length; i++) {
    const letter = tiles[i];
    const div = document.createElement('div');
    div.className = 'rack-tile' + (letter === '?' ? ' scrap' : '');
    div.textContent = displayLetter(letter);
    div.dataset.letter = letter;
    div.dataset.value = (letter === '?' ? '0' : '');
    const valueSpan = document.createElement('span');
    valueSpan.className = 'tile-value';
    valueSpan.textContent = (letter === '?' ? '0' : '');
    div.appendChild(valueSpan);
    sacTilesDiv.appendChild(div);
  }
}

// --- RESULTATS ---
function showResultats(roundId) {
  const resultatsDiv = document.getElementById('resultats');
  historyRef.child(roundId).on('value', (snapshot) => {
    const round = snapshot.val();
    resultatsDiv.innerHTML = '';
    if (!round) { resultatsDiv.innerHTML = '<p>No hi ha dades per aquesta ronda.</p>'; return; }
    if (round.masterPlay) {
      const master = round.masterPlay;
      const masterDiv = document.createElement('div');
      masterDiv.className = 'master-play-result';
      masterDiv.innerHTML = `<h4>Jugada mestra</h4><p><strong>Coords:</strong> ${master.coords || ''} <br><strong>Paraula:</strong> ${master.word ? displayWord(master.word) : ''} <br><strong>Direcció:</strong> ${master.direction || ''} <br><strong>Punts:</strong> ${master.score ?? ''}</p>`;
      resultatsDiv.appendChild(masterDiv);
    }
    if (round.results) {
      const resultats = Object.entries(round.results);
      const sortedResults = resultats.sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
      const masterPlay = sortedResults.find(([player]) => player.toLowerCase() === 'jugada mestra');
      if (masterPlay) sortedResults.unshift(sortedResults.splice(sortedResults.indexOf(masterPlay), 1)[0]);
      const table = document.createElement('table');
      table.className = 'table table-hover';
      table.innerHTML = '<thead><tr><th>Jugador</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>';
      sortedResults.forEach(([player, data]) => {
        const coordinatesDisplay = data.coordinates || '';
        const wordDisplay = data.word ? displayWord(data.word, data.scraps) : '';
        const scoreDisplay = data.score !== undefined ? data.score : '';
        table.innerHTML += `<tr data-coords="${coordinatesDisplay}" data-word="${data.word}" data-scraps="${data.scraps}"  data-player="${player}"><td>${player}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td><td>${scoreDisplay}</td></tr>`;
      });
      resultatsDiv.appendChild(table);
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        row.addEventListener('click', () => {
          const player = row.getAttribute('data-player');
          fillFormDataFromRoundAndPlayer(roundId, player);
          rows.forEach((r) => r.classList.remove('table-active'));
          row.classList.add('table-active');
        });
      });
    } else {
      resultatsDiv.innerHTML += '<p>No hi ha respostes de jugadors per aquesta ronda.</p>';
    }
  });
}

// --- RÀNQUING ---
function displayRanking(numRondesToShow) {
  generateRankingTable(numRondesToShow, (rankingTable) => {
    document.getElementById('rankingContainer').innerHTML = rankingTable;
  });
}
function generateRankingTable(numRondes, callback) {
  historyRef.on('value', (snapshot) => {
    const historyData = snapshot.val();
    if (!historyData) { callback(''); return; }
    const roundsData = historyData;
    const numRondesAvailable = Object.keys(roundsData).length;
    const roundsToProcess = Math.min(numRondes, numRondesAvailable);
    const playerTotals = {}, playerRoundScores = {};
    for (let i = 0; i < roundsToProcess; i++) {
      const roundKey = i + 1;
      const roundResults = roundsData[roundKey] ? roundsData[roundKey].results : {};
      for (const playerId in roundResults) {
        const score = roundResults[playerId].score || 0;
        playerTotals[playerId] = (playerTotals[playerId] || 0) + score;
        playerRoundScores[playerId] = playerRoundScores[playerId] || {};
        playerRoundScores[playerId][i] = score;
      }
    }
    let highestScore = 0;
    for (const player in playerTotals) if (playerTotals[player] > highestScore) highestScore = playerTotals[player];
    let tableHtml = '<table class="table">';
    tableHtml += '<thead><tr><th class="sticky-col">Jugador</th>';
    for (let i = 1; i <= roundsToProcess; i++) tableHtml += `<th>Ronda ${i}</th>`;
    tableHtml += '<th>Total</th><th>% Max Punts</th></tr></thead><tbody>';
    const sortedPlayers = Object.keys(playerTotals).sort((a, b) => playerTotals[b] - playerTotals[a]);
    const masterPlay = sortedPlayers.find(player => player.toLowerCase() === 'jugada mestra');
    if (masterPlay) { sortedPlayers.splice(sortedPlayers.indexOf(masterPlay), 1); sortedPlayers.unshift(masterPlay); }
    for (const player of sortedPlayers) {
      tableHtml += '<tr>';
      tableHtml += `<td class="sticky-col">${player}</td>`;
      let playerTotalForDisplay = 0;
      for (let i = 0; i < roundsToProcess; i++) {
        const score = playerRoundScores[player] && playerRoundScores[player][i] !== undefined ? playerRoundScores[player][i] : 0;
        tableHtml += `<td>${score}</td>`;
        playerTotalForDisplay += score;
      }
      tableHtml += `<td>${playerTotalForDisplay}</td>`;
      const percentage = (highestScore > 0) ? (playerTotalForDisplay / highestScore) * 100 : 0;
      tableHtml += `<td>${percentage.toFixed(2)}%</td>`;
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    callback(tableHtml);
  });
}

// --- RELLOTGE ---
let timer, timeLeft = 300, timerEndTimestamp = null;
const countdownElement = document.getElementById('countdown');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const pipSound = document.getElementById('pipSound');
const playerTable = localStorage.getItem('playerTable');
function isAdmin() { return playerTable && playerTable.toLowerCase() === 'administrador'; }
function updateTimerDisplay() {
  const now = Date.now();
  let secondsLeft = timeLeft;
  if (timerEndTimestamp && !isAdmin()) secondsLeft = Math.max(0, Math.round((timerEndTimestamp - now) / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  countdownElement.textContent = `${displayMinutes}:${displaySeconds}`;
  if (isAdmin()) {
    clockRef.child('time').set(`${displayMinutes}:${displaySeconds}`);
    clockRef.child('timeLeft').set(secondsLeft);
  }
  if (secondsLeft <= 30) {
    countdownElement.classList.add('warning');
    if (secondsLeft > 0 && secondsLeft <= 30 && secondsLeft % 10 === 0) pipSound.play();
    else if (secondsLeft === 0) {
      for (let i = 0; i < 3; i++) setTimeout(() => { pipSound.play(); }, i * 200);
      countdownElement.classList.add('paused');
    }
  } else countdownElement.classList.remove('warning');
}
function startTimer() {
  countdownElement.classList.remove('paused');
  if (!timer) {
    db.ref('formEnabled').set(true);
    clockRef.child('running').set(true);
    timerEndTimestamp = Date.now() + timeLeft * 1000;
    clockRef.child('endTimestamp').set(timerEndTimestamp);
    timer = setInterval(() => {
      const now = Date.now();
      timeLeft = Math.max(0, Math.round((timerEndTimestamp - now) / 1000));
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timer);
        timer = null;
        db.ref('formEnabled').set(false);
        clockRef.child('running').set(false);
        clockRef.child('timeLeft').set(300);
      }
    }, 1000);
  }
}
function stopTimer() {
  countdownElement.classList.add('paused');
  if (timer) {
    clearInterval(timer);
    timer = null;
    db.ref('formEnabled').set(false);
    clockRef.child('running').set(false);
  }
}
function resetTimer() {
  countdownElement.classList.add('paused');
  clockRef.child('running').set(false);
  stopTimer();
  timeLeft = 300;
  clockRef.child('timeLeft').set(timeLeft);
  clockRef.child('endTimestamp').set(null);
  updateTimerDisplay();
  countdownElement.classList.remove('warning');
}
if (startBtn) startBtn.addEventListener('click', startTimer);
if (stopBtn) stopBtn.addEventListener('click', stopTimer);
if (resetBtn) resetBtn.addEventListener('click', resetTimer);
clockRef.on('value', (snapshot) => {
  const savedData = snapshot.val();
  if (savedData && savedData.timeLeft !== undefined) {
    timeLeft = savedData.timeLeft;
    timerEndTimestamp = savedData.endTimestamp || null;
    updateTimerDisplay();
    if (isAdmin()) {
      if (savedData.running && !timer) {
        timer = setInterval(() => {
          const now = Date.now();
          timeLeft = Math.max(0, Math.round((timerEndTimestamp - now) / 1000));
          updateTimerDisplay();
          if (timeLeft <= 0) {
            clearInterval(timer);
            timer = null;
            db.ref('formEnabled').set(false);
            clockRef.child('running').set(false);
            clockRef.child('timeLeft').set(300);
          }
        }, 1000);
      } else if (!savedData.running && timer) {
        clearInterval(timer);
        timer = null;
      }
    } else {
      if (timer) { clearInterval(timer); timer = null; }
    }
  } else updateTimerDisplay();
});
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


// --- INICIALITZACIÓ ---
document.addEventListener('DOMContentLoaded', () => {
  handleLogin();
  loadRoundsHistory();
});
