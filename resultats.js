import { historyRef } from './firebase.js';
import { displayWord } from './utilitats.js';

const resultatsDiv = document.getElementById('resultats');
const rondaDisplay = document.getElementById('roundDisplay');

let currentRoundId = null;

// Escolta canvis a la ronda actual i mostra resultats
function showResultats(roundId) {
    currentRoundId = roundId;
    historyRef.child(roundId).on('value', (snapshot) => {
        const round = snapshot.val();
        renderResultats(round);
    });
}

function renderResultats(round) {
    if (!resultatsDiv) return;
    resultatsDiv.innerHTML = '';

    if (!round) {
        resultatsDiv.innerHTML = '<p>No hi ha dades per aquesta ronda.</p>';
        return;
    }

    // Mostra jugada mestra si existeix
    if (round.masterPlay) {
        const master = round.masterPlay;
        const masterDiv = document.createElement('div');
        masterDiv.className = 'master-play-result';
        masterDiv.innerHTML = `
            <h4>Jugada mestra</h4>
            <p>
                <strong>Coords:</strong> ${master.coords || ''} <br>
                <strong>Paraula:</strong> ${master.word ? displayWord(master.word) : ''} <br>
                <strong>Direcció:</strong> ${master.direction || ''} <br>
                <strong>Punts:</strong> ${master.score ?? ''}
            </p>
        `;
        resultatsDiv.appendChild(masterDiv);
    }

    // Mostra respostes dels jugadors si existeixen
    if (round.results) {
        const table = document.createElement('table');
        table.className = 'table';
        table.innerHTML = '<thead><tr><th>Jugador</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>';
        Object.entries(round.results).forEach(([player, data]) => {
            const coordinatesDisplay = data.coordinates || '';
            const wordDisplay = data.word ? displayWord(data.word) : '';
            const scoreDisplay = data.score !== undefined ? data.score : '';
            table.innerHTML += `<tr><td>${player}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td><td>${scoreDisplay}</td></tr>`;
        });
        resultatsDiv.appendChild(table);
    } else {
        resultatsDiv.innerHTML += '<p>No hi ha respostes de jugadors per aquesta ronda.</p>';
    }
}

// Si vols mostrar resultats de la ronda actual quan canviï:
/* if (rondaDisplay) {
    const observer = new MutationObserver(() => {
        const match = rondaDisplay.textContent.match(/Ronda (\d+)/);
        if (match) showResultats(match[1]);
    });
    observer.observe(rondaDisplay, { childList: true });
} */

export { showResultats };