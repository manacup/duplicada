import { roundsCollectionRef } from './firebase.js';
import { displayWord } from './utilitats.js';
import { fillFormDataFromRoundAndPlayer } from "./formulariRespostes.js";
const resultatsDiv = document.getElementById('resultats');
const rondaDisplay = document.getElementById('roundDisplay');


let currentRoundId = null;

// Escolta canvis a la ronda actual i mostra resultats
function showResultats(roundId) {
    currentRoundId = roundId;
    roundsCollectionRef.doc(roundId).onSnapshot((doc) => {
        const round = doc.data();
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
        console.log("hi ha masterPlay")
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
        //ordena per punts descentents
        const resultats = Object.entries(round.results)
       
        const sortedResults = resultats.sort((a, b) => {
            const scoreA = a[1].score || 0;
            const scoreB = b[1].score || 0;
            return scoreB - scoreA;
        });
        //Si Jugada mestra existeix, posa'l al primer
        const masterPlay = sortedResults.find(([player]) => player.toLowerCase() === 'jugada mestra');
        if (masterPlay) {
            masterPlay[1].table = '';
            sortedResults.unshift(sortedResults.splice(sortedResults.indexOf(masterPlay), 1)[0]);
        }
       

        const table = document.createElement('table');
        table.className = 'table';            
        table.classList.add('table-hover');
        table.innerHTML = '<thead><tr><th>Taula</th><th>Jugador</th><th>Coord.</th><th>Paraula</th><th>Punts</th></tr></thead>';

        sortedResults.forEach(([player, data]) => {
            const tableDisplay = data.table || '';
            const coordinatesDisplay = data.coordinates || '';
            const wordDisplay = data.word ? displayWord(data.word,data.scraps) : '';
            const scoreDisplay = data.score !== undefined ? data.score : '';
            table.innerHTML += `<tr data-coords="${coordinatesDisplay}" data-word="${data.word}" data-scraps="${data.scraps}"  data-player="${player}"><td>${tableDisplay}</td><td>${player}</td><td>${coordinatesDisplay}</td><td>${wordDisplay}</td><td>${scoreDisplay}</td></tr>`;
        });
        resultatsDiv.appendChild(table);
        // Afegir event listener per a cada fila
        const rows = table.querySelectorAll('tr');
        rows.forEach((row) => {
            row.addEventListener('click', () => {
                const coords = row.getAttribute('data-coords');
                const word = row.getAttribute('data-word');
                const scraps = row.getAttribute('data-scraps');
                const player = row.getAttribute('data-player');
                
                //setCoordinatesAndWord(coords, displayWord(word,scraps),scraps);
                document.getElementById('coords').value = coords;
                document.getElementById('coords').dispatchEvent(new Event('input')); // Trigger input event to update display
                document.getElementById('word').value = displayWord(word,scraps);   
                document.getElementById('scraps').value = scraps || '';
                document.getElementById('word').dispatchEvent(new Event('input')); // Trigger input event to update display
                // Omple el formulari amb les dades de la ronda i el jugador    
                //fillFormDataFromRoundAndPlayer(currentRoundId, player);
                //deixar la fila seleccionada activa fins que es faci clic a una altra
                rows.forEach((r) => r.classList.remove('table-active'));
                row.classList.add('table-active');

            });
        });
    
    // Si no hi ha respostes, mostra un missatge
    } else {
        resultatsDiv.innerHTML += '<p>No hi ha respostes de jugadors per aquesta ronda.</p>';
    }
}


export { showResultats };