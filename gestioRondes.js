import { gameInfoRef, historyRef } from './firebase.js';
import { createEmptyBoard, normalizeWordInput, displayWord,tileDistribution } from './utilitats.js';
import { showResultats } from './resultats.js';

// Elements UI
const novaRondaBtn = document.getElementById('novaRondaBtn');
const tancaRondaBtn = document.getElementById('tancaRondaBtn');
const rondaDisplay = document.getElementById('roundDisplay');
const randomRackBtn = document.getElementById('randomRackBtn');
const editRackInput = document.getElementById('editRackInput');
const updateRackBtn = document.getElementById('updateRackBtn');
const wordInput = document.getElementById("word");
const coordsInput = document.getElementById("coords");
const playerInput = document.getElementById("player");

const actualPlayer = playerInput ? playerInput.value : null;

// Estat local
let roundsList = [];
let currentRoundIndex = -1;

// Carrega l'historial de rondes
function loadRoundsHistory() {
    historyRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        roundsList = Object.keys(data).sort((a, b) => Number(a) - Number(b));
        if (roundsList.length === 0) {
            addNewRound();
        } else {
            currentRoundIndex = roundsList.length -1 ;
            showRound(currentRoundIndex);
        }
    });
}

// Mostra una ronda específica
function showRound(idx) {
    if (idx < 0 || idx >= roundsList.length) return;
    currentRoundIndex = idx;
    const roundId = roundsList[idx];
    historyRef.child(roundId).once('value', (snapshot) => {
        const round = snapshot.val();
        //console.log('Dades de la ronda carregades:', round);
        if (!round.results) {
            round.results[actualPlayer]= { word: '', coordinates: '', score: 0, usedtiles: [] };
        }
        if (round.results[actualPlayer]) {
            console.log('Jugador actual:', round.results[actualPlayer]);
        }
        if (rondaDisplay) rondaDisplay.textContent = `Ronda ${roundId}`;
        if (editRackInput) editRackInput.value = displayWord(round?.rack || ''); // Use displayWord to format the rack
        //mostra la jugada mestra als inputs de la seccio de jugada mestra tenint en compte que el jugador actual es el que ha de fer la jugada mestra

        if (playerInput) playerInput.value = actualPlayer;
        if (tancaRondaBtn) tancaRondaBtn.style.display = round?.closed ? 'none' : 'block';
        if (novaRondaBtn) novaRondaBtn.style.display = round?.closed ? 'block' : 'none';
        if (wordInput) wordInput.value = displayWord(round.results[actualPlayer]?.word || '');
        if (coordsInput) coordsInput.value = round.results[actualPlayer]?.coordinates || '';
        coordsInput.dispatchEvent(new Event("input")); // Perquè es detecti el canvi i s'actualitzi la direcció
        

        if (round && round.board) {
            console.log('Dades del tauler carregades:', round.board);
            //gameInfoRef.child('currentBoard').set(round.board); // Carrega el tauler desat
            const boardElement = document.getElementById('board');
            if (boardElement) {
                console.log('Renderitzant el tauler...');
                boardElement.innerHTML = '';
                round.board.forEach(row => {
                    const rowElement = document.createElement('div');
                    rowElement.className = 'board-row';
                    row.forEach(cell => {
                        const cellElement = document.createElement('div');
                        cellElement.className = 'board-cell';
                        cellElement.textContent = cell || '';
                        rowElement.appendChild(cellElement);
                    });
                    boardElement.appendChild(rowElement);
                });
            } else {
                console.error('Element del tauler no trobat!');
            }
        }
       
        showResultats(roundId);
    });
}

// Actualitza les respostes de la ronda actual
function updateCurrentRoundResponses(roundId) {
    const ref = historyRef.child(`${roundId}/responses`);
    ref.on('value', (snapshot) => {
        const roundData = snapshot.val();
        const responsesAccordion = document.getElementById('responsesAccordion');
        responsesAccordion.innerHTML = `<h2>Respostes ronda ${roundId}</h2>`;
        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = '<thead><tr><th>Nom</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>';
        if (roundData) {
            Object.entries(roundData).forEach(([playerName, playerData]) => {
                const coordinatesDisplay = playerData.coordinates || '';
                const wordDisplay = playerData.word || '';
                const scoreDisplay = playerData.score !== undefined ? playerData.score : '';
                table.innerHTML += `<tr><td>${playerName}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td><td>${scoreDisplay}</td></tr>`;
            });
        } else {
            table.innerHTML += '<tr><td colspan="4">No hi ha respostes per a aquesta ronda.</td></tr>';
        }
        responsesAccordion.appendChild(table);
    });
}

// Navegació entre rondes
const prevRoundBtn = document.getElementById('prevRoundBtn');
const nextRoundBtn = document.getElementById('nextRoundBtn');
if (prevRoundBtn) {
    prevRoundBtn.addEventListener('click', () => {
        if (currentRoundIndex > 0) showRound(currentRoundIndex - 1);
    });
}
if (nextRoundBtn) {
    nextRoundBtn.addEventListener('click', () => {
        if (currentRoundIndex < roundsList.length - 1) showRound(currentRoundIndex + 1);
    });
}

// Afegir una nova ronda
function addNewRound() {
    const newRoundId = roundsList.length > 0 ? String(Number(roundsList[roundsList.length - 1]) + 1) : '1';
    const prevBoard = roundsList.length > 0 ? createEmptyBoard(15) : createEmptyBoard(15);
    const newRound = {
        rack: '',
        board: prevBoard,
        masterPlay: null,
        closed: false
    };
    historyRef.child(newRoundId).set(newRound).then(() => {
        roundsList.push(newRoundId);
        showRound(roundsList.length - 1);
    });
}

// Funció per calcular les fitxes restants al sac
function calculateRemainingTiles() {
    const usedTiles = {};

    // Recorre totes les rondes tancades i suma les fitxes usades
    roundsList.forEach((roundId) => {
        historyRef.child(roundId).once('value', (snapshot) => {
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
randomRackBtn.addEventListener('click', () => {
    const selectedTiles = selectRandomTiles(7); // Selecciona 7 fitxes
    editRackInput.value = displayWord(selectedTiles.join('')); // Mostra les fitxes seleccionades
});
// Exemple d'ús: Seleccionar fitxes quan s'obre una nova ronda
function openNewRoundWithRandomTiles() {
    const newRack = selectRandomTiles(7).join(''); // Selecciona 7 fitxes
    if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
        const roundId = roundsList[currentRoundIndex];
        historyRef.child(`${roundId}/rack`).set(newRack).then(() => {
            console.log(`Faristol inicial assignat per la ronda ${roundId}: ${newRack}`);
        });
    } else {
        console.error('No hi ha cap ronda actual per assignar el faristol inicial.');
    }
}

// Carrega l'historial de rondes al carregar la pàgina
document.addEventListener('DOMContentLoaded', loadRoundsHistory);

// Actualitza el faristol manualment i desa a la base de dades
// Normalize the rack before saving to the database
if (updateRackBtn) {
    updateRackBtn.addEventListener('click', () => {
        //demana confirmació indicant que s'esborraran els resultats de la ronda actual
        if (!confirm('Esteu segur que voleu actualitzar el faristol? Tots els resultats de la ronda actual s\'esborraran.')) {
            return;
        }
        
        const newRack = normalizeWordInput(editRackInput.value.trim().toUpperCase()); // Normalize the rack using normalizeWordInput
        if (currentRoundIndex >= 0 && currentRoundIndex < roundsList.length) {
            const roundId = roundsList[currentRoundIndex];
            historyRef.child(`${roundId}/rack`).set(newRack).then(() => {
                console.log(`Faristol actualitzat per la ronda ${roundId}`);
            });
            //eliminar resultats de la ronda actual
            historyRef.child(`${roundId}/results`).remove().then(() => {
                console.log(`Resultats eliminats per la ronda ${roundId}`);
            });
            
        } else {
            console.error('No hi ha cap ronda actual per actualitzar el faristol.');
        }
    });
}

export { loadRoundsHistory, showRound, addNewRound };