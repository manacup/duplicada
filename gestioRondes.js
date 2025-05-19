import { gameInfoRef, historyRef, masterPlaysRef } from './firebase.js';
import { createEmptyBoard } from './utilitats.js';

// Elements UI
const novaRondaBtn = document.getElementById('novaRondaBtn');
const tancaRondaBtn = document.getElementById('tancaRondaBtn');
const rondaDisplay = document.getElementById('roundDisplay');
const editRackInput = document.getElementById('editRackInput');
const updateRackBtn = document.getElementById('updateRackBtn');

// Estat local
let roundsList = [];
let currentRoundIndex = -1;

// Carrega la llista de rondes i mostra la darrera
function loadRounds() {
    historyRef.once('value', (snapshot) => {
        const data = snapshot.val() || {};
        roundsList = Object.keys(data).sort((a, b) => Number(a) - Number(b));
        if (roundsList.length === 0) {
            addNewRound();
        } else {
            showRound(roundsList.length - 1);
        }
    });
}

// Mostra una ronda concreta
function showRound(idx) {
    if (idx < 0 || idx >= roundsList.length) return;
    currentRoundIndex = idx;
    const roundId = roundsList[idx];
    historyRef.child(roundId).once('value', (snapshot) => {
        const round = snapshot.val();
        if (rondaDisplay) rondaDisplay.textContent = `Ronda ${roundId}`;
        if (editRackInput) editRackInput.value = round?.rack || '';
        // Actualitza el tauler i el rack a la base de dades
        if (round && round.board) gameInfoRef.child('currentBoard').set(round.board);
        if (round && round.rack) gameInfoRef.child('currentRack').set(round.rack);
        // Si hi ha jugada mestra, escriu-la al formulari de respostes (exemple: via base de dades)
        if (round && round.masterPlay) {
            gameInfoRef.child('masterPlay').set(round.masterPlay);
        } else {
            gameInfoRef.child('masterPlay').remove();
        }
    });
}

// Afegeix una nova ronda
function addNewRound() {
    const newRoundId = roundsList.length > 0 ? String(Number(roundsList[roundsList.length - 1]) + 1) : '1';
    // Llegeix el tauler i el rack de la ronda anterior (o crea'ls buits)
    let prevBoard = createEmptyBoard(15);
    let prevRack = '';
    if (roundsList.length > 0) {
        const lastRoundId = roundsList[roundsList.length - 1];
        historyRef.child(lastRoundId).once('value', snap => {
            const prev = snap.val();
            if (prev && prev.board) prevBoard = prev.board;
            // El rack d'entrada és el faristol restant (currentRack)
            gameInfoRef.child('currentRack').once('value', rackSnap => {
                prevRack = rackSnap.val() || '';
                const newRound = {
                    rack: prevRack,
                    board: prevBoard,
                    masterPlay: null,
                    closed: false
                };
                historyRef.child(newRoundId).set(newRound).then(() => {
                    roundsList.push(newRoundId);
                    showRound(roundsList.length - 1);
                });
            });
        });
    } else {
        // Primera ronda: tauler buit i rack buit
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
}

// Tanca la ronda actual: desa el tauler i el faristol restant
async function closeCurrentRound() {
    if (currentRoundIndex < 0) return;
    const roundId = roundsList[currentRoundIndex];
    // Llegeix el tauler i el rack actuals
    const [boardSnap, rackSnap] = await Promise.all([
        gameInfoRef.child('currentBoard').once('value'),
        gameInfoRef.child('currentRack').once('value')
    ]);
    const board = boardSnap.val();
    const rack = rackSnap.val() || '';
    // Desa el tauler i marca la ronda com a tancada
    await historyRef.child(roundId).update({
        board: board,
        closed: true
    });
    // Desa el faristol restant amb un altre nom si vols (ex: rackFinal)
    await historyRef.child(roundId).update({
        rackFinal: rack
    });
}

// Botons UI
if (novaRondaBtn) novaRondaBtn.addEventListener('click', addNewRound);
if (tancaRondaBtn) tancaRondaBtn.addEventListener('click', closeCurrentRound);
if (updateRackBtn) {
    updateRackBtn.addEventListener('click', () => {
        const rack = (editRackInput.value || '').toUpperCase();
        if (currentRoundIndex >= 0 && roundsList.length > 0) {
            const roundId = roundsList[currentRoundIndex];
            historyRef.child(roundId).update({ rack });
            gameInfoRef.child('currentRack').set(rack);
        }
    });
}

// Carrega rondes al carregar la pàgina
document.addEventListener('DOMContentLoaded', loadRounds);

export { loadRounds, showRound, addNewRound, closeCurrentRound };